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
    const minScore = sp.get("min_score") ? Number(sp.get("min_score")) : null;
    const stageId = sp.get("stage_id") ? Number(sp.get("stage_id")) : null;
    const rnFilter = (sp.get("rn") || "").trim();
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(60, Math.max(10, Number(sp.get("limit") || 24)));

    const where: string[] = ["(d.is_dou = 1 OR d.pipeline_id = 2)"];
    const params: (string | number)[] = [];

    if (minScore !== null && !Number.isNaN(minScore)) {
      where.push("COALESCE(d.score, 0) >= ?");
      params.push(minScore);
    }
    if (stageId) {
      where.push("d.stage_id = ?");
      params.push(stageId);
    }
    if (rnFilter && rnFilter !== "all") {
      where.push("d.dou_act_type LIKE ?");
      params.push(`%${rnFilter}%`);
    }
    if (search) {
      where.push(
        `(d.title LIKE ? OR d.org_name LIKE ? OR d.cnpj LIKE ? OR d.dou_process LIKE ? OR EXISTS (
          SELECT 1 FROM notes n WHERE n.deal_id = d.id AND n.content LIKE ?
        ))`
      );
      const q = `%${search}%`;
      params.push(q, q, q, q, q);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const stats = db
      .prepare(
        `SELECT
          COUNT(*) as total_dou,
          SUM(CASE WHEN COALESCE(d.score, 0) >= 40 THEN 1 ELSE 0 END) as qualified_count,
          SUM(CASE WHEN COALESCE(d.score, 0) >= 60 THEN 1 ELSE 0 END) as high_score_count,
          COALESCE(SUM(d.expat_count), 0) as total_expats
        FROM deals d
        WHERE (d.is_dou = 1 OR d.pipeline_id = 2)`
      )
      .get() as Record<string, number>;

    const stages = db
      .prepare("SELECT id, name, order_nr FROM stages WHERE pipeline_id = 2 ORDER BY order_nr ASC")
      .all();

    const totalRow = db.prepare(`SELECT COUNT(*) as total FROM deals d ${whereSql}`).get(...params) as { total: number };
    const offset = (page - 1) * limit;

    const deals = db
      .prepare(
        `SELECT d.id, d.title, d.stage_id, d.stage_name, d.status, d.owner_name,
          d.org_id, d.org_name, d.person_id, d.person_name,
          d.cnpj, d.score, d.segment, d.website, d.expat_count, d.dou_act_type, d.dou_process,
          d.notes_count, d.activities_count, d.custom_email_tag, d.last_email_sent, d.update_time, d.add_time
        FROM deals d
        ${whereSql}
        ORDER BY COALESCE(d.score, -1) DESC, d.update_time DESC
        LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as Array<Record<string, unknown>>;

    // Attach structured DOU & RF & AI notes for these deals
    const dealIds = deals.map((d) => Number(d.id));
    const notesByDeal = new Map<number, Array<Record<string, unknown>>>();

    if (dealIds.length > 0) {
      const placeholders = dealIds.map(() => "?").join(",");
      const relatedNotes = db
        .prepare(
          `SELECT id, deal_id, note_category, parsed_meta_json, add_time
           FROM notes
           WHERE deal_id IN (${placeholders})
             AND note_category IN ('dou_authorization', 'enrichment_score', 'email_sequence', 'call_script')
           ORDER BY add_time DESC`
        )
        .all(...dealIds) as Array<Record<string, unknown>>;

      for (const n of relatedNotes) {
        const did = Number(n.deal_id);
        if (!notesByDeal.has(did)) notesByDeal.set(did, []);
        notesByDeal.get(did)!.push({
          id: n.id,
          category: n.note_category,
          meta: n.parsed_meta_json ? JSON.parse(String(n.parsed_meta_json)) : {},
          add_time: n.add_time,
        });
      }
    }

    const enriched = deals.map((d) => {
      const list = notesByDeal.get(Number(d.id)) || [];
      const douNote = list.find((x) => x.category === "dou_authorization");
      const rfNote = list.find((x) => x.category === "enrichment_score");
      const hasEmailSeq = list.some((x) => x.category === "email_sequence");
      const hasCallScript = list.some((x) => x.category === "call_script");
      return {
        ...d,
        dou_meta: douNote?.meta || null,
        rf_meta: rfNote?.meta || null,
        has_email_sequence: hasEmailSeq,
        has_call_script: hasCallScript,
      };
    });

    return NextResponse.json({
      stats,
      stages,
      total: totalRow.total,
      page,
      limit,
      totalPages: Math.ceil(totalRow.total / limit),
      items: enriched,
    });
  } catch (error) {
    console.error("GET /api/dou error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
