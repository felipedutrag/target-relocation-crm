import { NextRequest, NextResponse } from "next/server";
import type OpenAI from "openai";
import { requireWorkspaceUser } from "@/lib/supabase/server";
import { resolveOpenAiClient, slugifyPt, TARGET_COMPLIANCE_SYSTEM_PROMPT } from "@/lib/openai";

export const dynamic = "force-dynamic";

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_workspace_overview",
      description: "Obtém resumo em tempo real do CRM (total negócios, Radar DOU, reuniões, atividades pendentes, placar SDR hoje, cronograma 30 dias e status das campanhas).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "search_crm_deals",
      description: "Busca negócios/leads no Supabase CRM por nome da empresa, CNPJ, processo DOU, proprietário ou status.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto para busca em título, empresa, CNPJ ou DOU" },
          only_dou: { type: "boolean", description: "Filtrar apenas leads do Radar DOU" },
          limit: { type: "number", description: "Quantidade máxima de resultados (padrão 8)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_crm_activity",
      description: "Cria uma nova atividade/tarefa/ligação no CRM para Áurea Azevedo, Anderley Nino ou Klaus.",
      parameters: {
        type: "object",
        required: ["subject", "owner_name"],
        properties: {
          subject: { type: "string", description: "Assunto claro da tarefa ou ligação" },
          owner_name: { type: "string", description: "Dono: 'Aurea Azevedo', 'Anderley Nino' ou 'Klaus'" },
          type: { type: "string", enum: ["call", "task", "meeting", "email"] },
          deal_id: { type: "number", description: "ID do negócio vinculado se houver" },
          org_name: { type: "string", description: "Empresa relacionada" },
          due_date: { type: "string", description: "Data YYYY-MM-DD" },
          note: { type: "string", description: "Instruções para o SDR" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "capture_klaus_profile_view",
      description: "Registra uma visita no perfil do LinkedIn Premium do Klaus e cria tarefa matinal obrigatória para Anderley Nino.",
      parameters: {
        type: "object",
        required: ["visitor_name", "company"],
        properties: {
          visitor_name: { type: "string" },
          company: { type: "string" },
          job_title: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_editorial_pauta",
      description: "Adiciona uma nova pauta (ex: News DOU/MTE da semana ou FAQ de serviço) no calendário editorial em status 'Para Aprovar' para revisão do Klaus.",
      parameters: {
        type: "object",
        required: ["topic", "format"],
        properties: {
          topic: { type: "string" },
          format: { type: "string", enum: ["News", "Serviço em FAQ", "Institucional"] },
          scheduled_date: { type: "string", description: "Data YYYY-MM-DD" },
          linkedin_draft: { type: "string", description: "Rascunho opcional do post para o perfil do Klaus" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_sdr_activity",
      description: "Incrementa o placar diário do SDR (ligações, conversas ou reuniões agendadas) no Supabase.",
      parameters: {
        type: "object",
        required: ["sdr_name", "field", "delta"],
        properties: {
          sdr_name: { type: "string", enum: ["Aurea Azevedo", "Anderley Nino"] },
          field: { type: "string", enum: ["calls_made", "conversations", "meetings_booked", "linkedin_invites", "emails_sent"] },
          delta: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_ads_negative_keyword",
      description: "Adiciona palavra-chave negativa em uma campanha do Google Ads para evitar cliques fora do escopo (como H2A/H2B ou pets).",
      parameters: {
        type: "object",
        required: ["keyword"],
        properties: {
          keyword: { type: "string" },
          campaign_id: { type: "number", description: "ID da campanha (opcional, padrão aplica na Campanha 1 e 2)" },
        },
      },
    },
  },
];

export async function GET(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase, user } = auth;

    const sessionId = req.nextUrl.searchParams.get("session_id");
    const [sessionsRes, aiCfg] = await Promise.all([
      supabase
        .from("ai_chat_sessions")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(15),
      resolveOpenAiClient(supabase),
    ]);

    const sessions = sessionsRes.data || [];
    const activeSessionId = sessionId || sessions[0]?.id || null;

    let messages: Array<Record<string, unknown>> = [];
    if (activeSessionId) {
      const { data: msgRows } = await supabase
        .from("ai_chat_messages")
        .select("*")
        .eq("session_id", activeSessionId)
        .order("id", { ascending: true });
      messages = msgRows || [];
    }

    return NextResponse.json({
      sessions,
      activeSessionId,
      messages,
      aiConfigured: Boolean(aiCfg.client),
      aiModel: aiCfg.model,
      aiSource: aiCfg.source,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase, user, member } = auth;

    const body = (await req.json()) as {
      action?: string;
      session_id?: string | null;
      message?: string;
      title?: string;
    };
    const now = new Date().toISOString();

    if (body.action === "new_session") {
      const { data: session, error } = await supabase
        .from("ai_chat_sessions")
        .insert({
          user_id: user!.id,
          title: body.title?.trim() || "Nova conversa Target IA",
          updated_at: now,
        })
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, session });
    }

    const userText = String(body.message || "").trim();
    if (!userText) {
      return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
    }

    let sessionId = body.session_id || null;
    if (!sessionId) {
      const { data: createdSession, error: sErr } = await supabase
        .from("ai_chat_sessions")
        .insert({
          user_id: user!.id,
          title: userText.slice(0, 56),
          updated_at: now,
        })
        .select("id")
        .single();
      if (sErr || !createdSession) return NextResponse.json({ error: sErr?.message || "Erro ao criar sessão" }, { status: 500 });
      sessionId = createdSession.id;
    } else {
      await supabase.from("ai_chat_sessions").update({ updated_at: now }).eq("id", sessionId);
    }

    // Store user message
    await supabase.from("ai_chat_messages").insert({
      session_id: sessionId,
      user_id: user!.id,
      role: "user",
      content: userText,
      tool_calls_json: [],
    });

    const ai = await resolveOpenAiClient(supabase);
    if (!ai.client) {
      const fallbackReply =
        "Chave OpenAI API ainda não configurada neste ambiente.\n\nClique no botão **Configurar IA** no canto superior direito para inserir sua `OPENAI_API_KEY` (salva de forma segura no Supabase) — a partir desse segundo eu opero com acesso direto ao CRM (4.344 negócios), Radar DOU, Blog GEO, Placar SDR e Google Ads.";
      const { data: savedFallback } = await supabase
        .from("ai_chat_messages")
        .insert({
          session_id: sessionId,
          user_id: user!.id,
          role: "assistant",
          content: fallbackReply,
          tool_calls_json: [],
        })
        .select("*")
        .single();
      return NextResponse.json({
        success: true,
        session_id: sessionId,
        aiConfigured: false,
        message: savedFallback,
      });
    }

    // Load last 12 conversation messages for context
    const { data: historyRows } = await supabase
      .from("ai_chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("id", { ascending: false })
      .limit(12);
    const orderedHistory = (historyRows || []).reverse();

    const conversation: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `${TARGET_COMPLIANCE_SYSTEM_PROMPT}\n\nUsuário ativo no momento: ${member.full_name} (${member.role} / ${member.email}). Data de hoje: ${now.slice(0, 10)}.\nVocê tem ferramentas para consultar e gravar dados reais no Supabase CRM da Target Relocation (negócios, DOU, tarefas para SDRs, pautas no calendário editorial, placar SDR e negativas no Ads). Sempre use as ferramentas antes de responder sobre números do CRM ou executar ações solicitadas pelo usuário, e confirme com precisão os IDs/nomes alterados.`,
      },
      ...orderedHistory.map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: String(m.content),
      })),
    ];

    const executedToolCalls: Array<{ name: string; args: unknown; resultSummary: string }> = [];

    const runTool = async (name: string, args: Record<string, unknown>) => {
      const nowCrm = new Date().toISOString().replace("T", " ").slice(0, 19);
      const today = now.slice(0, 10);

      if (name === "get_workspace_overview") {
        const [ovRes, logsRes, postsRes, editorialRes, msRes] = await Promise.all([
          supabase.rpc("get_overview_dashboard"),
          supabase.from("sdr_daily_logs").select("*").eq("log_date", today),
          supabase.from("blog_posts").select("id, title, status").eq("status", "published"),
          supabase.from("editorial_items").select("approval_status"),
          supabase.from("action_plan_milestones").select("status, is_gate"),
        ]);
        const ov = (ovRes.data || {}) as Record<string, unknown>;
        const kpis = (ov.kpis || {}) as Record<string, unknown>;
        return {
          crm_kpis: kpis,
          sdr_today: logsRes.data || [],
          published_blog_posts: postsRes.data || [],
          editorial_pending_approval: (editorialRes.data || []).filter((e) => e.approval_status === "Para Aprovar").length,
          milestones_completed: (msRes.data || []).filter((m) => m.status === "completed").length,
          milestones_total: (msRes.data || []).length,
        };
      }

      if (name === "search_crm_deals") {
        const q = String(args.query || "").trim();
        const lim = Math.min(15, Number(args.limit || 8));
        let dbq = supabase
          .from("deals")
          .select("id, title, org_name, person_name, status, stage_name, pipeline_name, owner_name, value, score, cnpj, dou_process, update_time")
          .order("update_time", { ascending: false })
          .limit(lim);
        if (args.only_dou) dbq = dbq.eq("is_dou", 1);
        if (q) {
          const s = q.replace(/[,()]/g, " ");
          dbq = dbq.or(`title.ilike.%${s}%,org_name.ilike.%${s}%,cnpj.ilike.%${s}%,dou_process.ilike.%${s}%,owner_name.ilike.%${s}%`);
        }
        const { data } = await dbq;
        return { deals: data || [] };
      }

      if (name === "create_crm_activity") {
        const { data, error } = await supabase
          .from("activities")
          .insert({
            subject: String(args.subject),
            type: String(args.type || "call"),
            type_name: args.type === "meeting" ? "Reunião" : args.type === "task" ? "Tarefa" : args.type === "email" ? "E-mail" : "Chamada",
            done: 0,
            due_date: String(args.due_date || today),
            due_time: "09:30",
            deal_id: args.deal_id ? Number(args.deal_id) : null,
            org_name: args.org_name ? String(args.org_name) : null,
            owner_name: String(args.owner_name || "Anderley Nino"),
            cadence_period: "MANHÃ",
            note: args.note ? String(args.note) : "Criado via Copilot IA Target Relocation.",
            add_time: nowCrm,
            update_time: nowCrm,
          })
          .select("id, subject, owner_name, due_date")
          .single();
        return error ? { error: error.message } : { created: data };
      }

      if (name === "capture_klaus_profile_view") {
        const visitor = String(args.visitor_name);
        const company = String(args.company);
        const title = args.job_title ? String(args.job_title) : "RH / Global Mobility";
        const { data: act } = await supabase
          .from("activities")
          .insert({
            subject: `[LinkedIn Premium] Visita ao perfil do Klaus — ${visitor} (${company})`,
            type: "call",
            type_name: "Chamada",
            done: 0,
            due_date: today,
            due_time: "09:30",
            org_name: company,
            person_name: visitor,
            owner_name: "Anderley Nino",
            cadence_period: "MANHÃ",
            note: `Cargo: ${title}. Criado via Copilot IA.`,
            add_time: nowCrm,
            update_time: nowCrm,
          })
          .select("id, subject, owner_name")
          .single();
        return { created_task_for_anderley: act };
      }

      if (name === "create_editorial_pauta") {
        const topic = String(args.topic);
        const sched = String(args.scheduled_date || today);
        const d = new Date(`${sched}T12:00:00Z`);
        const dayLabel = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        const weekdays = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
        const format = String(args.format || "News");
        const { data } = await supabase
          .from("editorial_items")
          .insert({
            scheduled_date: sched,
            day_label: dayLabel,
            weekday: weekdays[d.getUTCDay()] || "seg",
            format,
            topic,
            video_plan: format === "Serviço em FAQ" ? "YouTube + Shorts" : "Short",
            approval_status: "Para Aprovar",
            technical_reviewed: false,
            linkedin_klaus_post: args.linkedin_draft ? String(args.linkedin_draft) : null,
            utm_campaign: `blog_${sched.replace(/-/g, "")}_${slugifyPt(topic).slice(0, 24)}`,
            updated_at: now,
          })
          .select("id, topic, format, scheduled_date, approval_status")
          .single();
        return { editorial_item: data };
      }

      if (name === "log_sdr_activity") {
        const sdr = String(args.sdr_name);
        const field = String(args.field);
        const delta = Number(args.delta || 1);
        const { data: ex } = await supabase
          .from("sdr_daily_logs")
          .select("*")
          .eq("log_date", today)
          .eq("sdr_name", sdr)
          .maybeSingle();
        const next = Math.max(0, Number(ex?.[field] || 0) + delta);
        const { data } = await supabase
          .from("sdr_daily_logs")
          .upsert(
            {
              log_date: today,
              sdr_name: sdr,
              calls_made: ex?.calls_made || 0,
              conversations: ex?.conversations || 0,
              meetings_booked: ex?.meetings_booked || 0,
              linkedin_invites: ex?.linkedin_invites || 0,
              linkedin_comments: ex?.linkedin_comments || 0,
              emails_sent: ex?.emails_sent || 0,
              profile_views_processed: ex?.profile_views_processed || 0,
              updated_at: now,
              [field]: next,
            },
            { onConflict: "log_date,sdr_name" }
          )
          .select("*")
          .single();
        return { updated_log: data };
      }

      if (name === "add_ads_negative_keyword") {
        const kw = String(args.keyword).trim();
        const targetIds = args.campaign_id ? [Number(args.campaign_id)] : [1, 2];
        const results = [];
        for (const cid of targetIds) {
          const { data: c } = await supabase.from("ads_campaigns").select("*").eq("id", cid).maybeSingle();
          if (c) {
            const list: string[] = Array.isArray(c.negative_keywords_json) ? c.negative_keywords_json : [];
            if (!list.includes(kw)) list.push(kw);
            await supabase
              .from("ads_campaigns")
              .update({ negative_keywords_json: list, updated_at: now })
              .eq("id", cid);
            results.push(c.name);
          }
        }
        return { added_keyword: kw, campaigns_updated: results };
      }

      return { error: "Tool não encontrada" };
    };

    let finalReply = "";
    for (let step = 0; step < 5; step++) {
      const resp = await ai.client.chat.completions.create({
        model: ai.model,
        temperature: 0.35,
        tools: TOOLS,
        messages: conversation,
      });

      const choice = resp.choices[0];
      const msg = choice?.message;
      if (!msg) break;

      conversation.push(msg);

      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        finalReply = msg.content || "Concluído.";
        break;
      }

      for (const tc of msg.tool_calls) {
        if (tc.type !== "function") continue;
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(tc.function.arguments || "{}");
        } catch {
          parsedArgs = {};
        }
        const toolResult = await runTool(tc.function.name, parsedArgs);
        executedToolCalls.push({
          name: tc.function.name,
          args: parsedArgs,
          resultSummary: JSON.stringify(toolResult).slice(0, 300),
        });
        conversation.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    if (!finalReply) {
      finalReply = "Ações executadas no workspace.";
    }

    const { data: assistantMsg } = await supabase
      .from("ai_chat_messages")
      .insert({
        session_id: sessionId,
        user_id: user!.id,
        role: "assistant",
        content: finalReply,
        tool_calls_json: executedToolCalls,
      })
      .select("*")
      .single();

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      aiConfigured: true,
      model: ai.model,
      message: assistantMsg,
    });
  } catch (error) {
    console.error("POST /api/ai/chat error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
