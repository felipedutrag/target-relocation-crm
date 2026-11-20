import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceUser } from "@/lib/supabase/server";
import { resolveOpenAiClient, TARGET_COMPLIANCE_SYSTEM_PROMPT } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const [milestonesRes, adsRes, geoRes, kpisRes, postsRes, aiCfg] = await Promise.all([
      supabase.from("action_plan_milestones").select("*").order("phase", { ascending: true }).order("due_day", { ascending: true }),
      supabase.from("ads_campaigns").select("*").order("id", { ascending: true }),
      supabase.from("geo_audit_tests").select("*").order("id", { ascending: true }),
      supabase.from("kpi_snapshots").select("*").order("id", { ascending: true }),
      supabase.from("blog_posts").select("slug, title, question_headline, direct_answer, status, faq_schema_json").eq("status", "published"),
      resolveOpenAiClient(supabase),
    ]);

    return NextResponse.json({
      milestones: milestonesRes.data || [],
      campaigns: adsRes.data || [],
      geoTests: geoRes.data || [],
      kpis: kpisRes.data || [],
      publishedPostsCount: (postsRes.data || []).length,
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
    const now = new Date().toISOString();

    if (action === "toggle_milestone") {
      const id = Number(body.id);
      const status = String(body.status || "completed");
      const { data, error } = await supabase
        .from("action_plan_milestones")
        .update({
          status,
          completed_at: status === "completed" ? now : null,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, milestone: data });
    }

    if (action === "toggle_ads_approval") {
      const id = Number(body.id);
      const { data: camp } = await supabase.from("ads_campaigns").select("*").eq("id", id).maybeSingle();
      if (!camp) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
      const nextApproved = !camp.budget_approved_by_klaus;
      const { data, error } = await supabase
        .from("ads_campaigns")
        .update({
          budget_approved_by_klaus: nextApproved,
          monthly_budget_brl: body.monthly_budget_brl !== undefined ? Number(body.monthly_budget_brl) : camp.monthly_budget_brl,
          status: nextApproved && camp.conversion_tracking_active ? "ativo" : nextApproved ? "aguardando_conversao" : "aguardando_aprovacao",
          updated_at: now,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, campaign: data });
    }

    if (action === "toggle_conversion") {
      const id = Number(body.id);
      const { data: camp } = await supabase.from("ads_campaigns").select("*").eq("id", id).maybeSingle();
      if (!camp) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
      const nextConv = !camp.conversion_tracking_active;
      const { data, error } = await supabase
        .from("ads_campaigns")
        .update({
          conversion_tracking_active: nextConv,
          status: nextConv && camp.budget_approved_by_klaus ? "ativo" : camp.status,
          updated_at: now,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, campaign: data });
    }

    if (action === "add_negative_keyword") {
      const id = Number(body.id);
      const kw = String(body.keyword || "").trim();
      if (!kw) return NextResponse.json({ error: "Palavra-chave obrigatória" }, { status: 400 });
      const { data: camp } = await supabase.from("ads_campaigns").select("*").eq("id", id).maybeSingle();
      if (!camp) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
      const currentNeg: string[] = Array.isArray(camp.negative_keywords_json) ? camp.negative_keywords_json : [];
      if (!currentNeg.includes(kw)) currentNeg.push(kw);
      const { data, error } = await supabase
        .from("ads_campaigns")
        .update({ negative_keywords_json: currentNeg, updated_at: now })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, campaign: data });
    }

    if (action === "audit_ads_ai") {
      const ai = await resolveOpenAiClient(supabase);
      if (!ai.client) {
        return NextResponse.json({ error: "Configure a OpenAI API Key para auditar termos de busca com IA.", aiRequired: true }, { status: 400 });
      }
      const searchTerms = String(body.search_terms || "").trim();
      const { data: campaigns } = await supabase.from("ads_campaigns").select("id, name, channel, negative_keywords_json");

      const completion = await ai.client.chat.completions.create({
        model: ai.model,
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          { role: "system", content: TARGET_COMPLIANCE_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Audite os termos de busca / campanhas abaixo seguindo a revisão semanal do Plano de Ação Target Relocation.\nRegra rígida: vistos temporários/agrícolas EUA (H2A/H2B), visto turismo B1/B2 isolado, mudanças residenciais comuns e transporte de pets ficam NEGATIVADOS.\nCampanhas: ${JSON.stringify(campaigns)}\nTermos informados: ${searchTerms || "Gerar recomendações preventivas de negativas e estrutura exata/frase"}\n\nRetorne JSON:\n{"recommended_negatives": ["termo 1", "..."], "audit_summary": "Análise objetiva", "campaign_actions": ["ação 1", "ação 2"]}`,
          },
        ],
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
      return NextResponse.json({ success: true, audit: parsed });
    }

    if (action === "update_geo_platforms") {
      const id = Number(body.id);
      const updates: Record<string, unknown> = { tested_at: now };
      for (const f of ["chatgpt_cited", "gemini_cited", "perplexity_cited", "google_ai_cited"]) {
        if (body[f] !== undefined) updates[f] = Boolean(body[f]);
      }
      const { data, error } = await supabase.from("geo_audit_tests").update(updates).eq("id", id).select("*").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, test: data });
    }

    if (action === "run_geo_test") {
      const id = Number(body.id);
      const { data: testRow } = await supabase.from("geo_audit_tests").select("*").eq("id", id).maybeSingle();
      if (!testRow) return NextResponse.json({ error: "Pergunta GEO não encontrada" }, { status: 404 });

      const ai = await resolveOpenAiClient(supabase);
      if (!ai.client) {
        return NextResponse.json({ error: "Configure sua OpenAI API Key para rodar o benchmark GEO real.", aiRequired: true }, { status: 400 });
      }

      const { data: posts } = await supabase
        .from("blog_posts")
        .select("slug, title, question_headline, direct_answer, faq_schema_json, status")
        .eq("status", "published");

      const completion = await ai.client.chat.completions.create({
        model: ai.model,
        response_format: { type: "json_object" },
        temperature: 0.25,
        messages: [
          {
            role: "system",
            content: `${TARGET_COMPLIANCE_SYSTEM_PROMPT}\nVocê atua como avaliador especialista em GEO (Generative Engine Optimization). Analise se o acervo atual de artigos publicados da Target Relocation responde diretamente à pergunta do RH no 1º parágrafo, possui FAQ Schema sólido e atende rigor regulatório (MTE / Polícia Federal).`,
          },
          {
            role: "user",
            content: `PERGUNTA DO RH: "${testRow.question}"\nARTIGOS PUBLICADOS ATUALMENTE NA TARGET:\n${JSON.stringify(posts || [])}\n\nRetorne JSON:\n{\n  "openai_audit_score": 0-100,\n  "chatgpt_cited_simulation": boolean,\n  "ai_response_summary": "Como modelos generativos sintetizam essa dúvida e qual o nível de cobertura atual da Target",\n  "recommendations": "Melhoria concreta de página, FAQ Schema, EuRA / citações externas ou revisão de CTA"\n}`,
          },
        ],
      });

      const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}") as Record<string, unknown>;
      const { data: updated, error } = await supabase
        .from("geo_audit_tests")
        .update({
          openai_audit_score: Number(parsed.openai_audit_score || 60),
          chatgpt_cited: Boolean(parsed.chatgpt_cited_simulation ?? testRow.chatgpt_cited),
          ai_response_summary: String(parsed.ai_response_summary || ""),
          recommendations: String(parsed.recommendations || ""),
          tested_at: now,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, test: updated });
    }

    if (action === "update_kpi") {
      const id = Number(body.id);
      const { data, error } = await supabase
        .from("kpi_snapshots")
        .update({
          current_value: body.current_value !== undefined ? String(body.current_value) : undefined,
          target_value: body.target_value !== undefined ? String(body.target_value) : undefined,
          notes: body.notes !== undefined ? String(body.notes) : undefined,
          updated_at: now,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, kpi: data });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
