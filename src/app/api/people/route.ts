import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureDatabaseSeeded } from "@/lib/importer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const db = getDb();
    const sp = req.nextUrl.searchParams;
    const search = (sp.get("search") || "").trim();
    const label = sp.get("label") || "";
    const owner = sp.get("owner") || "";
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Math.max(10, Number(sp.get("limit") || 30)));

    const where: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      where.push("(name LIKE ? OR primary_email LIKE ? OR primary_phone LIKE ? OR org_name LIKE ?)");
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }
    if (label && label !== "all") {
      where.push("label_name LIKE ?");
      params.push(`%${label}%`);
    }
    if (owner && owner !== "all") {
      where.push("owner_name = ?");
      params.push(owner);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const total = (db.prepare(`SELECT COUNT(*) as c FROM persons ${whereSql}`).get(...params) as { c: number }).c;
    const offset = (page - 1) * limit;

    const rows = db
      .prepare(
        `SELECT * FROM persons ${whereSql}
         ORDER BY open_deals_count DESC, notes_count DESC, update_time DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    const labels = db
      .prepare(
        `SELECT COALESCE(NULLIF(label_name, ''), 'Sem etiqueta') as label_name, COUNT(*) as count
         FROM persons GROUP BY COALESCE(NULLIF(label_name, ''), 'Sem etiqueta') ORDER BY count DESC`
      )
      .all();

    return NextResponse.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      labels,
      people: rows,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const db = getDb();
    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    const maxId = (db.prepare("SELECT COALESCE(MAX(id), 6000) as m FROM persons").get() as { m: number }).m;
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    db.prepare(
      `INSERT INTO persons (id, name, primary_email, primary_phone, org_name, owner_name, label_name, add_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      maxId + 1,
      name,
      body.email ? String(body.email) : "",
      body.phone ? String(body.phone) : "",
      body.org_name ? String(body.org_name) : "",
      String(body.owner_name || "Klaus"),
      body.label_name ? String(body.label_name) : "",
      now,
      now
    );

    const created = db.prepare("SELECT * FROM persons WHERE id = ?").get(maxId + 1);
    return NextResponse.json({ success: true, person: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
