import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const sp = req.nextUrl.searchParams;
    const view = sp.get("view") || "table";
    const pipelineId = sp.get("pipeline_id") ? Number(sp.get("pipeline_id")) : null;
    const stageId = sp.get("stage_id") ? Number(sp.get("stage_id")) : null;
    const status = sp.get("status") || "";
    const ownerName = sp.get("owner") || "";
    const label = sp.get("label") || "";
    const search = (sp.get("search") || "").trim();
    const minScore = sp.get("min_score") ? Number(sp.get("min_score")) : null;
    const onlyValued = sp.get("only_valued") === "true";
    const onlyDou = sp.get("only_dou") === "true";
    const sort = sp.get("sort") || "update_desc";
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Math.max(10, Number(sp.get("limit") || 30)));
    const columnLimit = Math.min(50, Math.max(10, Number(sp.get("column_limit") || 25)));

    const [pipelinesRes, stagesRes, usersRes] = await Promise.all([
      supabase.from("pipelines").select("*").order("order_nr", { ascending: true }),
      pipelineId
        ? supabase.from("stages").select("*").eq("pipeline_id", pipelineId).order("order_nr", { ascending: true })
        : supabase.from("stages").select("*").order("pipeline_id", { ascending: true }).order("order_nr", { ascending: true }),
      supabase.from("users").select("id, name, email, is_admin").order("name", { ascending: true }),
    ]);

    const pipelines = pipelinesRes.data || [];
    const stages = stagesRes.data || [];
    const users = usersRes.data || [];

    const applyCommonFilters = (q: any) => {
      if (pipelineId) q = q.eq("pipeline_id", pipelineId);
      if (stageId) q = q.eq("stage_id", stageId);
      if (status && status !== "all") q = q.eq("status", status);
      if (ownerName && ownerName !== "all") q = q.eq("owner_name", ownerName);
      if (label && label !== "all") q = q.ilike("label_name", `%${label}%`);
      if (minScore !== null && !Number.isNaN(minScore)) q = q.gte("score", minScore);
      if (onlyValued) q = q.gt("value", 0);
      if (onlyDou) q = q.eq("is_dou", 1);
      if (search) {
        const s = search.replace(/[,()]/g, " ");
        q = q.or(
          `title.ilike.%${s}%,org_name.ilike.%${s}%,person_name.ilike.%${s}%,cnpj.ilike.%${s}%,service_interest.ilike.%${s}%,conversation_context.ilike.%${s}%,dou_process.ilike.%${s}%`
        );
      }
      if (sort === "value_desc") q = q.order("value", { ascending: false }).order("update_time", { ascending: false });
      else if (sort === "score_desc") q = q.order("score", { ascending: false, nullsFirst: false }).order("update_time", { ascending: false });
      else if (sort === "add_desc") q = q.order("add_time", { ascending: false }).order("id", { ascending: false });
      else q = q.order("update_time", { ascending: false, nullsFirst: false }).order("id", { ascending: false });
      return q;
    };

    if (view === "kanban") {
      const targetPipeline = pipelineId || 1;
      const pipeStages = stages.filter((s) => Number(s.pipeline_id) === targetPipeline);

      const [{ data: totalsData }, ...colResults] = await Promise.all([
        supabase.rpc("get_kanban_stage_totals", {
          p_pipeline_id: targetPipeline,
          p_status: status || "all",
          p_owner: ownerName || "all",
          p_search: search || null,
          p_only_valued: onlyValued,
        }),
        ...pipeStages.map((st) => {
          let q = supabase
            .from("deals")
            .select(
              "id, title, value, currency, status, pipeline_id, pipeline_name, stage_id, stage_name, owner_name, person_id, person_name, org_id, org_name, label_name, label_color, score, cnpj, segment, expat_count, dou_act_type, dou_process, is_dou, notes_count, activities_count, undone_activities_count, files_count, update_time, add_time, expected_close_date, lost_reason"
            )
            .eq("pipeline_id", targetPipeline)
            .eq("stage_id", Number(st.id));
          if (status && status !== "all") q = q.eq("status", status);
          if (ownerName && ownerName !== "all") q = q.eq("owner_name", ownerName);
          if (onlyValued) q = q.gt("value", 0);
          if (search) {
            const s = search.replace(/[,()]/g, " ");
            q = q.or(
              `title.ilike.%${s}%,org_name.ilike.%${s}%,person_name.ilike.%${s}%,cnpj.ilike.%${s}%,dou_process.ilike.%${s}%`
            );
          }
          if (sort === "value_desc") q = q.order("value", { ascending: false });
          else if (sort === "score_desc") q = q.order("score", { ascending: false, nullsFirst: false });
          else if (sort === "add_desc") q = q.order("add_time", { ascending: false });
          else q = q.order("update_time", { ascending: false, nullsFirst: false });
          return q.limit(columnLimit);
        }),
      ]);

      const totalsMap = new Map<number, { total_count: number; total_value: number }>();
      for (const row of (totalsData || []) as Array<{ stage_id: number; total_count: number; total_value: number }>) {
        totalsMap.set(Number(row.stage_id), {
          total_count: Number(row.total_count || 0),
          total_value: Number(row.total_value || 0),
        });
      }

      const columns = pipeStages.map((st, idx) => {
        const stSummary = totalsMap.get(Number(st.id)) || { total_count: 0, total_value: 0 };
        return {
          ...st,
          total_count: stSummary.total_count,
          total_value: stSummary.total_value,
          deals: colResults[idx]?.data || [],
        };
      });

      return NextResponse.json({
        view: "kanban",
        pipeline_id: targetPipeline,
        pipelines,
        stages: pipeStages,
        users,
        columns,
      });
    }

    const offset = (page - 1) * limit;
    let query = supabase
      .from("deals")
      .select(
        "id, title, value, currency, status, pipeline_id, pipeline_name, stage_id, stage_name, owner_name, person_id, person_name, org_id, org_name, label_name, label_color, score, cnpj, segment, website, expat_count, dou_act_type, dou_process, is_dou, notes_count, activities_count, undone_activities_count, files_count, service_interest, origin_country, meeting_date, update_time, add_time, lost_reason",
        { count: "exact" }
      );
    query = applyCommonFilters(query).range(offset, offset + limit - 1);

    const { data: rows, count, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const total = count || 0;
    return NextResponse.json({
      view: "table",
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      pipelines,
      stages,
      users,
      deals: rows || [],
    });
  } catch (error) {
    console.error("GET /api/deals error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const body = (await req.json()) as Record<string, unknown>;
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    if (body.action === "move_stage") {
      const dealId = Number(body.deal_id);
      const newStageId = Number(body.stage_id);
      const [{ data: stage }, { data: oldDeal }] = await Promise.all([
        supabase.from("stages").select("*").eq("id", newStageId).maybeSingle(),
        supabase.from("deals").select("stage_id, stage_name").eq("id", dealId).maybeSingle(),
      ]);
      if (!stage || !oldDeal) {
        return NextResponse.json({ error: "Negócio ou etapa não encontrado" }, { status: 404 });
      }
      await supabase
        .from("deals")
        .update({
          stage_id: stage.id,
          stage_name: stage.name,
          stage_order_nr: stage.order_nr,
          pipeline_id: stage.pipeline_id,
          pipeline_name: stage.pipeline_name,
          stage_change_time: now,
          update_time: now,
        })
        .eq("id", dealId);

      await supabase.from("deal_flow_events").insert({
        deal_id: dealId,
        object_type: "dealChange",
        timestamp: now,
        user_id: 24624701,
        field_key: "stage_id",
        field_name: "Etapa",
        old_value: String(oldDeal.stage_id),
        new_value: String(stage.id),
        old_label: oldDeal.stage_name,
        new_label: stage.name,
        change_source: "crm-ui",
      });

      return NextResponse.json({ success: true, stage });
    }

    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Título do negócio é obrigatório" }, { status: 400 });
    }

    const pipelineId = Number(body.pipeline_id || 1);
    const requestedStageId = body.stage_id ? Number(body.stage_id) : null;
    const { data: stage } = requestedStageId
      ? await supabase.from("stages").select("*").eq("id", requestedStageId).maybeSingle()
      : await supabase
          .from("stages")
          .select("*")
          .eq("pipeline_id", pipelineId)
          .order("order_nr", { ascending: true })
          .limit(1)
          .maybeSingle();

    const stageId = stage?.id ?? (pipelineId === 2 ? 14 : 6);
    const value = Number(body.value || 0);
    const currency = String(body.currency || "BRL");
    const orgName = body.org_name ? String(body.org_name).trim() : "";
    const personName = body.person_name ? String(body.person_name).trim() : "";
    const email = body.email ? String(body.email).trim() : "";
    const phone = body.phone ? String(body.phone).trim() : "";
    const message = body.message ? String(body.message).trim() : "";
    const origin = body.origin ? String(body.origin) : "CRM Manual";

    // Regra do Plano de Ação: cada lead tem 1 dono por origem (Áurea: ICP/DOU/LinkedIn Ads; Anderley: Ads/Site/WA/Portais)
    const ownerName =
      body.owner_name && String(body.owner_name).trim()
        ? String(body.owner_name).trim()
        : pipelineId === 2 || /dou|icp|linkedin ads/i.test(origin)
          ? "Aurea Azevedo"
          : "Anderley Nino";

    let orgId: number | null = null;
    if (orgName) {
      const { data: existingOrg } = await supabase
        .from("organizations")
        .select("id, open_deals_count")
        .ilike("name", orgName)
        .limit(1)
        .maybeSingle();
      if (existingOrg) {
        orgId = existingOrg.id;
        await supabase
          .from("organizations")
          .update({ open_deals_count: (existingOrg.open_deals_count || 0) + 1, update_time: now })
          .eq("id", orgId);
      } else {
        const { data: createdOrg } = await supabase
          .from("organizations")
          .insert({
            name: orgName,
            owner_name: ownerName,
            label_name: "B2B",
            label_color: "blue",
            open_deals_count: 1,
            add_time: now,
            update_time: now,
          })
          .select("id")
          .single();
        orgId = createdOrg?.id ?? null;
      }
    }

    let personId: number | null = null;
    if (personName || email || phone) {
      const displayPerson = personName || email || phone;
      const existingPerson = email
        ? (
            await supabase
              .from("persons")
              .select("id, open_deals_count")
              .ilike("primary_email", email)
              .limit(1)
              .maybeSingle()
          ).data
        : null;
      if (existingPerson) {
        personId = existingPerson.id;
        await supabase
          .from("persons")
          .update({ open_deals_count: (existingPerson.open_deals_count || 0) + 1, update_time: now })
          .eq("id", personId);
      } else {
        const { data: createdPerson } = await supabase
          .from("persons")
          .insert({
            name: displayPerson,
            owner_name: ownerName,
            org_id: orgId,
            org_name: orgName || null,
            primary_email: email || null,
            emails_json: email ? JSON.stringify([{ value: email, primary: true, label: "work" }]) : "[]",
            primary_phone: phone || null,
            phones_json: phone ? JSON.stringify([{ value: phone, primary: true, label: "work" }]) : "[]",
            label_name: orgName ? "B2B" : origin,
            label_color: "blue",
            open_deals_count: 1,
            add_time: now,
            update_time: now,
          })
          .select("id")
          .single();
        personId = createdPerson?.id ?? null;
      }
    }

    const hasInboundNote = Boolean(message || email || phone || body.form_filled);
    const { data: createdDeal, error: dealErr } = await supabase
      .from("deals")
      .insert({
        title,
        value,
        currency,
        formatted_value: `${currency} ${value.toLocaleString("pt-BR")}`,
        status: "open",
        pipeline_id: pipelineId,
        pipeline_name: stage?.pipeline_name || (pipelineId === 2 ? "Outbound" : "CRM - SDR"),
        stage_id: stageId,
        stage_name: stage?.name || "Nova oportunidade",
        stage_order_nr: stage?.order_nr ?? 0,
        owner_name: ownerName,
        person_id: personId,
        org_id: orgId,
        org_name: orgName || null,
        person_name: personName || null,
        label_name: body.label_name ? String(body.label_name) : orgName ? "B2B" : origin,
        label_color: "blue",
        origin,
        form_filled: body.form_filled ? String(body.form_filled) : null,
        form_page_url: body.form_page_url ? String(body.form_page_url) : null,
        cnpj: body.cnpj ? String(body.cnpj) : null,
        segment: body.segment ? String(body.segment) : null,
        score: body.score != null && body.score !== "" ? Number(body.score) : null,
        service_interest: body.service_interest ? String(body.service_interest) : null,
        origin_country: body.origin_country ? String(body.origin_country) : null,
        utm_source: body.utm_source ? String(body.utm_source) : null,
        utm_medium: body.utm_medium ? String(body.utm_medium) : null,
        utm_campaign: body.utm_campaign ? String(body.utm_campaign) : null,
        notes_count: hasInboundNote ? 1 : 0,
        is_dou: pipelineId === 2 ? 1 : 0,
        add_time: now,
        update_time: now,
      })
      .select("*")
      .single();

    if (dealErr || !createdDeal) {
      return NextResponse.json({ error: dealErr?.message || "Erro ao criar negócio" }, { status: 500 });
    }

    if (hasInboundNote) {
      const htmlLines = [
        `<p><strong>Lead registrado (${origin})</strong></p>`,
        personName ? `<p><strong>Contato:</strong> ${personName}</p>` : "",
        orgName ? `<p><strong>Empresa:</strong> ${orgName}</p>` : "",
        email ? `<p><strong>E-mail:</strong> ${email}</p>` : "",
        phone ? `<p><strong>Telefone / WhatsApp:</strong> ${phone}</p>` : "",
        body.service_interest ? `<p><strong>Serviço:</strong> ${String(body.service_interest)}</p>` : "",
        message ? `<p><strong>Mensagem:</strong> ${message}</p>` : "",
      ]
        .filter(Boolean)
        .join("\n");

      await supabase.from("notes").insert({
        deal_id: createdDeal.id,
        deal_title: title,
        person_id: personId,
        person_name: personName || null,
        org_id: orgId,
        org_name: orgName || null,
        user_id: 24624701,
        user_name: ownerName,
        content: htmlLines,
        note_category: "inbound_form",
        parsed_meta_json: JSON.stringify({ category: "inbound_form", hook: message || origin }),
        pinned_to_deal_flag: 1,
        add_time: now,
        update_time: now,
      });
    }

    return NextResponse.json({ success: true, id: createdDeal.id, deal: createdDeal }, { status: 201 });
  } catch (error) {
    console.error("POST /api/deals error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
