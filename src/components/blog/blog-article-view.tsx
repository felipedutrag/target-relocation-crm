import Link from "next/link";
import { ArrowRight, Calendar, CheckCircle2, Clock, Home, PlayCircle, ShieldCheck, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BlogSiteChrome } from "@/components/blog/blog-site-chrome";
import { SITE_URL } from "@/lib/site-url";
import { BlogLeadCta } from "@/components/blog/blog-lead-cta";
import type { BlogLocale, PublicBlogArticle, PublicBlogIndexItem } from "@/lib/blog-queries";

const ARTICLE_UI = {
  pt: {
    dateLocale: "pt-BR",
    updated: "Atualizado em",
    reviewed: "Revisado Tecnicamente",
    directBox: "Resposta Direta • Escopo Legal e Órgãos Competentes",
    videoLabel: "Explicação em Vídeo — Klaus Duailibi (YouTube)",
    faqTitle: "Perguntas Frequentes (FAQ)",
    relatedTitle: "Artigos Relacionados",
    viewAll: "Ver todos os artigos",
    readArticle: "Ler artigo",
  },
  en: {
    dateLocale: "en-US",
    updated: "Updated on",
    reviewed: "Technically Reviewed",
    directBox: "Direct Answer • Legal Scope & Competent Authorities",
    videoLabel: "Video Briefing — Klaus Duailibi (YouTube)",
    faqTitle: "Frequently Asked Questions (FAQ)",
    relatedTitle: "Related Articles",
    viewAll: "View all articles",
    readArticle: "Read article",
  },
  es: {
    dateLocale: "es-MX",
    updated: "Actualizado el",
    reviewed: "Revisado Técnicamente",
    directBox: "Respuesta Directa • Alcance Legal y Autoridades Competentes",
    videoLabel: "Explicación en Video — Klaus Duailibi (YouTube)",
    faqTitle: "Preguntas Frecuentes (FAQ)",
    relatedTitle: "Artículos Relacionados",
    viewAll: "Ver todos los artículos",
    readArticle: "Leer artículo",
  },
} as const;

function getYoutubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  if (trimmed.includes("/embed/")) return trimmed;
  return null;
}

function renderMarkdownBlocks(markdown: string) {
  const lines = markdown.split("\n");
  const blocks: Array<{ type: string; text: string }> = [];
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    if (line.startsWith("### ")) blocks.push({ type: "h3", text: line.slice(4) });
    else if (line.startsWith("## ")) blocks.push({ type: "h2", text: line.slice(3) });
    else if (line.startsWith("> ")) blocks.push({ type: "quote", text: line.slice(2) });
    else if (/^(\d+\.|-|\*)\s+/.test(line)) blocks.push({ type: "li", text: line.replace(/^(\d+\.|-|\*)\s+/, "") });
    else blocks.push({ type: "p", text: line });
  }
  return blocks;
}

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, idx) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={idx} className="font-semibold text-zinc-950">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={idx}>{p}</span>
    )
  );
}

export function BlogArticleView({
  post,
  related,
  locale,
}: {
  post: PublicBlogArticle;
  related: PublicBlogIndexItem[];
  locale: BlogLocale;
}) {
  const ui = ARTICLE_UI[locale];
  const siteUrl = SITE_URL;
  const ptHref = post.canonical_path || `/${post.slug}`;
  const enHref = post.en_slug ? `/en/${post.en_slug}` : `/en/${post.slug}`;
  const esHref = post.es_slug ? `/es/${post.es_slug}` : `/es/${post.slug}`;
  const updatedStr = new Date(post.updated_at || post.published_at || Date.now()).toLocaleDateString(ui.dateLocale);
  const embedUrl = getYoutubeEmbedUrl(post.youtube_embed_url);

  const hasHtml = Boolean(post.content_html && post.content_html.trim().length > 20);
  const htmlHasDirectBox = Boolean(post.content_html?.includes("resposta-direta"));
  const blocks = hasHtml ? [] : renderMarkdownBlocks(post.content_markdown || "");

  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seo_description || post.direct_answer,
    image: post.featured_image_url ? [post.featured_image_url] : undefined,
    datePublished: post.published_at || post.updated_at,
    dateModified: post.updated_at || post.published_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}${post.href}`,
    },
    author: {
      "@type": "Person",
      name: post.author_name || "Klaus Duailibi",
      jobTitle: post.author_role || "Target Relocation",
    },
    publisher: {
      "@type": "Organization",
      name: "Target Relocation",
    },
  };

  const jsonLdFaq =
    post.faq_schema_json.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faq_schema_json.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer,
            },
          })),
        }
      : null;

  const blogIndexPath = locale === "en" ? "/en/blog" : locale === "es" ? "/es/blog" : "/blog";
  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}${blogIndexPath}` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${siteUrl}${post.href}` },
    ],
  };

  return (
    <BlogSiteChrome locale={locale} alternateHrefs={{ pt: ptHref, en: enHref, es: esHref }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />
      {jsonLdFaq && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
      )}

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-zinc-900">
            <Home className="size-3.5" />
            Home
          </Link>
          <span>/</span>
          <Link href={blogIndexPath} className="hover:text-zinc-900">
            Blog
          </Link>
          <span>/</span>
          <span className="truncate max-w-[260px] sm:max-w-md text-zinc-800 font-medium">{post.title}</span>
        </nav>

        <article className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-7">
          {/* Header Metadata */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <Badge variant="outline" className="bg-zinc-50 border-zinc-200 text-zinc-700 max-w-full">
                <span className="truncate">{post.category || "Guia Técnico GEO"}</span>
              </Badge>
              <span className="inline-flex items-center gap-1 text-zinc-500 font-mono text-[11px]">
                <Calendar className="size-3.5 shrink-0" />
                {ui.updated} {updatedStr}
              </span>
              <span className="inline-flex items-center gap-1 text-zinc-500 font-mono text-[11px]">
                <Clock className="size-3.5 shrink-0" />
                {post.reading_time_min} min
              </span>
              {post.technical_reviewed && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                  <CheckCircle2 className="size-3 shrink-0" />
                  {ui.reviewed}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-semibold tracking-[-0.03em] text-zinc-950 leading-[1.18]">
              {post.title}
            </h1>

            <div className="flex items-center gap-3 pt-1">
              <div className="flex size-9 items-center justify-center rounded-full bg-zinc-950 text-white text-xs font-semibold">
                {post.author_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-950">
                  <UserCheck className="size-3.5 text-emerald-600" />
                  <span>{post.author_name || "Klaus Duailibi"}</span>
                </div>
                <div className="text-[11px] text-zinc-500">{post.author_role || "Target Relocation"}</div>
              </div>
            </div>
          </div>

          {/* Featured Cover Image with fixed 16:9 box to eliminate CLS */}
          {post.featured_image_url && (
            <figure className="aspect-[16/9] w-full max-h-[460px] overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-100">
              <img
                src={post.featured_image_url}
                alt={post.featured_image_alt || post.title}
                width={1200}
                height={675}
                fetchPriority="high"
                className="h-full w-full object-cover"
              />
            </figure>
          )}

          {/* Direct GEO Answer box (shown when not already inside HTML .resposta-direta) */}
          {!htmlHasDirectBox && post.direct_answer && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                {ui.directBox}
              </div>
              <p className="text-sm sm:text-[15px] leading-relaxed font-medium text-zinc-900">{post.direct_answer}</p>
            </div>
          )}

          {/* YouTube Video Embed ("Volta ao blog") */}
          {embedUrl && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                <PlayCircle className="size-4 text-rose-600" />
                <span>{ui.videoLabel}</span>
              </div>
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950">
                <iframe
                  src={embedUrl}
                  title={post.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* Main Content: Rich imported HTML OR native GEO Markdown */}
          {hasHtml ? (
            <div
              className="target-article-prose"
              dangerouslySetInnerHTML={{ __html: post.content_html! }}
            />
          ) : (
            <div className="space-y-4 text-sm sm:text-[15px] leading-relaxed text-zinc-700">
              {blocks.map((b, i) => {
                if (b.type === "h2") {
                  return (
                    <h2 key={i} className="pt-4 text-xl font-semibold tracking-tight text-zinc-950">
                      {renderInlineBold(b.text)}
                    </h2>
                  );
                }
                if (b.type === "h3") {
                  return (
                    <h3 key={i} className="pt-2 text-base font-semibold text-zinc-900">
                      {renderInlineBold(b.text)}
                    </h3>
                  );
                }
                if (b.type === "quote") {
                  return (
                    <blockquote
                      key={i}
                      className="rounded-r-xl border-l-4 border-amber-500 bg-amber-50/70 px-4 py-3 text-xs sm:text-sm text-amber-950"
                    >
                      {renderInlineBold(b.text)}
                    </blockquote>
                  );
                }
                if (b.type === "li") {
                  return (
                    <div key={i} className="flex items-start gap-2.5 pl-1">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-zinc-900" />
                      <div>{renderInlineBold(b.text)}</div>
                    </div>
                  );
                }
                return <p key={i}>{renderInlineBold(b.text)}</p>;
              })}
            </div>
          )}

          {/* FAQ Schema Visible Section */}
          {post.faq_schema_json.length > 0 && (
            <section className="pt-6 border-t border-zinc-200 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-zinc-900" />
                <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                  {ui.faqTitle}
                </h2>
              </div>
              <div className="grid gap-3">
                {post.faq_schema_json.map((f, idx) => (
                  <div key={idx} className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 space-y-1.5">
                    <h3 className="text-xs sm:text-sm font-semibold text-zinc-950">{f.question}</h3>
                    <p className="text-xs sm:text-[13px] leading-relaxed text-zinc-600">{f.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>

        <BlogLeadCta articleTitle={post.title} utmCampaign={post.utm_campaign} locale={locale} />

        {/* Related Articles Grid */}
        {related.length > 0 && (
          <section className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                {ui.relatedTitle} ({post.category})
              </h2>
              <Link href={blogIndexPath} className="text-xs font-medium text-zinc-700 hover:text-zinc-950 underline">
                {ui.viewAll}
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={r.href}
                  className="group overflow-hidden rounded-xl border border-zinc-200/80 bg-white hover:border-zinc-400 transition-all flex flex-col justify-between"
                >
                  {r.featured_image_url && (
                    <div className="aspect-[16/9] bg-zinc-100 overflow-hidden">
                      <img
                        src={r.featured_image_url}
                        alt={r.featured_image_alt || r.title}
                        width={800}
                        height={450}
                        loading="lazy"
                        className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform"
                      />
                    </div>
                  )}
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <h3 className="text-xs font-semibold text-zinc-950 leading-snug group-hover:text-amber-700 line-clamp-2">
                      {r.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600">
                      {ui.readArticle} <ArrowRight className="size-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </BlogSiteChrome>
  );
}
