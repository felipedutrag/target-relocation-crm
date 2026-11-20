import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceUser } from "@/lib/supabase/server";
import { resolveOpenAiClient, TARGET_COMPLIANCE_SYSTEM_PROMPT } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const today = new Date().toISOString().slice(0, 10);

    const [logsRes, auditsRes, meetingsRes, icpOrgsRes, douQueueRes, inboundQueueRes, aiCfg] = await Promise.all([
      supabase.from("sdr_daily_logs").select("*").order("log_date", { ascending: false }).limit(20),
      supabase.from("sdr_call_audits").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("weekly_meetings").select("*").order("meeting_date", { ascending: false }).limit(12),
      supabase
        .from("organizations")
        .select("id, name, address, label_name, open_deals_count, owner_name")
        .ilike("label_name", "%ICP%")
        .order("open_deals_count", { ascending: false })
        .limit(120),
      supabase
        .from("deals")
        .select("id, title, org_name, score, stage_name, dou_act_type, update_time")
        .eq("status", "open")
        .eq("pipeline_id", 2)
        .order("score", { ascending: false, nullsFirst: false })
        .limit(15),
      supabase
        .from("deals")
        .select("id, title, org_name, person_name, origin, stage_name, update_time")
        .eq("status", "open")
        .eq("pipeline_id", 1)
        .order("update_time", { ascending: false })
        .limit(15),
      resolveOpenAiClient(supabase),
    ]);

    return NextResponse.json({
      today,
      logs: logsRes.data || [],
      audits: auditsRes.data || [],
      meetings: meetingsRes.data || [],
      icpOrgs: icpOrgsRes.data || [],
      douQueue: douQueueRes.data || [],
      inboundQueue: inboundQueueRes.data || [],
      aiConfigured: Boolean(aiCfg.client),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action || "");
    const today = String(body.log_date || new Date().toISOString().slice(0, 10));
    const nowIso = new Date().toISOString();
    const nowCrm = nowIso.replace("T", " ").slice(0, 19);

    if (action === "increment_log") {
      const sdrName = String(body.sdr_name || "Aurea Azevedo");
      const field = String(body.field || "calls_made");
      const delta = Number(body.delta ?? 1);
      const allowedFields = [
        "calls_made",
        "conversations",
        "meetings_booked",
        "linkedin_invites",
        "linkedin_comments",
        "emails_sent",
        "profile_views_processed",
      ];
      if (!allowedFields.includes(field)) {
        return NextResponse.json({ error: "Campo inválido" }, { status: 400 });
      }

      const { data: existing } = await supabase
        .from("sdr_daily_logs")
        .select("*")
        .eq("log_date", today)
        .eq("sdr_name", sdrName)
        .maybeSingle();

      const nextVal = Math.max(0, Number(existing?.[field] || 0) + delta);
      const payload = {
        log_date: today,
        sdr_name: sdrName,
        calls_made: existing?.calls_made || 0,
        conversations: existing?.conversations || 0,
        meetings_booked: existing?.meetings_booked || 0,
        linkedin_invites: existing?.linkedin_invites || 0,
        linkedin_comments: existing?.linkedin_comments || 0,
        emails_sent: existing?.emails_sent || 0,
        profile_views_processed: existing?.profile_views_processed || 0,
        notes: body.notes !== undefined ? String(body.notes) : existing?.notes || "",
        updated_at: nowIso,
        [field]: nextVal,
      };

      const { data, error } = await supabase
        .from("sdr_daily_logs")
        .upsert(payload, { onConflict: "log_date,sdr_name" })
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, log: data });
    }

    if (action === "capture_profile_view") {
      const visitorName = String(body.visitor_name || "").trim();
      const company = String(body.company || "").trim();
      const jobTitle = String(body.job_title || "").trim();
      if (!visitorName || !company) {
        return NextResponse.json({ error: "Nome e empresa são obrigatórios" }, { status: 400 });
      }

      // Check if company matches CRM organization
      const { data: orgMatch } = await supabase
        .from("organizations")
        .select("id, name")
        .ilike("name", `%${company}%`)
        .limit(1)
        .maybeSingle();

      // Create task directly in CRM assigned to Anderley Nino (Plano Pág. 3 & 5)
      const subject = `[LinkedIn Premium] Visita ao perfil do Klaus — ${visitorName} (${company})`;
      const { data: act, error: actErr } = await supabase
        .from("activities")
        .insert({
          subject,
          type: "call",
          type_name: "Chamada",
          done: 0,
          due_date: today,
          due_time: "09:30",
          org_id: orgMatch?.id ?? null,
          org_name: orgMatch?.name || company,
          person_name: visitorName,
          owner_name: "Anderley Nino",
          cadence_period: "MANHÃ",
          note: `Origem: Quem viu seu perfil (LinkedIn Premium Klaus).\nCargo: ${jobTitle || "RH / Global Mobility"}.\nRegra Plano de Ação: contato via telefone/CRM para agendar reunião.`,
          add_time: nowCrm,
          update_time: nowCrm,
        })
        .select("*")
        .single();

      if (actErr) return NextResponse.json({ error: actErr.message }, { status: 500 });

      // Increment Anderley's daily counter
      const { data: existingLog } = await supabase
        .from("sdr_daily_logs")
        .select("*")
        .eq("log_date", today)
        .eq("sdr_name", "Anderley Nino")
        .maybeSingle();
      await supabase.from("sdr_daily_logs").upsert(
        {
          log_date: today,
          sdr_name: "Anderley Nino",
          calls_made: existingLog?.calls_made || 0,
          conversations: existingLog?.conversations || 0,
          meetings_booked: existingLog?.meetings_booked || 0,
          linkedin_invites: existingLog?.linkedin_invites || 0,
          linkedin_comments: existingLog?.linkedin_comments || 0,
          emails_sent: existingLog?.emails_sent || 0,
          profile_views_processed: (existingLog?.profile_views_processed || 0) + 1,
          updated_at: nowIso,
        },
        { onConflict: "log_date,sdr_name" }
      );

      return NextResponse.json({ success: true, activity: act, orgMatched: Boolean(orgMatch) }, { status: 201 });
    }

    if (action === "audit_call") {
      const sdrName = String(body.sdr_name || "Aurea Azevedo");
      const leadCompany = String(body.lead_company || "").trim();
      const transcript = String(body.transcript_or_notes || "").trim();
      if (!transcript) return NextResponse.json({ error: "Transcrição ou resumo da ligação obrigatório." }, { status: 400 });

      const ai = await resolveOpenAiClient(supabase);
      if (!ai.client) {
        return NextResponse.json(
          {
            error: "Configure sua OpenAI API Key em 'Configurar IA' para executar a auditoria detalhada por IA.",
            aiRequired: true,
          },
          { status: 400 }
        );
      }

      const completion = await ai.client.chat.completions.create({
        model: ai.model,
        response_format: { type: "json_object" },
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `${TARGET_COMPLIANCE_SYSTEM_PROMPT}\nVocê agora é o Auditor de Ligações (Boost / Felipe). Avalie ligações de prospecção B2B para Target Relocation cujo objetivo único é agendar uma reunião qualificada com RH/Global Mobility.`,
          },
          {
            role: "user",
            content: `Audite esta ligação do SDR ${sdrName} com a empresa "${leadCompany || "Não informada"}":\n\n"${transcript}"\n\nRetorne JSON estrito:\n{\n  "score": 0-100,\n  "strengths": "Pontos fortes objetivos",\n  "improvements": "O que ajustar imediatamente (clareza, pergunta de qualificação, postura consultiva, não simplificar processo de visto/MTE, pedido explícito de reunião)",\n  "recommended_next_step": "Próximo passo exato no CRM hoje",\n  "objections_detected": ["objeção 1", "..."]\n}`,
          },
        ],
      });

      const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}") as Record<string, unknown>;

      const { data: saved, error } = await supabase
        .from("sdr_call_audits")
        .insert({
          deal_id: body.deal_id ? Number(body.deal_id) : null,
          sdr_name: sdrName,
          lead_company: leadCompany || null,
          transcript_or_notes: transcript,
          score: Number(parsed.score || 70),
          strengths: String(parsed.strengths || ""),
          improvements: String(parsed.improvements || ""),
          recommended_next_step: String(parsed.recommended_next_step || ""),
          objections_detected_json: Array.isArray(parsed.objections_detected) ? parsed.objections_detected : [],
        })
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, audit: saved }, { status: 201 });
    }

    if (action === "create_meeting") {
      const blockers = String(body.blockers || "").trim();
      const decisions = String(body.decisions || "").trim();
      const meetingsWeek = Number(body.meetings_count_week || 0);
      const calendarApproved = Boolean(body.calendar_approved);

      let aiSummary = body.ai_summary ? String(body.ai_summary) : "";
      const ai = await resolveOpenAiClient(supabase);
      if (ai.client && !aiSummary) {
        const res = await ai.client.chat.completions.create({
          model: ai.model,
          temperature: 0.3,
          messages: [
            { role: "system", content: TARGET_COMPLIANCE_SYSTEM_PROMPT },
            {
              role: "user",
              content: `Gere um resumo executivo direto (máximo 5 linhas) da Reunião Semanal de 30 min (Segunda, 9h) com Klaus, Áurea, Anderley e Felipe.\nReuniões agendadas na semana: ${meetingsWeek}\nTravas: ${blockers || "Nenhuma"}\nDecisões: ${decisions || "Padrão"}\nCalendário aprovado pelo Klaus: ${calendarApproved ? "Sim" : "Pendente"}`,
            },
          ],
        });
        aiSummary = res.choices[0]?.message?.content?.trim() || "";
      }

      const { data, error } = await supabase
        .from("weekly_meetings")
        .insert({
          meeting_date: String(body.meeting_date || today),
          participants: String(body.participants || "Klaus Duailibi, Áurea Azevedo, Anderley Nino e Felipe (Boost)"),
          meetings_count_week: meetingsWeek,
          leads_by_origin_json: body.leads_by_origin_json || {},
          blockers,
          decisions,
          calendar_approved: calendarApproved,
          ai_summary: aiSummary || "Ata registrada no workspace.",
        })
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, meeting: data }, { status: 201 });
    }

    return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
