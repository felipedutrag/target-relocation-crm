import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, requireWorkspaceUser } from "@/lib/supabase/server";
import { slugifyPt } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const scope = req.nextUrl.searchParams.get("scope") || "published";
    const pillar = req.nextUrl.searchParams.get("pillar") || "all";
    const search = (req.nextUrl.searchParams.get("search") || "").trim();

    if (scope === "all") {
      const auth = await requireWorkspaceUser();
      if (auth.errorResponse) return auth.errorResponse;
      let q = auth.supabase.from("blog_posts").select("*").order("scheduled_date", { ascending: false, nullsFirst: false });
      if (pillar !== "all") q = q.eq("pillar", pillar);
      if (search) q = q.or(`title.ilike.%${search}%,question_headline.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ posts: data || [] });
    }

    const publicClient = createPublicClient();
    let q = publicClient
      .from("blog_posts")
      .select("*")
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

    const { data: post, error } = await auth.supabase
      .from("blog_posts")
      .upsert(
        {
          slug,
          title,
          question_headline: questionHeadline,
          direct_answer: directAnswer,
          content_markdown: contentMarkdown || directAnswer,
          pillar: String(body.pillar || "faq_service"),
          faq_schema_json: faq,
          youtube_embed_url: body.youtube_embed_url ? String(body.youtube_embed_url) : null,
          author_name: String(body.author_name || "Klaus Duailibi"),
          author_role: String(body.author_role || "Diretor • Target Relocation"),
          status,
          technical_reviewed: technicalReviewed,
          scheduled_date: body.scheduled_date ? String(body.scheduled_date) : null,
          utm_campaign: body.utm_campaign ? String(body.utm_campaign) : `blog_${slug.slice(0, 24)}`,
          seo_title: body.seo_title ? String(body.seo_title) : title.slice(0, 60),
          seo_description: body.seo_description ? String(body.seo_description) : directAnswer.slice(0, 155),
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
