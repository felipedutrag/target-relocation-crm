import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { openWhatsAppQueue } from "./whatsapp-queue.mjs";

test("debounces and deduplicates per bot, with ordered retries after restart", () => {
  const directory = mkdtempSync(join(tmpdir(), "target-whatsapp-test-"));
  const path = join(directory, "queue.sqlite");
  let queue = openWhatsAppQueue(path);
  try {
    const send = (bot, externalId, now) => queue.enqueue({
      bot, channel: "test", conversation: "contact", externalId, body: externalId,
    }, now);
    assert.equal(send("aurea", "one", 0), true);
    assert.equal(send("aurea", "two", 1000), true);
    assert.equal(send("aurea", "one", 2000), false);
    assert.equal(send("anderley", "one", 0), true);
    assert.equal(queue.claim(4999), null);
    const anderley = queue.claim(5000);
    assert.equal(anderley.bot, "anderley");
    assert.equal(queue.finish(anderley, "done", 5000), true);
    assert.equal(queue.claim(5999), null);

    const first = queue.claim(6000);
    assert.deepEqual(first.messages.map(m => m.body), ["one", "two"]);
    assert.equal(queue.finish(first, "retry", 6100), true);
    send("aurea", "three", 6200);
    queue.close();
    queue = openWhatsAppQueue(path);
    assert.equal(queue.claim(11099), null);
    const retry = queue.claim(11100);
    assert.equal(retry.id, first.id);
    assert.equal(queue.finish(first, "done", 11100), false);
    assert.equal(queue.finish(retry, "done", 11100), true);
    assert.equal(queue.claim(11199), null);
    assert.deepEqual(queue.claim(11200).messages.map(m => m.body), ["three"]);
    assert.equal(queue.claim(131201), null);
    send("aurea", "four", 131202);
    assert.equal(queue.claim(136202), null);
  } finally {
    queue.close();
    rmSync(directory, { recursive: true });
  }
});
