import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, requireWorkspaceUser } from "@/lib/supabase/server";
import { slugifyPt } from "@/lib/openai";
import { analyzeArticleSeo } from "@/lib/seo-analyzer";

export const dynamic = "force-dynamic";

const LIST_COLS =
  "id, slug, en_slug, es_slug, canonical_path, wp_post_id, title, question_headline, direct_answer, pillar, category, featured_image_url, featured_image_alt, focus_keyword, seo_title, seo_description, seo_score, readability_score, seo_grade, seo_checks_json, word_count, reading_time_min, status, technical_reviewed, youtube_embed_url, author_name, published_at, updated_at, source_url";

export async function GET(req: NextRequest) {
  try {
    const scope = req.nextUrl.searchParams.get("scope") || "published";
    const pillar = req.nextUrl.searchParams.get("pillar") || "all";
    const search = (req.nextUrl.searchParams.get("search") || "").trim();

    if (scope === "all") {
      const auth = await requireWorkspaceUser();
      if (auth.errorResponse) return auth.errorResponse;
      let q = auth.supabase
        .from("blog_posts")
        .select(LIST_COLS)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false });
      if (pillar !== "all") q = q.eq("pillar", pillar);
      if (search) q = q.or(`title.ilike.%${search}%,question_headline.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ posts: data || [] });
    }

    const publicClient = createPublicClient();
    let q = publicClient
      .from("blog_posts")
      .select(LIST_COLS)
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (pillar !== "all") q = q.eq("pillar", pillar);
    if (search) q = q.or(`title.ilike.%${search}%,question_headline.ilike.%${search}%`);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ posts: data || [] });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;

    const body = (await req.json()) as Record<string, unknown>;
    const title = String(body.title || "").trim();
    const questionHeadline = String(body.question_headline || title).trim();
    const directAnswer = String(body.direct_answer || "").trim();
    const contentMarkdown = String(body.content_markdown || "").trim();
    if (!title || !directAnswer) {
      return NextResponse.json({ error: "Título e resposta direta GEO no 1º parágrafo são obrigatórios." }, { status: 400 });
    }

    const slug = slugifyPt(String(body.slug || title)) || `artigo-${Date.now()}`;
    const faq = Array.isArray(body.faq_schema_json) ? body.faq_schema_json : [];
    const status = String(body.status || "ready_for_approval");
    const technicalReviewed = Boolean(body.technical_reviewed);
    const now = new Date().toISOString();

    if (status === "published" && !technicalReviewed) {
      return NextResponse.json(
        { error: "Todo artigo técnico precisa de revisão técnica e aprovação humana antes de publicar." },
        { status: 400 }
      );
    }

    const seoTitle = body.seo_title ? String(body.seo_title) : title.slice(0, 60);
    const seoDesc = body.seo_description ? String(body.seo_description) : directAnswer.slice(0, 155);
    const authorName = String(body.author_name || "Klaus Duailibi");
    const seoRes = analyzeArticleSeo({
      slug,
      title,
      question_headline: questionHeadline,
      seo_title: seoTitle,
      seo_description: seoDesc,
      focus_keyword: body.focus_keyword ? String(body.focus_keyword) : null,
      direct_answer: directAnswer,
      content_markdown: contentMarkdown || directAnswer,
      featured_image_url: body.featured_image_url ? String(body.featured_image_url) : null,
      featured_image_alt: body.featured_image_alt ? String(body.featured_image_alt) : null,
      faq_schema_json: faq,
      author_name: authorName,
    });

    const { data: post, error } = await auth.supabase
      .from("blog_posts")
      .upsert(
        {
          slug,
          canonical_path: body.canonical_path ? String(body.canonical_path) : `/blog/${slug}`,
          title,
          question_headline: questionHeadline,
          direct_answer: directAnswer,
          content_markdown: contentMarkdown || directAnswer,
          pillar: String(body.pillar || "faq_service"),
          category: body.category ? String(body.category) : "Guias Técnicos GEO",
          featured_image_url: body.featured_image_url ? String(body.featured_image_url) : null,
          featured_image_alt: body.featured_image_alt ? String(body.featured_image_alt) : null,
          faq_schema_json: faq,
          youtube_embed_url: body.youtube_embed_url ? String(body.youtube_embed_url) : null,
          author_name: authorName,
          author_role: String(body.author_role || "Diretor • Target Relocation"),
          status,
          technical_reviewed: technicalReviewed,
          scheduled_date: body.scheduled_date ? String(body.scheduled_date) : null,
          utm_campaign: body.utm_campaign ? String(body.utm_campaign) : `blog_${slug.slice(0, 24)}`,
          seo_title: seoTitle,
          seo_description: seoDesc,
          focus_keyword: seoRes.focusKeyword,
          word_count: seoRes.wordCount,
          reading_time_min: seoRes.readingTimeMin,
          seo_score: seoRes.seoScore,
          readability_score: seoRes.readabilityScore,
          seo_grade: seoRes.seoGrade,
          seo_checks_json: seoRes.checks,
          published_at: status === "published" ? now : null,
          updated_at: now,
        },
        { onConflict: "slug" }
      )
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
