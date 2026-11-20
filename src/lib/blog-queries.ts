import { createPublicClient } from "@/lib/supabase/server";

export type BlogLocale = "pt" | "en" | "es";

export interface BlogTranslationBlock {
  slug?: string | null;
  title?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  direct_answer?: string | null;
  content_html?: string | null;
}

export interface PublicBlogIndexItem {
  id: number;
  slug: string;
  en_slug: string | null;
  es_slug: string | null;
  canonical_path: string;
  href: string;
  title: string;
  question_headline: string;
  direct_answer: string;
  pillar: string;
  category: string;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  author_name: string;
  author_role: string;
  reading_time_min: number;
  word_count: number;
  published_at: string | null;
  updated_at: string;
  utm_campaign: string | null;
}

export interface PublicBlogArticle extends PublicBlogIndexItem {
  content_markdown: string;
  content_html: string | null;
  faq_schema_json: Array<{ question: string; answer: string }>;
  youtube_embed_url: string | null;
  technical_reviewed: boolean;
  seo_title: string | null;
  seo_description: string | null;
  focus_keyword: string | null;
  wp_post_id: number | null;
  translations_json: Partial<Record<"en" | "es", BlogTranslationBlock>>;
}

export interface LandingBlogPreview {
  id: number;
  title: string;
  href: string;
  direct_answer: string;
  category: string;
  featured_image_url: string | null;
  reading_time_min: number;
  updated_at: string;
}

function getPtCanonicalPath(row: {
  slug: string;
  canonical_path?: string | null;
  wp_post_id?: number | null;
}): string {
  if (row.canonical_path?.trim()) return row.canonical_path.trim();
  return row.wp_post_id ? `/${row.slug}` : `/blog/${row.slug}`;
}

export function getLocalizedHref(
  row: { slug: string; en_slug?: string | null; es_slug?: string | null; canonical_path?: string | null; wp_post_id?: number | null },
  locale: BlogLocale
): string {
  if (locale === "en") return `/en/${row.en_slug || row.slug}`;
  if (locale === "es") return `/es/${row.es_slug || row.slug}`;
  return getPtCanonicalPath(row);
}

/** Fetches the lightweight published blog index (194+ posts) localized to PT/EN/ES without large HTML blobs. */
export async function getPublishedBlogIndex(locale: BlogLocale): Promise<PublicBlogIndexItem[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, slug, en_slug, es_slug, canonical_path, wp_post_id, title, question_headline, direct_answer, pillar, category, featured_image_url, featured_image_alt, author_name, author_role, reading_time_min, word_count, published_at, updated_at, utm_campaign, translations_json"
      )
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(500);

    if (error || !data) return [];

    return data.map((row) => {
      const tr =
        locale === "en" || locale === "es"
          ? ((row.translations_json as Record<string, BlogTranslationBlock> | null)?.[locale] ?? null)
          : null;

      const localizedTitle = tr?.title?.trim() || row.question_headline || row.title;
      const localizedAnswer = tr?.direct_answer?.trim() || row.direct_answer;
      const canonical = getPtCanonicalPath(row);

      return {
        id: row.id,
        slug: row.slug,
        en_slug: row.en_slug || null,
        es_slug: row.es_slug || null,
        canonical_path: canonical,
        href: getLocalizedHref(row, locale),
        title: localizedTitle,
        question_headline: localizedTitle,
        direct_answer: localizedAnswer,
        pillar: row.pillar || "faq_service",
        category: row.category || "Imigração Corporativa",
        featured_image_url: row.featured_image_url || null,
        featured_image_alt: row.featured_image_alt || localizedTitle,
        author_name: row.author_name || "Klaus Duailibi",
        author_role: row.author_role || "Target Relocation",
        reading_time_min: row.reading_time_min || 3,
        word_count: row.word_count || 0,
        published_at: row.published_at || null,
        updated_at: row.updated_at,
        utm_campaign: row.utm_campaign || null,
      };
    });
  } catch {
    return [];
  }
}

/** Resolves a published blog post by its exact PT, EN, or ES slug plus 3 related posts in the same category. */
export async function getPublishedPostBySlug(
  slug: string,
  locale: BlogLocale
): Promise<{ post: PublicBlogArticle; related: PublicBlogIndexItem[] } | null> {
  try {
    const cleanSlug = decodeURIComponent(slug).replace(/^\/+|\/+$/g, "");
    const supabase = createPublicClient();

    let row: Record<string, unknown> | null = null;
    if (locale === "en") {
      const { data: byEn } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("en_slug", cleanSlug)
        .eq("status", "published")
        .maybeSingle();
      row = byEn;
    } else if (locale === "es") {
      const { data: byEs } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("es_slug", cleanSlug)
        .eq("status", "published")
        .maybeSingle();
      row = byEs;
    }

    if (!row) {
      const { data: bySlug } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", cleanSlug)
        .eq("status", "published")
        .maybeSingle();
      row = bySlug;
    }

    if (!row) return null;

    const tr =
      locale === "en" || locale === "es"
        ? ((row.translations_json as Record<string, BlogTranslationBlock> | null)?.[locale] ?? null)
        : null;

    const ptCanonical = getPtCanonicalPath(row as { slug: string; canonical_path?: string; wp_post_id?: number | null });
    const localizedTitle = tr?.title?.trim() || String(row.question_headline || row.title);
    const localizedAnswer = tr?.direct_answer?.trim() || String(row.direct_answer || "");
    const localizedHtml = tr?.content_html?.trim() || (row.content_html ? String(row.content_html) : null);

    const post: PublicBlogArticle = {
      id: Number(row.id),
      slug: String(row.slug),
      en_slug: row.en_slug ? String(row.en_slug) : null,
      es_slug: row.es_slug ? String(row.es_slug) : null,
      canonical_path: ptCanonical,
      href: getLocalizedHref(
        {
          slug: String(row.slug),
          en_slug: row.en_slug ? String(row.en_slug) : null,
          es_slug: row.es_slug ? String(row.es_slug) : null,
          canonical_path: ptCanonical,
          wp_post_id: row.wp_post_id ? Number(row.wp_post_id) : null,
        },
        locale
      ),
      title: localizedTitle,
      question_headline: localizedTitle,
      direct_answer: localizedAnswer,
      content_markdown: String(row.content_markdown || ""),
      content_html: localizedHtml,
      pillar: String(row.pillar || "faq_service"),
      category: String(row.category || "Imigração Corporativa"),
      featured_image_url: row.featured_image_url ? String(row.featured_image_url) : null,
      featured_image_alt: row.featured_image_alt ? String(row.featured_image_alt) : localizedTitle,
      faq_schema_json: Array.isArray(row.faq_schema_json)
        ? (row.faq_schema_json as Array<{ question: string; answer: string }>)
        : [],
      youtube_embed_url: row.youtube_embed_url ? String(row.youtube_embed_url) : null,
      author_name: String(row.author_name || "Klaus Duailibi"),
      author_role: String(row.author_role || "Target Relocation"),
      reading_time_min: Number(row.reading_time_min || 3),
      word_count: Number(row.word_count || 0),
      technical_reviewed: Boolean(row.technical_reviewed),
      seo_title: tr?.seo_title?.trim() || (row.seo_title ? String(row.seo_title) : localizedTitle),
      seo_description:
        tr?.seo_description?.trim() || (row.seo_description ? String(row.seo_description) : localizedAnswer),
      focus_keyword: row.focus_keyword ? String(row.focus_keyword) : null,
      wp_post_id: row.wp_post_id ? Number(row.wp_post_id) : null,
      published_at: row.published_at ? String(row.published_at) : null,
      updated_at: String(row.updated_at),
      utm_campaign: row.utm_campaign ? String(row.utm_campaign) : null,
      translations_json: (row.translations_json as Partial<Record<"en" | "es", BlogTranslationBlock>>) || {},
    };

    const { data: relatedRows } = await supabase
      .from("blog_posts")
      .select(
        "id, slug, en_slug, es_slug, canonical_path, wp_post_id, title, question_headline, direct_answer, pillar, category, featured_image_url, featured_image_alt, author_name, author_role, reading_time_min, word_count, published_at, updated_at, utm_campaign, translations_json"
      )
      .eq("status", "published")
      .eq("category", post.category)
      .neq("id", post.id)
      .order("published_at", { ascending: false })
      .limit(3);

    const related: PublicBlogIndexItem[] = (relatedRows || []).map((r) => {
      const rTr =
        locale === "en" || locale === "es"
          ? ((r.translations_json as Record<string, BlogTranslationBlock> | null)?.[locale] ?? null)
          : null;
      const rTitle = rTr?.title?.trim() || r.question_headline || r.title;
      return {
        id: r.id,
        slug: r.slug,
        en_slug: r.en_slug || null,
        es_slug: r.es_slug || null,
        canonical_path: getPtCanonicalPath(r),
        href: getLocalizedHref(r, locale),
        title: rTitle,
        question_headline: rTitle,
        direct_answer: rTr?.direct_answer?.trim() || r.direct_answer,
        pillar: r.pillar || "faq_service",
        category: r.category || "Imigração Corporativa",
        featured_image_url: r.featured_image_url || null,
        featured_image_alt: r.featured_image_alt || rTitle,
        author_name: r.author_name || "Klaus Duailibi",
        author_role: r.author_role || "Target Relocation",
        reading_time_min: r.reading_time_min || 3,
        word_count: r.word_count || 0,
        published_at: r.published_at || null,
        updated_at: r.updated_at,
        utm_campaign: r.utm_campaign || null,
      };
    });

    return { post, related };
  } catch {
    return null;
  }
}

/** Fetches the top latest published blog posts for the home landing page cards. */
export async function getLatestLandingPosts(limit = 3): Promise<LandingBlogPreview[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, slug, canonical_path, wp_post_id, title, question_headline, direct_answer, category, featured_image_url, reading_time_min, updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id,
      title: r.question_headline || r.title,
      href: getPtCanonicalPath(r),
      direct_answer: r.direct_answer,
      category: r.category || "Imigração Corporativa",
      featured_image_url: r.featured_image_url || null,
      reading_time_min: r.reading_time_min || 4,
      updated_at: r.updated_at,
    }));
  } catch {
    return [];
  }
}
