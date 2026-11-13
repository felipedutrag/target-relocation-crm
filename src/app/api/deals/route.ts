import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureDatabaseSeeded } from "@/lib/importer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const db = getDb();
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

    const where: string[] = [];
    const params: (string | number)[] = [];

    if (pipelineId) {
      where.push("pipeline_id = ?");
      params.push(pipelineId);
    }
    if (stageId) {
      where.push("stage_id = ?");
      params.push(stageId);
    }
    if (status && status !== "all") {
      where.push("status = ?");
      params.push(status);
    }
    if (ownerName && ownerName !== "all") {
      where.push("owner_name = ?");
      params.push(ownerName);
    }
    if (label && label !== "all") {
      where.push("label_name LIKE ?");
      params.push(`%${label}%`);
    }
    if (minScore !== null && !Number.isNaN(minScore)) {
      where.push("COALESCE(score, 0) >= ?");
      params.push(minScore);
    }
    if (onlyValued) {
      where.push("value > 0");
    }
    if (onlyDou) {
      where.push("is_dou = 1");
    }
    if (search) {
      where.push(
        "(title LIKE ? OR org_name LIKE ? OR person_name LIKE ? OR cnpj LIKE ? OR service_interest LIKE ? OR conversation_context LIKE ? OR dou_process LIKE ?)"
      );
      const q = `%${search}%`;
      params.push(q, q, q, q, q, q, q);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    let orderBy = "COALESCE(update_time, add_time) DESC, id DESC";
    if (sort === "value_desc") orderBy = "value DESC, update_time DESC";
    else if (sort === "score_desc") orderBy = "COALESCE(score, -1) DESC, update_time DESC";
    else if (sort === "add_desc") orderBy = "add_time DESC, id DESC";

    const pipelines = db.prepare("SELECT * FROM pipelines ORDER BY order_nr ASC").all();
    const stages = db
      .prepare(
        pipelineId
          ? "SELECT * FROM stages WHERE pipeline_id = ? ORDER BY order_nr ASC"
          : "SELECT * FROM stages ORDER BY pipeline_id ASC, order_nr ASC"
      )
      .all(...(pipelineId ? [pipelineId] : [])) as Array<Record<string, unknown>>;
    const users = db.prepare("SELECT id, name, email, is_admin FROM users ORDER BY name ASC").all();

    if (view === "kanban") {
      const targetPipeline = pipelineId || 1;
      const pipeStages = stages.filter((s) => Number(s.pipeline_id) === targetPipeline);

      const columns = pipeStages.map((st) => {
        const stId = Number(st.id);
        const colWhere = [...where];
        const colParams = [...params];
        if (!pipelineId) {
          colWhere.push("pipeline_id = ?");
          colParams.push(targetPipeline);
        }
        colWhere.push("stage_id = ?");
        colParams.push(stId);
        const colWhereSql = `WHERE ${colWhere.join(" AND ")}`;

        const summary = db
          .prepare(
            `SELECT COUNT(*) as total_count, COALESCE(SUM(value), 0) as total_value
            FROM deals ${colWhereSql}`
          )
          .get(...colParams) as { total_count: number; total_value: number };

        const items = db
          .prepare(
            `SELECT id, title, value, currency, status, pipeline_id, pipeline_name, stage_id, stage_name,
              owner_name, person_id, person_name, org_id, org_name, label_name, label_color,
              score, cnpj, segment, expat_count, dou_act_type, dou_process, is_dou,
              notes_count, activities_count, undone_activities_count, files_count,
              update_time, add_time, expected_close_date, lost_reason
            FROM deals ${colWhereSql}
            ORDER BY ${orderBy}
            LIMIT ?`
          )
          .all(...colParams, columnLimit);

        return {
          ...st,
          total_count: summary.total_count,
          total_value: summary.total_value,
          deals: items,
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

    const totalRow = db.prepare(`SELECT COUNT(*) as total FROM deals ${whereSql}`).get(...params) as { total: number };
    const offset = (page - 1) * limit;
    const rows = db
      .prepare(
        `SELECT id, title, value, currency, status, pipeline_id, pipeline_name, stage_id, stage_name,
          owner_name, person_id, person_name, org_id, org_name, label_name, label_color,
          score, cnpj, segment, website, expat_count, dou_act_type, dou_process, is_dou,
          notes_count, activities_count, undone_activities_count, files_count,
          service_interest, origin_country, meeting_date, update_time, add_time, lost_reason
        FROM deals ${whereSql}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    return NextResponse.json({
      view: "table",
      total: totalRow.total,
      page,
      limit,
      totalPages: Math.ceil(totalRow.total / limit),
      pipelines,
      stages,
      users,
      deals: rows,
    });
  } catch (error) {
    console.error("GET /api/deals error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const db = getDb();
    const body = (await req.json()) as Record<string, unknown>;
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    if (body.action === "move_stage") {
      const dealId = Number(body.deal_id);
      const newStageId = Number(body.stage_id);
      const stage = db.prepare("SELECT * FROM stages WHERE id = ?").get(newStageId) as
        | { id: number; name: string; pipeline_id: number; pipeline_name: string; order_nr: number }
        | undefined;
      const oldDeal = db.prepare("SELECT stage_id, stage_name FROM deals WHERE id = ?").get(dealId) as
        | { stage_id: number; stage_name: string }
        | undefined;
      if (!stage || !oldDeal) {
        return NextResponse.json({ error: "Negócio ou etapa não encontrado" }, { status: 404 });
      }
      db.prepare(
        `UPDATE deals
         SET stage_id = ?, stage_name = ?, stage_order_nr = ?, pipeline_id = ?, pipeline_name = ?,
             stage_change_time = ?, update_time = ?
         WHERE id = ?`
      ).run(stage.id, stage.name, stage.order_nr, stage.pipeline_id, stage.pipeline_name, now, now, dealId);

      db.prepare(
        `INSERT INTO deal_flow_events (deal_id, object_type, timestamp, user_id, field_key, field_name, old_value, new_value, old_label, new_label, change_source)
         VALUES (?, 'dealChange', ?, 24624701, 'stage_id', 'Etapa', ?, ?, ?, ?, 'crm-ui')`
      ).run(dealId, now, String(oldDeal.stage_id), String(stage.id), oldDeal.stage_name, stage.name);

      return NextResponse.json({ success: true, stage });
    }

    // Create new deal (supports CRM modal and Landing Page inbound lead form)
    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Título do negócio é obrigatório" }, { status: 400 });
    }
    const maxId = (db.prepare("SELECT COALESCE(MAX(id), 5000) as m FROM deals").get() as { m: number }).m;
    const newId = maxId + 1;
    const pipelineId = Number(body.pipeline_id || 1);
    const requestedStageId = body.stage_id ? Number(body.stage_id) : null;
    const stage = (requestedStageId
      ? db.prepare("SELECT * FROM stages WHERE id = ?").get(requestedStageId)
      : db.prepare("SELECT * FROM stages WHERE pipeline_id = ? ORDER BY order_nr ASC LIMIT 1").get(pipelineId)) as
      | { id: number; name: string; pipeline_name: string; order_nr: number }
      | undefined;
    const stageId = stage?.id ?? (pipelineId === 2 ? 14 : 6);
    const value = Number(body.value || 0);
    const currency = String(body.currency || "BRL");

    const orgName = body.org_name ? String(body.org_name).trim() : "";
    const personName = body.person_name ? String(body.person_name).trim() : "";
    const email = body.email ? String(body.email).trim() : "";
    const phone = body.phone ? String(body.phone).trim() : "";
    const message = body.message ? String(body.message).trim() : "";

    let orgId: number | null = null;
    if (orgName) {
      const existingOrg = db
        .prepare("SELECT id FROM organizations WHERE LOWER(name) = LOWER(?) LIMIT 1")
        .get(orgName) as { id: number } | undefined;
      if (existingOrg) {
        orgId = existingOrg.id;
        db.prepare("UPDATE organizations SET open_deals_count = open_deals_count + 1, update_time = ? WHERE id = ?").run(now, orgId);
      } else {
        const maxOrg = (db.prepare("SELECT COALESCE(MAX(id), 4000) as m FROM organizations").get() as { m: number }).m;
        orgId = maxOrg + 1;
        db.prepare(
          `INSERT INTO organizations (id, name, owner_name, label_name, label_color, open_deals_count, add_time, update_time)
           VALUES (?, ?, ?, 'B2B', 'blue', 1, ?, ?)`
        ).run(orgId, orgName, String(body.owner_name || "Klaus"), now, now);
      }
    }

    let personId: number | null = null;
    if (personName || email || phone) {
      const displayPerson = personName || email || phone;
      const existingPerson = email
        ? (db.prepare("SELECT id FROM persons WHERE LOWER(primary_email) = LOWER(?) LIMIT 1").get(email) as { id: number } | undefined)
        : undefined;
      if (existingPerson) {
        personId = existingPerson.id;
        db.prepare("UPDATE persons SET open_deals_count = open_deals_count + 1, update_time = ? WHERE id = ?").run(now, personId);
      } else {
        const maxPerson = (db.prepare("SELECT COALESCE(MAX(id), 4500) as m FROM persons").get() as { m: number }).m;
        personId = maxPerson + 1;
        db.prepare(
          `INSERT INTO persons (
            id, name, owner_name, org_id, org_name, primary_email, emails_json,
            primary_phone, phones_json, label_name, label_color, open_deals_count, add_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
        ).run(
          personId,
          displayPerson,
          String(body.owner_name || "Klaus"),
          orgId,
          orgName || null,
          email || null,
          email ? JSON.stringify([{ value: email, primary: true, label: "work" }]) : "[]",
          phone || null,
          phone ? JSON.stringify([{ value: phone, primary: true, label: "work" }]) : "[]",
          orgName ? "B2B" : "Lead Site",
          "blue",
          now,
          now
        );
      }
    }

    const hasInboundNote = Boolean(message || email || phone || body.form_filled);

    db.prepare(
      `INSERT INTO deals (
        id, title, value, currency, formatted_value, status, pipeline_id, pipeline_name,
        stage_id, stage_name, stage_order_nr, owner_name, person_id, org_id, org_name, person_name,
        label_name, label_color, origin, form_filled, form_page_url, cnpj, segment, score,
        service_interest, origin_country, notes_count, is_dou, add_time, update_time
      ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newId,
      title,
      value,
      currency,
      `${currency} ${value.toLocaleString("pt-BR")}`,
      pipelineId,
      stage?.pipeline_name || (pipelineId === 2 ? "Outbound" : "CRM - SDR"),
      stageId,
      stage?.name || "Nova oportunidade",
      stage?.order_nr ?? 0,
      String(body.owner_name || "Klaus"),
      personId,
      orgId,
      orgName || null,
      personName || null,
      body.label_name ? String(body.label_name) : orgName ? "B2B" : null,
      "blue",
      body.origin ? String(body.origin) : "Landing Page Target",
      body.form_filled ? String(body.form_filled) : null,
      body.form_page_url ? String(body.form_page_url) : "https://targetrelocation.com.br/#contato",
      body.cnpj ? String(body.cnpj) : null,
      body.segment ? String(body.segment) : null,
      body.score != null && body.score !== "" ? Number(body.score) : null,
      body.service_interest ? String(body.service_interest) : null,
      body.origin_country ? String(body.origin_country) : null,
      hasInboundNote ? 1 : 0,
      pipelineId === 2 ? 1 : 0,
      now,
      now
    );

    if (hasInboundNote) {
      const maxNote = (db.prepare("SELECT COALESCE(MAX(id), 20000) as m FROM notes").get() as { m: number }).m;
      const htmlLines = [
        `<p><strong>Lead recebido pela Landing Page Target Relocation</strong></p>`,
        personName ? `<p><strong>Contato:</strong> ${personName}</p>` : "",
        orgName ? `<p><strong>Empresa:</strong> ${orgName}</p>` : "",
        email ? `<p><strong>E-mail:</strong> ${email}</p>` : "",
        phone ? `<p><strong>Telefone / WhatsApp:</strong> ${phone}</p>` : "",
        body.service_interest ? `<p><strong>Serviço de interesse:</strong> ${String(body.service_interest)}</p>` : "",
        message ? `<p><strong>Mensagem:</strong> ${message}</p>` : "",
      ]
        .filter(Boolean)
        .join("\n");

      db.prepare(
        `INSERT INTO notes (
          id, deal_id, deal_title, person_id, person_name, org_id, org_name,
          user_id, user_name, content, note_category, parsed_meta_json, pinned_to_deal_flag, add_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 24624701, 'Klaus', ?, 'inbound_form', ?, 1, ?, ?)`
      ).run(
        maxNote + 1,
        newId,
        title,
        personId,
        personName || null,
        orgId,
        orgName || null,
        htmlLines,
        JSON.stringify({ category: "inbound_form", hook: message || String(body.service_interest || "") }),
        now,
        now
      );
    }

    const created = db.prepare("SELECT * FROM deals WHERE id = ?").get(newId);
    return NextResponse.json({ success: true, id: newId, deal: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/deals error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
