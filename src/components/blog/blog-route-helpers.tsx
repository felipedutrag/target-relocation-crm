import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { BlogSiteChrome } from "@/components/blog/blog-site-chrome";
import { BlogListClient } from "@/components/blog/blog-list-client";
import { BlogArticleView } from "@/components/blog/blog-article-view";
import {
  getPublishedBlogIndex,
  getPublishedPostBySlug,
  type BlogLocale,
} from "@/lib/blog-queries";

const SITE_URL = "https://target-relocation-crm-production.up.railway.app";

const INDEX_COPY: Record<
  BlogLocale,
  {
    badge: string;
    heading: string;
    subheading: string;
    seoTitle: string;
    seoDescription: string;
  }
> = {
  pt: {
    badge: "Imigração Corporativa & Global Mobility • Base Histórica + Guias GEO",
    heading: "Guias técnicos e artigos para decisões de RH e mobilidade internacional.",
    subheading:
      "Acervo completo de artigos sobre vistos de trabalho (RN 02/2017, RN 03/2017, RN 11/2017), Residência Mercosul, Ministério do Trabalho (MTE), Polícia Federal, Relocation no Brasil e vistos corporativos globais.",
    seoTitle: "Blog & Guias Técnicos de Imigração Corporativa | Target Relocation",
    seoDescription:
      "Artigos e guias técnicos sobre vistos de trabalho no Brasil, Residência Mercosul, MTE, Polícia Federal e Global Mobility assinados pela Target Relocation.",
  },
  en: {
    badge: "Corporate Immigration & Global Mobility • Technical Library & GEO",
    heading: "Technical guides for HR and Global Mobility decisions in Brazil and the Americas.",
    subheading:
      "Complete library covering work visas, Mercosur residency, Ministry of Labor (MTE), Federal Police (RNM), executive relocation in Brazil, and cross-border immigration compliance.",
    seoTitle: "Corporate Immigration & Global Mobility Blog | Target Relocation",
    seoDescription:
      "Technical guides for multinationals covering Brazilian work visas, Mercosur residency, Federal Police registration, and executive relocation.",
  },
  es: {
    badge: "Inmigración Corporativa y Movilidad Global • Biblioteca Técnica GEO",
    heading: "Guías técnicas para decisiones de RRHH y movilidad ejecutiva en Brasil y América.",
    subheading:
      "Biblioteca completa de artículos sobre visas de trabajo, Residencia Mercosur, Ministerio de Trabajo (MTE), Policía Federal y traslado corporativo de ejecutivos.",
    seoTitle: "Blog Técnico de Inmigración Corporativa y Movilidad | Target Relocation",
    seoDescription:
      "Artículos técnicos para empresas multinacionales sobre visas de trabajo en Brasil, Residencia Mercosur, MTE y traslado de ejecutivos.",
  },
};

export function getIndexMetadata(locale: BlogLocale): Metadata {
  const c = INDEX_COPY[locale];
  const path = locale === "en" ? "/en/blog" : locale === "es" ? "/es/blog" : "/blog";
  return {
    title: c.seoTitle,
    description: c.seoDescription,
    alternates: {
      canonical: `${SITE_URL}${path}`,
      languages: {
        "pt-BR": `${SITE_URL}/blog`,
        "en-US": `${SITE_URL}/en/blog`,
        "es-MX": `${SITE_URL}/es/blog`,
      },
    },
  };
}

export async function renderBlogIndexPage(locale: BlogLocale) {
  const posts = await getPublishedBlogIndex(locale);
  const c = INDEX_COPY[locale];

  return (
    <BlogSiteChrome
      locale={locale}
      alternateHrefs={{ pt: "/blog", en: "/en/blog", es: "/es/blog" }}
    >
      <section className="border-b border-zinc-200/80 bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>{c.badge}</span>
          </div>
          <h1 className="max-w-3xl text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-zinc-950">
            {c.heading}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-600">{c.subheading}</p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <BlogListClient posts={posts} locale={locale} />
      </main>
    </BlogSiteChrome>
  );
}

export async function buildArticleMetadata(slug: string, locale: BlogLocale): Promise<Metadata> {
  const found = await getPublishedPostBySlug(slug, locale);
  if (!found) {
    return { title: "Artigo não encontrado | Target Relocation" };
  }
  const { post } = found;
  const ptPath = post.canonical_path || `/${post.slug}`;
  const enPath = `/en/${post.en_slug || post.slug}`;
  const esPath = `/es/${post.es_slug || post.slug}`;
  const currentPath = locale === "en" ? enPath : locale === "es" ? esPath : ptPath;

  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.direct_answer.slice(0, 158),
    alternates: {
      canonical: `${SITE_URL}${currentPath}`,
      languages: {
        "pt-BR": `${SITE_URL}${ptPath}`,
        "en-US": `${SITE_URL}${enPath}`,
        "es-MX": `${SITE_URL}${esPath}`,
      },
    },
    openGraph: {
      title: post.seo_title || post.title,
      description: post.seo_description || post.direct_answer.slice(0, 158),
      type: "article",
      url: `${SITE_URL}${currentPath}`,
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at,
      images: post.featured_image_url ? [{ url: post.featured_image_url, alt: post.featured_image_alt || post.title }] : undefined,
    },
    twitter: {
      card: post.featured_image_url ? "summary_large_image" : "summary",
      title: post.seo_title || post.title,
      description: post.seo_description || post.direct_answer.slice(0, 158),
      images: post.featured_image_url ? [post.featured_image_url] : undefined,
    },
  };
}

export async function renderArticlePage(slug: string, locale: BlogLocale) {
  const found = await getPublishedPostBySlug(slug, locale);
  if (!found) {
    notFound();
  }
  return <BlogArticleView post={found.post} related={found.related} locale={locale} />;
}
