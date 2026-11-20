import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";

export const TARGET_COMPLIANCE_SYSTEM_PROMPT = `Você é o Núcleo de Inteligência Estratégica, GEO/SEO e Receita da Target Relocation (assessoria corporativa especializada em Imigração Corporativa e Global Mobility no Brasil e Américas: Brasil, México, EUA, Argentina e Chile).

REGRAS EDITORIAL E REGULATÓRIAS INVIOLÁVEIS (Plano de Ação Comercial e Digital):
1. Imigração NUNCA soa simples, rápida, fácil ou garantida. Jamais prometa aprovação automática ou prazos sem análise documental.
2. Sempre deixe explícito o rigor técnico, os riscos de conformidade e que pedidos de autorização de residência passam por análise do Ministério do Trabalho e Emprego (MTE / Coordenação-Geral de Imigração Laboral) e posterior registro na Polícia Federal (RNM), quando aplicável ao Brasil.
3. Objetivo de todo conteúdo: educar executivos de RH e Global Mobility de multinacionais para gerar reuniões qualificadas.
4. Tom por canal:
   - LinkedIn do Klaus Duailibi + Blog GEO: autoridade sênior B2B, preciso, técnico e consultivo. No LinkedIn, o link do artigo SEMPRE vai no 1º comentário com UTM (nunca no corpo do post, para não perder alcance).
   - Instagram: humano, prova social, bastidores anonimizados e acolhimento para expatriados e famílias.
   - Google Ads / LinkedIn ABM: foco em mobilidade corporativa (vistos temporários/agrícolas H2A/H2B dos EUA e transporte isolado de pets ficam FORA do escopo).`;

export interface OpenAiRuntimeConfig {
  client: OpenAI | null;
  apiKey: string | null;
  model: string;
  source: "env" | "workspace_settings" | "none";
}

export async function resolveOpenAiClient(supabase?: SupabaseClient): Promise<OpenAiRuntimeConfig> {
  const envKey = process.env.OPENAI_API_KEY?.trim();
  let dbKey: string | null = null;
  let dbModel = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  if (supabase) {
    try {
      const { data } = await supabase
        .from("workspace_settings")
        .select("key, value")
        .in("key", ["openai_api_key", "openai_model"]);
      for (const row of data || []) {
        if (row.key === "openai_api_key" && row.value?.trim()) {
          dbKey = row.value.trim();
        }
        if (row.key === "openai_model" && row.value?.trim()) {
          dbModel = row.value.trim();
        }
      }
    } catch {
      // Non-admin roles cannot read workspace_settings under RLS; relies on env OPENAI_API_KEY
    }
  }

  const finalKey = envKey || dbKey;
  if (!finalKey) {
    return { client: null, apiKey: null, model: dbModel, source: "none" };
  }

  return {
    client: new OpenAI({ apiKey: finalKey }),
    apiKey: finalKey,
    model: dbModel,
    source: envKey ? "env" : "workspace_settings",
  };
}

export function slugifyPt(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export async function generateOmnichannelPack(params: {
  openai: OpenAI;
  model: string;
  topic: string;
  format: string;
  videoPlan: string;
  scheduledDate: string;
  extraInstructions?: string;
}) {
  const { openai, model, topic, format, videoPlan, scheduledDate, extraInstructions } = params;
  const utmCampaign = `blog_${scheduledDate.replace(/-/g, "")}_${slugifyPt(topic).slice(0, 28)}`;

  const prompt = `Crie um pacote completo "1 artigo no blog -> todos os canais" seguindo o Plano de Ação Comercial e Digital da Target Relocation.
TEMA: "${topic}"
FORMATO: "${format}"
PLANO DE VÍDEO: "${videoPlan}"
DATA PREVISTA: ${scheduledDate}
UTM CAMPAIGN SUGERIDA: ${utmCampaign}
${extraInstructions ? `INSTRUÇÕES ADICIONAIS: ${extraInstructions}` : ""}

Retorne ESTRITAMENTE um JSON válido com as seguintes chaves:
{
  "slug": "slug-url-limpo",
  "question_headline": "Título principal em formato de pergunta que um diretor de RH faz ao ChatGPT/Google",
  "direct_answer": "Parágrafo de resposta direta, objetiva e tecnicamente correta (3-5 linhas) citando órgãos competentes como Ministério do Trabalho / Polícia Federal quando aplicável, ideal para citações GEO",
  "seo_title": "Título SEO até 60 chars",
  "seo_description": "Meta description 140-160 chars",
  "content_markdown": "Artigo completo em Markdown com H2/H3, checklist documental, prazos realistas sem prometer facilidade, etapas perante MTE e consulado/PF, riscos de não conformidade e CTA consultivo para reunião",
  "faq_schema": [
    { "question": "Pergunta 1", "answer": "Resposta técnica objetiva 1" },
    { "question": "Pergunta 2", "answer": "Resposta técnica objetiva 2" },
    { "question": "Pergunta 3", "answer": "Resposta técnica objetiva 3" },
    { "question": "Pergunta 4", "answer": "Resposta técnica objetiva 4" }
  ],
  "linkedin_klaus_post": "Post autoral em 1ª pessoa do Klaus Duailibi voltado para RH & Global Mobility (SEM links no corpo! Máximo ~1300 chars, gancho forte nas 2 primeiras linhas)",
  "linkedin_first_comment": "Texto do 1º comentário com o link completo /blog/<slug>?utm_source=linkedin&utm_medium=klaus_profile&utm_campaign=${utmCampaign}",
  "linkedin_target_repost": "Texto curto institucional para repost na Company Page da Target Relocation",
  "carousel_slides": [
    { "slide": 1, "headline": "Capa do carrossel", "body": "Subtítulo direto para slide 1" },
    { "slide": 2, "headline": "...", "body": "..." },
    { "slide": 3, "headline": "...", "body": "..." },
    { "slide": 4, "headline": "...", "body": "..." },
    { "slide": 5, "headline": "...", "body": "..." },
    { "slide": 6, "headline": "CTA Reunião Técnica", "body": "..." }
  ],
  "instagram_caption": "Legenda empática e clara para expatriados, famílias e RH que visitam o perfil",
  "instagram_stories": ["Story 1: gancho/enquete", "Story 2: ponto de atenção regulatório", "Story 3: link com UTM para guia completo"],
  "heygen_script": "Roteiro completo falado de 3 a 5 minutos para o avatar do Klaus no HeyGen (tom natural, executivo, sem promessas fáceis)",
  "reels_shorts_cuts": [
    { "title": "Corte 1 (Gancho 45s)", "hook": "...", "script": "..." },
    { "title": "Corte 2 (Erro comum RH 45s)", "hook": "...", "script": "..." },
    { "title": "Corte 3 (Documentação e MTE 45s)", "hook": "...", "script": "..." }
  ],
  "youtube_metadata": {
    "title": "Título YouTube otimizado",
    "description": "Descrição YouTube com link UTM e resumo técnico",
    "chapters": ["00:00 Contexto para RH", "00:50 Requisitos Legais no MTE", "02:10 Documentação e Prazos", "03:30 Próximos Passos"]
  },
  "sdr_call_angle": "2 frases práticas de abertura/argumento para Áurea e Anderley usarem nas ligações desta semana"
}`;

  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    temperature: 0.4,
    messages: [
      { role: "system", content: TARGET_COMPLIANCE_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  return JSON.parse(raw) as Record<string, unknown>;
}
