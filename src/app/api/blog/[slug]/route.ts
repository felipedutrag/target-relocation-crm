import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, requireWorkspaceUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
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
    const now = new Date().toISOString();

    const updates: Record<string, unknown> = { updated_at: now };
    for (const key of [
      "title",
      "question_headline",
      "direct_answer",
      "content_markdown",
      "pillar",
      "faq_schema_json",
      "youtube_embed_url",
      "technical_reviewed",
      "status",
      "seo_title",
      "seo_description",
      "utm_campaign",
    ]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (updates.status === "published") {
      updates.published_at = now;
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
