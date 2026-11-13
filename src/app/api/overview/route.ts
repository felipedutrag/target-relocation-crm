import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureDatabaseSeeded } from "@/lib/importer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseSeeded();
    const db = getDb();

    const dealTotals = db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
          SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_count,
          SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_count,
          COALESCE(SUM(CASE WHEN status = 'open' THEN value ELSE 0 END), 0) as open_value,
          COALESCE(SUM(CASE WHEN status = 'won' THEN value ELSE 0 END), 0) as won_value,
          COALESCE(SUM(value), 0) as total_value,
          SUM(CASE WHEN is_dou = 1 THEN 1 ELSE 0 END) as dou_count,
          SUM(CASE WHEN score >= 40 THEN 1 ELSE 0 END) as qualified_dou_count
        FROM deals`
      )
      .get() as Record<string, number>;

    const orgCount = (db.prepare("SELECT COUNT(*) as c FROM organizations").get() as { c: number }).c;
    const personCount = (db.prepare("SELECT COUNT(*) as c FROM persons").get() as { c: number }).c;
    const noteCount = (db.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number }).c;
    const activityTotals = db
      .prepare(
        `SELECT COUNT(*) as total,
          SUM(CASE WHEN done = 0 THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) as completed
        FROM activities`
      )
      .get() as Record<string, number>;
    const fileTotals = db
      .prepare(
        `SELECT COUNT(*) as total, SUM(CASE WHEN has_local_file = 1 THEN 1 ELSE 0 END) as local_count FROM files`
      )
      .get() as Record<string, number>;
    const auditCount = (db.prepare("SELECT COUNT(*) as c FROM imported_files_audit").get() as { c: number }).c;
    const proposalTotals = db
      .prepare(`SELECT COUNT(*) as total, COALESCE(SUM(total_value), 0) as sum_value FROM proposals`)
      .get() as Record<string, number>;

    const pipelines = db.prepare("SELECT * FROM pipelines ORDER BY order_nr ASC").all();
    const stages = db
      .prepare(
        `SELECT s.*,
          COUNT(d.id) as deal_count,
          SUM(CASE WHEN d.status = 'open' THEN 1 ELSE 0 END) as open_count,
          SUM(CASE WHEN d.status = 'won' THEN 1 ELSE 0 END) as won_count,
          SUM(CASE WHEN d.status = 'lost' THEN 1 ELSE 0 END) as lost_count,
          COALESCE(SUM(d.value), 0) as total_value
        FROM stages s
        LEFT JOIN deals d ON d.stage_id = s.id
        GROUP BY s.id
        ORDER BY s.pipeline_id ASC, s.order_nr ASC`
      )
      .all();

    const byLabel = db
      .prepare(
        `SELECT COALESCE(NULLIF(label_name, ''), 'Sem etiqueta') as label_name,
          MAX(label_color) as label_color,
          COUNT(*) as count
        FROM deals
        GROUP BY COALESCE(NULLIF(label_name, ''), 'Sem etiqueta')
        ORDER BY count DESC
        LIMIT 12`
      )
      .all();

    const byLostReason = db
      .prepare(
        `SELECT lost_reason as reason, COUNT(*) as count
        FROM deals
        WHERE lost_reason IS NOT NULL AND lost_reason != ''
        GROUP BY lost_reason
        ORDER BY count DESC
        LIMIT 10`
      )
      .all();

    const byOwner = db
      .prepare(
        `SELECT COALESCE(NULLIF(owner_name, ''), 'Não atribuído') as owner_name,
          COUNT(*) as deals_count,
          SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
          SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_count,
          COALESCE(SUM(value), 0) as total_value
        FROM deals
        GROUP BY owner_name
        ORDER BY deals_count DESC`
      )
      .all();

    const topValuedDeals = db
      .prepare(
        `SELECT id, title, value, currency, status, stage_name, pipeline_name, owner_name, org_name, person_name, update_time
        FROM deals
        WHERE value > 0
        ORDER BY value DESC
        LIMIT 15`
      )
      .all();

    const recentNotes = db
      .prepare(
        `SELECT id, deal_id, deal_title, note_category, user_name, add_time, substr(content, 1, 220) as preview
        FROM notes
        WHERE note_category IN ('dou_authorization', 'enrichment_score', 'call_script', 'email_sequence')
        ORDER BY add_time DESC
        LIMIT 8`
      )
      .all();

    const noteCategories = db
      .prepare(
        `SELECT note_category as category, COUNT(*) as count
        FROM notes
        GROUP BY note_category
        ORDER BY count DESC`
      )
      .all();

    const pendingActivities = db
      .prepare(
        `SELECT id, subject, type, type_name, due_date, cadence_period, deal_id, deal_title, person_name, owner_name
        FROM activities
        WHERE done = 0
        ORDER BY due_date ASC, id DESC
        LIMIT 8`
      )
      .all();

    const lastSyncRow = db.prepare("SELECT value FROM app_meta WHERE key = 'last_sync_at'").get() as
      | { value: string }
      | undefined;

    return NextResponse.json({
      kpis: {
        deals: dealTotals,
        organizations: orgCount,
        persons: personCount,
        notes: noteCount,
        activities: activityTotals,
        files: fileTotals,
        auditedFiles: auditCount,
        proposals: proposalTotals,
      },
      pipelines,
      stages,
      byLabel,
      byLostReason,
      byOwner,
      topValuedDeals,
      noteCategories,
      recentNotes,
      pendingActivities,
      lastSyncAt: lastSyncRow?.value || null,
    });
  } catch (error) {
    console.error("GET /api/overview error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
