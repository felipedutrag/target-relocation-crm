import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, requireWorkspaceUser } from "@/lib/supabase/server";
import { resolveOpenAiClient, TARGET_COMPLIANCE_SYSTEM_PROMPT } from "@/lib/openai";
import { analyzeArticleSeo } from "@/lib/seo-analyzer";
import { MIN_PUBLISH_WORDS } from "@/lib/editorial-guardrails";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const scope = req.nextUrl.searchParams.get("scope") || "published";

    if (scope === "all") {
      const auth = await requireWorkspaceUser();
      if (auth.errorResponse) return auth.errorResponse;
      const { data: post, error } = await auth.supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!post) return NextResponse.json({ error: "Artigo não encontrado" }, { status: 404 });
      return NextResponse.json({ post });
    }

    const publicClient = createPublicClient();
    const { data: post } = await publicClient
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (!post) {
      return NextResponse.json({ error: "Artigo não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;

    const { slug } = await context.params;
    const body = (await req.json()) as Record<string, unknown>;

    const { data: current } = await auth.supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (!current) {
      return NextResponse.json({ error: "Artigo não encontrado" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updated_at: now };

    for (const key of [
      "title",
      "question_headline",
      "direct_answer",
      "content_markdown",
      "content_html",
      "pillar",
      "category",
      "featured_image_url",
      "featured_image_alt",
      "faq_schema_json",
      "youtube_embed_url",
      "technical_reviewed",
      "status",
      "seo_title",
      "seo_description",
      "focus_keyword",
      "en_slug",
      "es_slug",
      "canonical_path",
      "utm_campaign",
    ]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (updates.status === "published" && !current.published_at) {
      updates.published_at = now;
    }

    const merged = { ...current, ...updates };
    const seoRes = analyzeArticleSeo({
      slug: merged.slug,
      title: merged.title,
      question_headline: merged.question_headline,
      seo_title: merged.seo_title,
      seo_description: merged.seo_description,
      focus_keyword: merged.focus_keyword,
      direct_answer: merged.direct_answer,
      content_html: merged.content_html,
      content_markdown: merged.content_markdown,
      featured_image_url: merged.featured_image_url,
      featured_image_alt: merged.featured_image_alt,
      faq_schema_json: merged.faq_schema_json,
      author_name: merged.author_name,
    });

    updates.focus_keyword = merged.focus_keyword || seoRes.focusKeyword;
    updates.word_count = seoRes.wordCount;
    updates.reading_time_min = seoRes.readingTimeMin;
    updates.seo_score = seoRes.seoScore;
    updates.readability_score = seoRes.readabilityScore;
    updates.seo_grade = seoRes.seoGrade;
    updates.seo_checks_json = seoRes.checks;

    if (updates.status === "published" && seoRes.wordCount < MIN_PUBLISH_WORDS) {
      return NextResponse.json(
        {
          error: `Publicação bloqueada: artigo possui ${seoRes.wordCount} palavras. Mínimo exigido para publicar: ${MIN_PUBLISH_WORDS} palavras.`,
        },
        { status: 400 }
      );
    }

    const { data, error } = await auth.supabase
      .from("blog_posts")
      .update(updates)
      .eq("slug", slug)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, post: data });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;

    const { slug } = await context.params;
    const body = (await req.json()) as { action?: string };
    if (body.action !== "optimize_seo") {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }

    const { data: post } = await auth.supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (!post) {
      return NextResponse.json({ error: "Artigo não encontrado" }, { status: 404 });
    }

    const ai = await resolveOpenAiClient(auth.supabase);
    if (!ai.client) {
      return NextResponse.json(
        { error: "OpenAI API Key não configurada. Acesse Config IA para ativar a otimização Yoast com GPT." },
        { status: 400 }
      );
    }

    const excerptContext = String(post.direct_answer || post.content_markdown || "").slice(0, 1800);
    const completion = await ai.client.chat.completions.create({
      model: ai.model,
      response_format: { type: "json_object" },
      temperature: 0.3,
      messages: [
        { role: "system", content: TARGET_COMPLIANCE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Otimize os metadados Yoast SEO & GEO (SEM alterar o slug /${post.slug}) para este artigo da Target Relocation:
TÍTULO ATUAL: "${post.title}"
SLUG FIXO: "${post.slug}"
CATEGORIA: "${post.category || "Imigração Corporativa"}"
RESUMO/TEXTO BASE:
${excerptContext}

Retorne estritamente JSON válido com:
{
  "focus_keyword": "palavra-chave foco com 2 a 4 palavras presentes no slug/título",
  "seo_title": "Título SEO de 45 a 58 caracteres com a palavra-chave foco logo no início",
  "seo_description": "Meta description de 130 a 155 caracteres contendo a palavra-chave foco e CTA consultivo",
  "featured_image_alt": "Texto ALT descritivo da imagem de capa contendo a palavra-chave foco",
  "direct_answer": "Parágrafo direto GEO (3-4 linhas) contendo a palavra-chave foco e órgãos competentes (MTE/PF/Consulado quando aplicável), sem prometer aprovação fácil",
  "faq_schema_json": [
    { "question": "Pergunta objetiva 1?", "answer": "Resposta técnica objetiva 1." },
    { "question": "Pergunta objetiva 2?", "answer": "Resposta técnica objetiva 2." },
    { "question": "Pergunta objetiva 3?", "answer": "Resposta técnica objetiva 3." },
    { "question": "Pergunta objetiva 4?", "answer": "Resposta técnica objetiva 4." }
  ]
}`,
        },
      ],
    });

    const suggested = JSON.parse(completion.choices[0]?.message?.content || "{}") as Record<string, unknown>;
    const preview = analyzeArticleSeo({
      slug: post.slug,
      title: post.title,
      question_headline: post.question_headline,
      seo_title: String(suggested.seo_title || post.seo_title || post.title),
      seo_description: String(suggested.seo_description || post.seo_description || post.direct_answer),
      focus_keyword: String(suggested.focus_keyword || post.focus_keyword || ""),
      direct_answer: String(suggested.direct_answer || post.direct_answer || ""),
      content_html: post.content_html,
      content_markdown: post.content_markdown,
      featured_image_url: post.featured_image_url,
      featured_image_alt: String(suggested.featured_image_alt || post.featured_image_alt || ""),
      faq_schema_json: Array.isArray(suggested.faq_schema_json) ? suggested.faq_schema_json : post.faq_schema_json,
      author_name: post.author_name,
    });

    return NextResponse.json({ success: true, suggested, preview });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
