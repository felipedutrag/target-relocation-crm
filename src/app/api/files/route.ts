import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureDatabaseSeeded } from "@/lib/importer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const db = getDb();
    const sp = req.nextUrl.searchParams;
    const onlyLocal = sp.get("only_local") === "true";
    const search = (sp.get("search") || "").trim();
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Math.max(10, Number(sp.get("limit") || 50)));

    const where: string[] = [];
    const params: (string | number)[] = [];

    if (onlyLocal) {
      where.push("has_local_file = 1");
    }
    if (search) {
      where.push("(name LIKE ? OR file_name LIKE ? OR deal_name LIKE ? OR org_name LIKE ? OR person_name LIKE ?)");
      const q = `%${search}%`;
      params.push(q, q, q, q, q);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const total = (db.prepare(`SELECT COUNT(*) as c FROM files ${whereSql}`).get(...params) as { c: number }).c;
    const offset = (page - 1) * limit;

    const files = db
      .prepare(
        `SELECT * FROM files ${whereSql}
         ORDER BY has_local_file DESC, id DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    return NextResponse.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      files,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
