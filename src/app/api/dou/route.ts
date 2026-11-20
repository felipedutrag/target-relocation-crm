import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const sp = req.nextUrl.searchParams;
    const search = (sp.get("search") || "").trim();
    const minScore = sp.get("min_score") ? Number(sp.get("min_score")) : null;
    const stageId = sp.get("stage_id") ? Number(sp.get("stage_id")) : null;
    const rnFilter = (sp.get("rn") || "").trim();
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(60, Math.max(10, Number(sp.get("limit") || 24)));

    const [statsRes, stagesRes] = await Promise.all([
      supabase.rpc("get_dou_radar_stats"),
      supabase.from("stages").select("id, name, order_nr").eq("pipeline_id", 2).order("order_nr", { ascending: true }),
    ]);

    let extraDealIds: number[] = [];
    if (search) {
      const { data: noteMatches } = await supabase
        .from("notes")
        .select("deal_id")
        .ilike("content", `%${search}%`)
        .not("deal_id", "is", null)
        .limit(40);
      extraDealIds = Array.from(
        new Set((noteMatches || []).map((n) => Number(n.deal_id)).filter((x) => !Number.isNaN(x)))
      );
    }

    let query = supabase
      .from("deals")
      .select(
        "id, title, stage_id, stage_name, status, owner_name, org_id, org_name, person_id, person_name, cnpj, score, segment, website, expat_count, dou_act_type, dou_process, notes_count, activities_count, custom_email_tag, last_email_sent, update_time, add_time",
        { count: "exact" }
      )
      .or("is_dou.eq.1,pipeline_id.eq.2");

    if (minScore !== null && !Number.isNaN(minScore)) {
      query = query.gte("score", minScore);
    }
    if (stageId) {
      query = query.eq("stage_id", stageId);
    }
    if (rnFilter && rnFilter !== "all") {
      query = query.ilike("dou_act_type", `%${rnFilter}%`);
    }
    if (search) {
      const s = search.replace(/[,()]/g, " ");
      const baseOr = [`title.ilike.%${s}%`, `org_name.ilike.%${s}%`, `cnpj.ilike.%${s}%`, `dou_process.ilike.%${s}%`];
      if (extraDealIds.length > 0) {
        baseOr.push(`id.in.(${extraDealIds.join(",")})`);
      }
      query = query.or(baseOr.join(","));
    }

    const offset = (page - 1) * limit;
    const { data: deals, count, error } = await query
      .order("score", { ascending: false, nullsFirst: false })
      .order("update_time", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const dealList = deals || [];
    const dealIds = dealList.map((d) => Number(d.id));
    const notesByDeal = new Map<number, Array<Record<string, unknown>>>();

    if (dealIds.length > 0) {
      const { data: relatedNotes } = await supabase
        .from("notes")
        .select("id, deal_id, note_category, parsed_meta_json, add_time")
        .in("deal_id", dealIds)
        .in("note_category", ["dou_authorization", "enrichment_score", "email_sequence", "call_script"])
        .order("add_time", { ascending: false });

      for (const n of relatedNotes || []) {
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

    const enriched = dealList.map((d) => {
      const list = notesByDeal.get(Number(d.id)) || [];
      const douNote = list.find((x) => x.category === "dou_authorization");
      const rfNote = list.find((x) => x.category === "enrichment_score");
      return {
        ...d,
        dou_meta: douNote?.meta || null,
        rf_meta: rfNote?.meta || null,
        has_email_sequence: list.some((x) => x.category === "email_sequence"),
        has_call_script: list.some((x) => x.category === "call_script"),
      };
    });

    const total = count || 0;
    return NextResponse.json({
      stats: statsRes.data || { total_dou: 0, qualified_count: 0, high_score_count: 0, total_expats: 0 },
      stages: stagesRes.data || [],
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      items: enriched,
    });
  } catch (error) {
    console.error("GET /api/dou error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
