import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const WHATSAPP_DEBOUNCE_MS = 5_000;

// Use a path on the worker's Railway volume so restarts retain pending messages.
export function openWhatsAppQueue(path) {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS whatsapp_inbox (
      id INTEGER PRIMARY KEY,
      bot TEXT NOT NULL,
      channel TEXT NOT NULL,
      conversation TEXT NOT NULL,
      external_id TEXT NOT NULL,
      body TEXT NOT NULL,
      ready_at INTEGER NOT NULL,
      batch TEXT,
      UNIQUE (bot, channel, external_id)
    );
    CREATE TABLE IF NOT EXISTS whatsapp_batches (
      id TEXT PRIMARY KEY,
      bot TEXT NOT NULL,
      channel TEXT NOT NULL,
      conversation TEXT NOT NULL,
      next_attempt INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      lease TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
    );
    CREATE INDEX IF NOT EXISTS whatsapp_inbox_conversation
      ON whatsapp_inbox (bot, channel, conversation, batch, id);
  `);

  function transaction(run) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = run();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  return {
    enqueue({ bot, channel, conversation, externalId, body }, now = Date.now()) {
      return db.prepare(`
        INSERT INTO whatsapp_inbox (bot, channel, conversation, external_id, body, ready_at)
        VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (bot, channel, external_id) DO NOTHING
      `).run(bot, channel, conversation, externalId, body, now + WHATSAPP_DEBOUNCE_MS).changes === 1;
    },

    claim(now = Date.now()) {
      return transaction(() => {
        db.prepare(`
          UPDATE whatsapp_batches SET status = 'review', lease = NULL
          WHERE status = 'processing' AND next_attempt <= ?
        `).run(now);
        let batch = db.prepare(`
          SELECT id, bot, channel, conversation FROM whatsapp_batches
          WHERE status = 'pending' AND next_attempt <= ? ORDER BY next_attempt LIMIT 1
        `).get(now);
        if (!batch) {
          const conversation = db.prepare(`
            SELECT i.bot, i.channel, i.conversation
            FROM whatsapp_inbox i
            WHERE i.batch IS NULL AND NOT EXISTS (
              SELECT 1 FROM whatsapp_batches b
              WHERE b.bot = i.bot AND b.channel = i.channel
                AND b.conversation = i.conversation AND b.status <> 'done'
            )
            GROUP BY i.bot, i.channel, i.conversation
            HAVING MAX(i.ready_at) <= ? ORDER BY MIN(i.id) LIMIT 1
          `).get(now);
          if (!conversation) return null;
          batch = { ...conversation, id: randomUUID() };
          const { id, bot, channel, conversation: address } = batch;
          db.prepare(`
            INSERT INTO whatsapp_batches (id, bot, channel, conversation, next_attempt)
            VALUES (?, ?, ?, ?, ?)
          `).run(id, bot, channel, address, now);
          db.prepare(`
            UPDATE whatsapp_inbox SET batch = ?
            WHERE bot = ? AND channel = ? AND conversation = ? AND batch IS NULL
          `).run(id, bot, channel, address);
        }
        const lease = randomUUID();
        db.prepare(`
          UPDATE whatsapp_batches SET status = 'processing', lease = ?,
            attempts = attempts + 1, next_attempt = ? WHERE id = ?
        `).run(lease, now + 120_000, batch.id);
        const messages = db.prepare(`
          SELECT external_id AS externalId, body FROM whatsapp_inbox WHERE batch = ? ORDER BY id
        `).all(batch.id);
        return { ...batch, lease, messages };
      });
    },

    finish({ id, lease }, outcome, now = Date.now()) {
      if (!["done", "retry", "review"].includes(outcome)) throw new Error("Invalid outcome");
      // Retry only if the caller knows that no outbound message was accepted.
      return db.prepare(`
        UPDATE whatsapp_batches SET lease = NULL,
          status = CASE WHEN ? = 'retry' AND attempts < 5 THEN 'pending'
                        WHEN ? = 'retry' THEN 'review' ELSE ? END,
          next_attempt = ? + 5000 * (1 << MIN(attempts - 1, 4))
        WHERE id = ? AND lease = ? AND status = 'processing'
      `).run(outcome, outcome, outcome, now, id, lease).changes === 1;
    },

    close() {
      db.close();
    },
  };
}
