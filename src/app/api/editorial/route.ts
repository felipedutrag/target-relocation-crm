import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceUser } from "@/lib/supabase/server";
import { generateOmnichannelPack, resolveOpenAiClient, slugifyPt } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const [itemsRes, postsRes, aiCfg] = await Promise.all([
      supabase.from("editorial_items").select("*").order("scheduled_date", { ascending: true }),
      supabase.from("blog_posts").select("*").order("published_at", { ascending: false, nullsFirst: false }),
      resolveOpenAiClient(supabase),
    ]);

    return NextResponse.json({
      items: itemsRes.data || [],
      posts: postsRes.data || [],
      aiConfigured: Boolean(aiCfg.client),
      aiModel: aiCfg.model,
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
    const action = String(body.action || "update");
    const now = new Date().toISOString();

    if (action === "create") {
      const topic = String(body.topic || "").trim();
      if (!topic) return NextResponse.json({ error: "Assunto/tema obrigatório" }, { status: 400 });
      const sched = String(body.scheduled_date || now.slice(0, 10));
      const d = new Date(`${sched}T12:00:00Z`);
      const dayLabel = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const weekdays = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
      const weekday = String(body.weekday || weekdays[d.getUTCDay()] || "seg");

      const { data, error } = await supabase
        .from("editorial_items")
        .insert({
          scheduled_date: sched,
          day_label: dayLabel,
          weekday,
          format: String(body.format || "News"),
          topic,
          video_plan: String(body.video_plan || "Short"),
          approval_status: "Ideia",
          technical_reviewed: false,
          utm_campaign: `blog_${sched.replace(/-/g, "")}_${slugifyPt(topic).slice(0, 24)}`,
          notes: body.notes ? String(body.notes) : "Pauta semanal adicionada no workspace.",
          updated_at: now,
        })
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, item: data }, { status: 201 });
    }

    if (action === "generate_ai") {
      const itemId = Number(body.id);
      const { data: item } = await supabase.from("editorial_items").select("*").eq("id", itemId).maybeSingle();
      if (!item) return NextResponse.json({ error: "Item editorial não encontrado" }, { status: 404 });

      const ai = await resolveOpenAiClient(supabase);
      if (!ai.client) {
        return NextResponse.json(
          {
            error: "Chave OpenAI API não configurada. Clique em 'Configurar IA' no topo para ativar a geração com OpenAI.",
            aiRequired: true,
          },
          { status: 400 }
        );
      }

      const generated = await generateOmnichannelPack({
        openai: ai.client,
        model: ai.model,
        topic: String(item.topic),
        format: String(item.format),
        videoPlan: String(item.video_plan),
        scheduledDate: String(item.scheduled_date),
        extraInstructions: body.instructions ? String(body.instructions) : undefined,
      });

      const slug = slugifyPt(String(generated.slug || item.topic)) || `artigo-${item.id}`;
      const pillar =
        item.format === "News" ? "news" : item.format === "Institucional" ? "institutional" : "faq_service";

      const { data: blogPost, error: blogErr } = await supabase
        .from("blog_posts")
        .upsert(
          {
            slug,
            title: String(generated.question_headline || item.topic),
            question_headline: String(generated.question_headline || item.topic),
            direct_answer: String(generated.direct_answer || ""),
            content_markdown: String(generated.content_markdown || ""),
            pillar,
            faq_schema_json: Array.isArray(generated.faq_schema) ? generated.faq_schema : [],
            author_name: "Klaus Duailibi",
            author_role: "Diretor • Target Relocation",
            status: "ready_for_approval",
            technical_reviewed: false,
            scheduled_date: item.scheduled_date,
            utm_campaign: item.utm_campaign || `blog_${slug.slice(0, 24)}`,
            seo_title: String(generated.seo_title || item.topic).slice(0, 60),
            seo_description: String(generated.seo_description || generated.direct_answer || "").slice(0, 158),
            updated_at: now,
          },
          { onConflict: "slug" }
        )
        .select("*")
        .single();

      if (blogErr) return NextResponse.json({ error: blogErr.message }, { status: 500 });

      const { data: updatedItem, error: upErr } = await supabase
        .from("editorial_items")
        .update({
          blog_post_id: blogPost?.id ?? null,
          approval_status: "Para Aprovar",
          linkedin_klaus_post: String(generated.linkedin_klaus_post || ""),
          linkedin_first_comment: String(generated.linkedin_first_comment || ""),
          linkedin_target_repost: String(generated.linkedin_target_repost || ""),
          carousel_slides_json: Array.isArray(generated.carousel_slides) ? generated.carousel_slides : [],
          instagram_caption: String(generated.instagram_caption || ""),
          instagram_stories_json: Array.isArray(generated.instagram_stories) ? generated.instagram_stories : [],
          heygen_script: String(generated.heygen_script || ""),
          reels_shorts_cuts_json: Array.isArray(generated.reels_shorts_cuts) ? generated.reels_shorts_cuts : [],
          youtube_metadata_json:
            generated.youtube_metadata && typeof generated.youtube_metadata === "object"
              ? generated.youtube_metadata
              : {},
          sdr_call_angle: String(generated.sdr_call_angle || ""),
          updated_at: now,
        })
        .eq("id", itemId)
        .select("*")
        .single();

      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      return NextResponse.json({ success: true, item: updatedItem, post: blogPost });
    }

    if (action === "approve") {
      const itemId = Number(body.id);
      const { data: item } = await supabase.from("editorial_items").select("*").eq("id", itemId).maybeSingle();
      if (!item) return NextResponse.json({ error: "Pauta não encontrada" }, { status: 404 });

      const { data: updated, error } = await supabase
        .from("editorial_items")
        .update({
          approval_status: "Aprovado",
          technical_reviewed: true,
          approved_by: auth.member.full_name,
          approved_at: now,
          updated_at: now,
        })
        .eq("id", itemId)
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (item.blog_post_id) {
        await supabase
          .from("blog_posts")
          .update({ status: "approved", technical_reviewed: true, updated_at: now })
          .eq("id", item.blog_post_id);
      }
      return NextResponse.json({ success: true, item: updated });
    }

    if (action === "approve_batch") {
      const { data: pending } = await supabase
        .from("editorial_items")
        .select("id, blog_post_id")
        .in("approval_status", ["Para Aprovar", "Em Revisão Técnica"]);
      const ids = (pending || []).map((x) => x.id);
      if (ids.length > 0) {
        await supabase
          .from("editorial_items")
          .update({
            approval_status: "Aprovado",
            technical_reviewed: true,
            approved_by: auth.member.full_name,
            approved_at: now,
            updated_at: now,
          })
          .in("id", ids);

        const postIds = (pending || []).map((x) => x.blog_post_id).filter(Boolean);
        if (postIds.length > 0) {
          await supabase
            .from("blog_posts")
            .update({ status: "approved", technical_reviewed: true, updated_at: now })
            .in("id", postIds);
        }
      }
      return NextResponse.json({ success: true, approvedCount: ids.length });
    }

    if (action === "publish") {
      const itemId = Number(body.id);
      const { data: item } = await supabase.from("editorial_items").select("*").eq("id", itemId).maybeSingle();
      if (!item) return NextResponse.json({ error: "Pauta não encontrada" }, { status: 404 });
      if (item.approval_status !== "Aprovado" && item.approval_status !== "Publicado") {
        return NextResponse.json(
          { error: "Princípio da Aprovação Humana: nenhum post ou artigo sai sem aprovação explícita do Klaus primeiro." },
          { status: 400 }
        );
      }

      if (item.blog_post_id) {
        await supabase
          .from("blog_posts")
          .update({
            status: "published",
            technical_reviewed: true,
            published_at: now,
            updated_at: now,
          })
          .eq("id", item.blog_post_id);
      }

      const { data: updated, error } = await supabase
        .from("editorial_items")
        .update({ approval_status: "Publicado", updated_at: now })
        .eq("id", itemId)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, item: updated });
    }

    // Generic field update (linkedin post, heygen script, technical_reviewed, youtube embed back to blog)
    const itemId = Number(body.id);
    const updates: Record<string, unknown> = { updated_at: now };
    for (const key of [
      "approval_status",
      "technical_reviewed",
      "linkedin_klaus_post",
      "linkedin_first_comment",
      "linkedin_target_repost",
      "instagram_caption",
      "heygen_script",
      "sdr_call_angle",
      "notes",
      "published_channels_json",
    ]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const { data: updated, error } = await supabase
      .from("editorial_items")
      .update(updates)
      .eq("id", itemId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (body.youtube_embed_url !== undefined && updated?.blog_post_id) {
      await supabase
        .from("blog_posts")
        .update({ youtube_embed_url: body.youtube_embed_url ? String(body.youtube_embed_url) : null, updated_at: now })
        .eq("id", updated.blog_post_id);
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
