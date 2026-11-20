import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Calendar, CheckCircle2, PlayCircle, ShieldCheck, UserCheck } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { BlogLeadCta } from "@/components/blog/blog-lead-cta";

export const dynamic = "force-dynamic";

interface FaqItem {
  question: string;
  answer: string;
}

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, question_headline, direct_answer, seo_title, seo_description")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) {
    return { title: "Artigo não encontrado | Target Relocation" };
  }

  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.direct_answer.slice(0, 158),
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createPublicClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) {
    notFound();
  }

  const faqList: FaqItem[] = Array.isArray(post.faq_schema_json) ? (post.faq_schema_json as FaqItem[]) : [];
  const blocks = renderMarkdownBlocks(String(post.content_markdown || ""));
  const embedUrl = getYoutubeEmbedUrl(post.youtube_embed_url);
  const updatedStr = new Date(post.updated_at || post.published_at || Date.now()).toLocaleDateString("pt-BR");

  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.question_headline || post.title,
    description: post.direct_answer,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at,
    author: {
      "@type": "Person",
      name: post.author_name || "Klaus Duailibi",
      jobTitle: post.author_role || "Diretor • Target Relocation",
    },
    publisher: {
      "@type": "Organization",
      name: "Target Relocation",
    },
  };

  const jsonLdFaq =
    faqList.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqList.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer,
            },
          })),
        }
      : null;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      {jsonLdFaq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
        />
      )}

      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center shrink-0">
            <img src="/target-logo.png" alt="Target Relocation" className="h-9 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/blog"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            >
              <ArrowLeft className="size-3.5" />
              Todos os Artigos GEO
            </Link>
            <Link
              href="/login"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
            >
              CRM
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-8">
        <article className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-7">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <Badge variant="outline" className="bg-zinc-50 border-zinc-200 text-zinc-700">
                Guia Técnico GEO • FAQ Schema
              </Badge>
              <span className="inline-flex items-center gap-1 text-zinc-500 font-mono text-[11px]">
                <Calendar className="size-3.5" />
                Atualizado em {updatedStr}
              </span>
              {post.technical_reviewed && (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                  <CheckCircle2 className="size-3" />
                  Revisado Tecnicamente
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-semibold tracking-[-0.03em] text-zinc-950 leading-[1.18]">
              {post.question_headline || post.title}
            </h1>

            <div className="flex items-center gap-3 pt-1">
              <div className="flex size-9 items-center justify-center rounded-full bg-zinc-950 text-white text-xs font-semibold">
                KD
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-950">
                  <UserCheck className="size-3.5 text-emerald-600" />
                  <span>{post.author_name || "Klaus Duailibi"}</span>
                </div>
                <div className="text-[11px] text-zinc-500">{post.author_role || "Diretor • Target Relocation"}</div>
              </div>
            </div>
          </div>

          {/* Direct GEO Answer in 1st Paragraph */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              Resposta Direta • Escopo Legal e Órgãos Competentes
            </div>
            <p className="text-sm sm:text-[15px] leading-relaxed font-medium text-zinc-900">
              {post.direct_answer}
            </p>
          </div>

          {/* YouTube Video Embed ("Volta ao blog") */}
          {embedUrl && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                <PlayCircle className="size-4 text-rose-600" />
                <span>Explicação em Vídeo — Klaus Duailibi (YouTube)</span>
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

          {/* Main Article Markdown */}
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

          {/* FAQ Schema Visible Section */}
          {faqList.length > 0 && (
            <section className="pt-6 border-t border-zinc-200 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-zinc-900" />
                <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                  Perguntas Frequentes para RH e Global Mobility (FAQ Schema)
                </h2>
              </div>
              <div className="grid gap-3">
                {faqList.map((f, idx) => (
                  <div key={idx} className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 space-y-1.5">
                    <h3 className="text-xs sm:text-sm font-semibold text-zinc-950">{f.question}</h3>
                    <p className="text-xs sm:text-[13px] leading-relaxed text-zinc-600">{f.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>

        <BlogLeadCta articleTitle={post.title} utmCampaign={post.utm_campaign} />
      </main>
    </div>
  );
}
