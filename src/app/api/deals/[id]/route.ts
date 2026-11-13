import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureDatabaseSeeded } from "@/lib/importer";
import { parseNoteContent } from "@/lib/parsers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSeeded();
    const { id } = await context.params;
    const dealId = Number(id);
    if (Number.isNaN(dealId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const db = getDb();
    const deal = db.prepare("SELECT * FROM deals WHERE id = ?").get(dealId) as Record<string, unknown> | undefined;
    if (!deal) {
      return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });
    }

    const organization = deal.org_id
      ? db.prepare("SELECT * FROM organizations WHERE id = ?").get(Number(deal.org_id))
      : null;
    const person = deal.person_id
      ? db.prepare("SELECT * FROM persons WHERE id = ?").get(Number(deal.person_id))
      : null;

    const rawNotes = db
      .prepare(
        `SELECT * FROM notes
         WHERE deal_id = ?
         ORDER BY pinned_to_deal_flag DESC, add_time DESC`
      )
      .all(dealId) as Array<Record<string, unknown>>;

    const notes = rawNotes.map((n) => ({
      ...n,
      parsed_meta: n.parsed_meta_json ? JSON.parse(String(n.parsed_meta_json)) : null,
    }));

    const activities = db
      .prepare("SELECT * FROM activities WHERE deal_id = ? ORDER BY done ASC, due_date DESC, id DESC")
      .all(dealId);

    const files = db
      .prepare(
        `SELECT * FROM files
         WHERE deal_id = ? OR (? IS NOT NULL AND org_id = ?) OR (? IS NOT NULL AND person_id = ?)
         ORDER BY has_local_file DESC, add_time DESC`
      )
      .all(dealId, deal.org_id ?? null, deal.org_id ?? null, deal.person_id ?? null, deal.person_id ?? null);

    const flowEvents = db
      .prepare("SELECT * FROM deal_flow_events WHERE deal_id = ? ORDER BY timestamp DESC, id DESC LIMIT 100")
      .all(dealId);

    const proposals = db
      .prepare("SELECT * FROM proposals WHERE deal_id = ? ORDER BY created_at DESC")
      .all(dealId) as Array<Record<string, unknown>>;

    const stages = db
      .prepare("SELECT * FROM stages WHERE pipeline_id = ? ORDER BY order_nr ASC")
      .all(Number(deal.pipeline_id || 1));

    const mailThreads = deal.person_id
      ? db.prepare("SELECT * FROM mail_threads WHERE linked_person_id = ?").all(Number(deal.person_id))
      : [];

    return NextResponse.json({
      deal,
      organization,
      person,
      notes,
      activities,
      files,
      flowEvents,
      proposals: proposals.map((p) => ({
        ...p,
        items: p.items_json ? JSON.parse(String(p.items_json)) : [],
      })),
      stages,
      mailThreads,
    });
  } catch (error) {
    console.error("GET /api/deals/[id] error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSeeded();
    const { id } = await context.params;
    const dealId = Number(id);
    const db = getDb();
    const body = (await req.json()) as Record<string, unknown>;
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    const existing = db.prepare("SELECT * FROM deals WHERE id = ?").get(dealId) as Record<string, unknown> | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });
    }

    if (body.action === "add_note") {
      const content = String(body.content || "").trim();
      if (!content) return NextResponse.json({ error: "Conteúdo da nota vazio" }, { status: 400 });
      const maxId = (db.prepare("SELECT COALESCE(MAX(id), 20000) as m FROM notes").get() as { m: number }).m;
      const parsed = parseNoteContent(content);
      db.prepare(
        `INSERT INTO notes (id, deal_id, deal_title, person_id, person_name, org_id, org_name, user_id, user_name, content, note_category, parsed_meta_json, pinned_to_deal_flag, add_time, update_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, 24624701, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        maxId + 1,
        dealId,
        String(existing.title || ""),
        existing.person_id ? Number(existing.person_id) : null,
        existing.person_name ? String(existing.person_name) : null,
        existing.org_id ? Number(existing.org_id) : null,
        existing.org_name ? String(existing.org_name) : null,
        String(body.user_name || "Klaus"),
        parsed.cleanHtml,
        parsed.category,
        JSON.stringify(parsed.meta),
        body.pinned ? 1 : 0,
        now,
        now
      );
      db.prepare("UPDATE deals SET notes_count = notes_count + 1, update_time = ? WHERE id = ?").run(now, dealId);
      return NextResponse.json({ success: true });
    }

    if (body.action === "add_activity") {
      const subject = String(body.subject || "").trim();
      if (!subject) return NextResponse.json({ error: "Assunto obrigatório" }, { status: 400 });
      const maxId = (db.prepare("SELECT COALESCE(MAX(id), 10000) as m FROM activities").get() as { m: number }).m;
      db.prepare(
        `INSERT INTO activities (id, subject, type, type_name, done, due_date, due_time, deal_id, deal_title, person_id, person_name, org_id, org_name, user_id, owner_name, note, add_time, update_time)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, 24624701, ?, ?, ?, ?)`
      ).run(
        maxId + 1,
        subject,
        String(body.type || "task"),
        String(body.type_name || "Tarefa"),
        String(body.due_date || now.slice(0, 10)),
        String(body.due_time || "10:00"),
        dealId,
        String(existing.title || ""),
        existing.person_id ? Number(existing.person_id) : null,
        existing.person_name ? String(existing.person_name) : null,
        existing.org_id ? Number(existing.org_id) : null,
        existing.org_name ? String(existing.org_name) : null,
        String(body.owner_name || existing.owner_name || "Klaus"),
        body.note ? String(body.note) : null,
        now,
        now
      );
      db.prepare("UPDATE deals SET activities_count = activities_count + 1, undone_activities_count = undone_activities_count + 1, update_time = ? WHERE id = ?").run(now, dealId);
      return NextResponse.json({ success: true });
    }

    // Update deal fields
    const nextStageId = body.stage_id != null ? Number(body.stage_id) : Number(existing.stage_id);
    const stage = db.prepare("SELECT * FROM stages WHERE id = ?").get(nextStageId) as
      | { id: number; name: string; order_nr: number; pipeline_id: number; pipeline_name: string }
      | undefined;

    const nextStatus = body.status ? String(body.status) : String(existing.status);
    const nextValue = body.value != null ? Number(body.value) : Number(existing.value || 0);
    const nextOwner = body.owner_name ? String(body.owner_name) : String(existing.owner_name || "Klaus");
    const nextLostReason = body.lost_reason !== undefined ? (body.lost_reason ? String(body.lost_reason) : null) : (existing.lost_reason as string | null);

    db.prepare(
      `UPDATE deals
       SET stage_id = ?, stage_name = ?, stage_order_nr = ?, pipeline_id = ?, pipeline_name = ?,
           status = ?, value = ?, formatted_value = ?, owner_name = ?, lost_reason = ?,
           won_time = CASE WHEN ? = 'won' AND won_time IS NULL THEN ? ELSE won_time END,
           lost_time = CASE WHEN ? = 'lost' AND lost_time IS NULL THEN ? ELSE lost_time END,
           close_time = CASE WHEN ? IN ('won', 'lost') AND close_time IS NULL THEN ? ELSE close_time END,
           update_time = ?
       WHERE id = ?`
    ).run(
      stage?.id ?? nextStageId,
      stage?.name ?? String(existing.stage_name || ""),
      stage?.order_nr ?? Number(existing.stage_order_nr || 0),
      stage?.pipeline_id ?? Number(existing.pipeline_id || 1),
      stage?.pipeline_name ?? String(existing.pipeline_name || ""),
      nextStatus,
      nextValue,
      `R$ ${nextValue.toLocaleString("pt-BR")}`,
      nextOwner,
      nextLostReason,
      nextStatus,
      now,
      nextStatus,
      now,
      nextStatus,
      now,
      now,
      dealId
    );

    if (nextStageId !== Number(existing.stage_id) && stage) {
      db.prepare(
        `INSERT INTO deal_flow_events (deal_id, object_type, timestamp, user_id, field_key, field_name, old_value, new_value, old_label, new_label, change_source)
         VALUES (?, 'dealChange', ?, 24624701, 'stage_id', 'Etapa', ?, ?, ?, ?, 'crm-ui')`
      ).run(dealId, now, String(existing.stage_id), String(stage.id), String(existing.stage_name || ""), stage.name);
    }
    if (nextStatus !== String(existing.status)) {
      db.prepare(
        `INSERT INTO deal_flow_events (deal_id, object_type, timestamp, user_id, field_key, field_name, old_value, new_value, old_label, new_label, change_source)
         VALUES (?, 'dealChange', ?, 24624701, 'status', 'Status', ?, ?, ?, ?, 'crm-ui')`
      ).run(dealId, now, String(existing.status), nextStatus, String(existing.status), nextStatus);
    }

    const updated = db.prepare("SELECT * FROM deals WHERE id = ?").get(dealId);
    return NextResponse.json({ success: true, deal: updated });
  } catch (error) {
    console.error("PATCH /api/deals/[id] error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
