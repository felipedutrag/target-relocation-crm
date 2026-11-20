import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceUser } from "@/lib/supabase/server";
import { parseNoteContent } from "@/lib/parsers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const { id } = await context.params;
    const dealId = Number(id);
    if (Number.isNaN(dealId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const { data: deal } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
    if (!deal) {
      return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });
    }

    const fileOrFilters = [`deal_id.eq.${dealId}`];
    if (deal.org_id) fileOrFilters.push(`org_id.eq.${deal.org_id}`);
    if (deal.person_id) fileOrFilters.push(`person_id.eq.${deal.person_id}`);

    const [orgRes, personRes, notesRes, actRes, filesRes, flowRes, propRes, stagesRes, mailRes] =
      await Promise.all([
        deal.org_id ? supabase.from("organizations").select("*").eq("id", Number(deal.org_id)).maybeSingle() : Promise.resolve({ data: null }),
        deal.person_id ? supabase.from("persons").select("*").eq("id", Number(deal.person_id)).maybeSingle() : Promise.resolve({ data: null }),
        supabase
          .from("notes")
          .select("*")
          .eq("deal_id", dealId)
          .order("pinned_to_deal_flag", { ascending: false })
          .order("add_time", { ascending: false }),
        supabase
          .from("activities")
          .select("*")
          .eq("deal_id", dealId)
          .order("done", { ascending: true })
          .order("due_date", { ascending: false })
          .order("id", { ascending: false }),
        supabase
          .from("files")
          .select("*")
          .or(fileOrFilters.join(","))
          .order("has_local_file", { ascending: false })
          .order("add_time", { ascending: false }),
        supabase
          .from("deal_flow_events")
          .select("*")
          .eq("deal_id", dealId)
          .order("timestamp", { ascending: false })
          .order("id", { ascending: false })
          .limit(100),
        supabase
          .from("proposals")
          .select("*")
          .eq("deal_id", dealId)
          .order("created_at", { ascending: false }),
        supabase
          .from("stages")
          .select("*")
          .eq("pipeline_id", Number(deal.pipeline_id || 1))
          .order("order_nr", { ascending: true }),
        deal.person_id
          ? supabase.from("mail_threads").select("*").eq("linked_person_id", Number(deal.person_id))
          : Promise.resolve({ data: [] }),
      ]);

    const notes = (notesRes.data || []).map((n) => ({
      ...n,
      parsed_meta: n.parsed_meta_json ? JSON.parse(String(n.parsed_meta_json)) : null,
    }));

    const proposals = (propRes.data || []).map((p) => ({
      ...p,
      items: p.items_json ? JSON.parse(String(p.items_json)) : [],
    }));

    return NextResponse.json({
      deal,
      organization: orgRes.data || null,
      person: personRes.data || null,
      notes,
      activities: actRes.data || [],
      files: filesRes.data || [],
      flowEvents: flowRes.data || [],
      proposals,
      stages: stagesRes.data || [],
      mailThreads: mailRes.data || [],
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
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const { id } = await context.params;
    const dealId = Number(id);
    const body = (await req.json()) as Record<string, unknown>;
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    const { data: existing } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });
    }

    if (body.action === "add_note") {
      const content = String(body.content || "").trim();
      if (!content) return NextResponse.json({ error: "Conteúdo da nota vazio" }, { status: 400 });
      const parsed = parseNoteContent(content);
      await supabase.from("notes").insert({
        deal_id: dealId,
        deal_title: String(existing.title || ""),
        person_id: existing.person_id ? Number(existing.person_id) : null,
        person_name: existing.person_name ? String(existing.person_name) : null,
        org_id: existing.org_id ? Number(existing.org_id) : null,
        org_name: existing.org_name ? String(existing.org_name) : null,
        user_id: 24624701,
        user_name: String(body.user_name || auth.member.crm_owner_name || "Klaus"),
        content: parsed.cleanHtml,
        note_category: parsed.category,
        parsed_meta_json: JSON.stringify(parsed.meta),
        pinned_to_deal_flag: body.pinned ? 1 : 0,
        add_time: now,
        update_time: now,
      });
      await supabase
        .from("deals")
        .update({ notes_count: Number(existing.notes_count || 0) + 1, update_time: now })
        .eq("id", dealId);
      return NextResponse.json({ success: true });
    }

    if (body.action === "add_activity") {
      const subject = String(body.subject || "").trim();
      if (!subject) return NextResponse.json({ error: "Assunto obrigatório" }, { status: 400 });
      await supabase.from("activities").insert({
        subject,
        type: String(body.type || "task"),
        type_name: String(body.type_name || "Tarefa"),
        done: 0,
        due_date: String(body.due_date || now.slice(0, 10)),
        due_time: String(body.due_time || "10:00"),
        deal_id: dealId,
        deal_title: String(existing.title || ""),
        person_id: existing.person_id ? Number(existing.person_id) : null,
        person_name: existing.person_name ? String(existing.person_name) : null,
        org_id: existing.org_id ? Number(existing.org_id) : null,
        org_name: existing.org_name ? String(existing.org_name) : null,
        user_id: 24624701,
        owner_name: String(body.owner_name || existing.owner_name || "Klaus"),
        note: body.note ? String(body.note) : null,
        add_time: now,
        update_time: now,
      });
      await supabase
        .from("deals")
        .update({
          activities_count: Number(existing.activities_count || 0) + 1,
          undone_activities_count: Number(existing.undone_activities_count || 0) + 1,
          update_time: now,
        })
        .eq("id", dealId);
      return NextResponse.json({ success: true });
    }

    const nextStageId = body.stage_id != null ? Number(body.stage_id) : Number(existing.stage_id);
    const { data: stage } = await supabase.from("stages").select("*").eq("id", nextStageId).maybeSingle();

    const nextStatus = body.status ? String(body.status) : String(existing.status);
    const nextValue = body.value != null ? Number(body.value) : Number(existing.value || 0);
    const nextOwner = body.owner_name ? String(body.owner_name) : String(existing.owner_name || "Klaus");
    const nextLostReason =
      body.lost_reason !== undefined
        ? body.lost_reason
          ? String(body.lost_reason)
          : null
        : (existing.lost_reason as string | null);

    await supabase
      .from("deals")
      .update({
        stage_id: stage?.id ?? nextStageId,
        stage_name: stage?.name ?? String(existing.stage_name || ""),
        stage_order_nr: stage?.order_nr ?? Number(existing.stage_order_nr || 0),
        pipeline_id: stage?.pipeline_id ?? Number(existing.pipeline_id || 1),
        pipeline_name: stage?.pipeline_name ?? String(existing.pipeline_name || ""),
        status: nextStatus,
        value: nextValue,
        formatted_value: `R$ ${nextValue.toLocaleString("pt-BR")}`,
        owner_name: nextOwner,
        lost_reason: nextLostReason,
        won_time: nextStatus === "won" && !existing.won_time ? now : existing.won_time,
        lost_time: nextStatus === "lost" && !existing.lost_time ? now : existing.lost_time,
        close_time:
          (nextStatus === "won" || nextStatus === "lost") && !existing.close_time ? now : existing.close_time,
        update_time: now,
      })
      .eq("id", dealId);

    if (nextStageId !== Number(existing.stage_id) && stage) {
      await supabase.from("deal_flow_events").insert({
        deal_id: dealId,
        object_type: "dealChange",
        timestamp: now,
        user_id: 24624701,
        field_key: "stage_id",
        field_name: "Etapa",
        old_value: String(existing.stage_id),
        new_value: String(stage.id),
        old_label: String(existing.stage_name || ""),
        new_label: stage.name,
        change_source: "crm-ui",
      });
    }
    if (nextStatus !== String(existing.status)) {
      await supabase.from("deal_flow_events").insert({
        deal_id: dealId,
        object_type: "dealChange",
        timestamp: now,
        user_id: 24624701,
        field_key: "status",
        field_name: "Status",
        old_value: String(existing.status),
        new_value: nextStatus,
        old_label: String(existing.status),
        new_label: nextStatus,
        change_source: "crm-ui",
      });
    }

    const { data: updated } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
    return NextResponse.json({ success: true, deal: updated });
  } catch (error) {
    console.error("PATCH /api/deals/[id] error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
