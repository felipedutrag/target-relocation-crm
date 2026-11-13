import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureDatabaseSeeded } from "@/lib/importer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const db = getDb();
    const sp = req.nextUrl.searchParams;
    const doneParam = sp.get("done") || "all";
    const type = sp.get("type") || "all";
    const period = sp.get("period") || "all";
    const owner = sp.get("owner") || "all";
    const search = (sp.get("search") || "").trim();
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Math.max(10, Number(sp.get("limit") || 40)));

    const where: string[] = [];
    const params: (string | number)[] = [];

    if (doneParam === "0" || doneParam === "pending") {
      where.push("done = 0");
    } else if (doneParam === "1" || doneParam === "completed") {
      where.push("done = 1");
    }
    if (type && type !== "all") {
      where.push("type = ?");
      params.push(type);
    }
    if (period && period !== "all") {
      where.push("cadence_period = ?");
      params.push(period);
    }
    if (owner && owner !== "all") {
      where.push("owner_name = ?");
      params.push(owner);
    }
    if (search) {
      where.push("(subject LIKE ? OR deal_title LIKE ? OR person_name LIKE ? OR org_name LIKE ? OR note LIKE ?)");
      const q = `%${search}%`;
      params.push(q, q, q, q, q);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const total = (db.prepare(`SELECT COUNT(*) as c FROM activities ${whereSql}`).get(...params) as { c: number }).c;
    const offset = (page - 1) * limit;

    const rows = db
      .prepare(
        `SELECT * FROM activities ${whereSql}
         ORDER BY done ASC, due_date DESC, id DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    const summary = db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN done = 0 THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN is_auto_cadence = 1 THEN 1 ELSE 0 END) as auto_cadence,
          SUM(CASE WHEN cadence_period = 'MANHÃ' THEN 1 ELSE 0 END) as manha,
          SUM(CASE WHEN cadence_period = 'TARDE' THEN 1 ELSE 0 END) as tarde
        FROM activities`
      )
      .get();

    return NextResponse.json({
      summary,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      activities: rows,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const db = getDb();
    const body = (await req.json()) as { id: number; done: boolean };
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const doneVal = body.done ? 1 : 0;

    db.prepare(
      `UPDATE activities
       SET done = ?, marked_as_done_time = CASE WHEN ? = 1 THEN ? ELSE '' END, update_time = ?
       WHERE id = ?`
    ).run(doneVal, doneVal, now, now, Number(body.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const db = getDb();
    const body = (await req.json()) as Record<string, unknown>;
    const subject = String(body.subject || "").trim();
    if (!subject) return NextResponse.json({ error: "Assunto obrigatório" }, { status: 400 });

    const maxId = (db.prepare("SELECT COALESCE(MAX(id), 10000) as m FROM activities").get() as { m: number }).m;
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const typeMap: Record<string, string> = {
      call: "Chamada",
      task: "Tarefa",
      meeting: "Reunião",
      deadline: "Prazo",
      email: "E-mail",
      lunch: "Almoço",
    };
    const typeKey = String(body.type || "task");

    db.prepare(
      `INSERT INTO activities (id, subject, type, type_name, done, due_date, due_time, deal_id, deal_title, person_name, org_name, owner_name, note, cadence_period, is_auto_cadence, add_time, update_time)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
    ).run(
      maxId + 1,
      subject,
      typeKey,
      typeMap[typeKey] || "Tarefa",
      String(body.due_date || now.slice(0, 10)),
      String(body.due_time || "09:00"),
      body.deal_id ? Number(body.deal_id) : null,
      body.deal_title ? String(body.deal_title) : null,
      body.person_name ? String(body.person_name) : null,
      body.org_name ? String(body.org_name) : null,
      String(body.owner_name || "Klaus"),
      body.note ? String(body.note) : null,
      String(body.cadence_period || "GERAL"),
      now,
      now
    );

    const created = db.prepare("SELECT * FROM activities WHERE id = ?").get(maxId + 1);
    return NextResponse.json({ success: true, activity: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
