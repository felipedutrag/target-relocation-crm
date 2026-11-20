"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { BlogLocale, PublicBlogIndexItem } from "@/lib/blog-queries";

export type { PublicBlogIndexItem as PublicBlogPost };

const UI_COPY: Record<
  BlogLocale,
  {
    allLabel: string;
    searchPlaceholder: string;
    featuredLabel: string;
    readMore: string;
    updatedPrefix: string;
    minRead: string;
    emptyMsg: string;
    prevPage: string;
    nextPage: string;
    pageOf: (p: number, t: number) => string;
    complianceTitle: string;
    complianceBody: string;
    schemaFooter: string;
  }
> = {
  pt: {
    allLabel: "Todas as Categorias",
    searchPlaceholder: "Buscar vistos, RN 02, Mercosul, EUA, China...",
    featuredLabel: "Artigo em Destaque",
    readMore: "Ler artigo completo",
    updatedPrefix: "Atualizado",
    minRead: "min leitura",
    emptyMsg: "Nenhum artigo publicado encontrado para este filtro.",
    prevPage: "Anterior",
    nextPage: "Próxima",
    pageOf: (p, t) => `Página ${p} de ${t}`,
    complianceTitle: "Rigor regulatório & conformidade:",
    complianceBody:
      "Todos os guias técnicos da Target Relocation são revisados frente às normas do CNIg, Ministério do Trabalho e Emprego (MTE), Polícia Federal e autoridades consulares. Prazos e aprovações dependem de análise documental prévia.",
    schemaFooter:
      "Conteúdo estruturado com slugs canônicos, JSON-LD Article + FAQ Schema para busca orgânica e GEO.",
  },
  en: {
    allLabel: "All Categories",
    searchPlaceholder: "Search work visas, Mercosur, China, relocation...",
    featuredLabel: "Featured Guide",
    readMore: "Read full guide",
    updatedPrefix: "Updated",
    minRead: "min read",
    emptyMsg: "No published articles matched your filter.",
    prevPage: "Previous",
    nextPage: "Next",
    pageOf: (p, t) => `Page ${p} of ${t}`,
    complianceTitle: "Regulatory compliance note:",
    complianceBody:
      "Target Relocation technical guides align with Ministry of Labor (MTE), Federal Police (RNM), and consular frameworks. Timelines and eligibility always require formal document review.",
    schemaFooter:
      "Indexed with canonical URLs, JSON-LD Article + FAQ Schema for organic search and GEO engines.",
  },
  es: {
    allLabel: "Todas las Categorías",
    searchPlaceholder: "Buscar visas, Mercosur, traslado ejecutivo...",
    featuredLabel: "Artículo Destacado",
    readMore: "Leer guía completa",
    updatedPrefix: "Actualizado",
    minRead: "min lectura",
    emptyMsg: "No se encontraron artículos publicados para este filtro.",
    prevPage: "Anterior",
    nextPage: "Siguiente",
    pageOf: (p, t) => `Página ${p} de ${t}`,
    complianceTitle: "Nota de cumplimiento normativo:",
    complianceBody:
      "Todas las guías de Target Relocation siguen la normativa vigente ante el MTE, Policía Federal y consulados. Plazos y aprobación dependen de auditoría documental previa.",
    schemaFooter:
      "Contenido indexado con URLs canónicas, JSON-LD Article + FAQ Schema para SEO orgánico y GEO.",
  },
};

const PAGE_SIZE = 18;

export function BlogListClient({
  posts,
  locale = "pt",
}: {
  posts: PublicBlogIndexItem[];
  locale?: BlogLocale;
}) {
  const t = UI_COPY[locale];
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) {
      const cat = p.category || "Imigração Corporativa";
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);
  }, [posts]);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.direct_answer.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [posts, selectedCategory, search]);

  const showFeatured = selectedCategory === "all" && !search.trim() && page === 1 && filtered.length > 0;
  const featured = showFeatured ? filtered[0] : null;
  const remaining = showFeatured ? filtered.slice(1) : filtered;

  const totalPages = Math.max(1, Math.ceil(remaining.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagePosts = remaining.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-8">
      {/* Category & Search Toolbar matching landing catalog bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-zinc-950 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950"
              }`}
            >
              {t.allLabel} ({posts.length})
            </button>
            {categories.map(([cat, count]) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-zinc-950 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950"
                }`}
              >
                {cat} ({count})
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72 shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t.searchPlaceholder}
              className="h-8 pl-8 text-xs bg-zinc-50 border-zinc-200"
            />
          </div>
        </div>
      </div>

      {/* Hero Featured Article */}
      {featured && (
        <Link
          href={featured.href}
          className="group grid overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-zinc-400 transition-all md:grid-cols-12"
        >
          {featured.featured_image_url && (
            <div className="md:col-span-5 relative overflow-hidden bg-zinc-100 min-h-[220px]">
              <img
                src={featured.featured_image_url}
                alt={featured.featured_image_alt || featured.title}
                className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          )}
          <div
            className={`${featured.featured_image_url ? "md:col-span-7" : "md:col-span-12"} flex flex-col justify-between p-6 sm:p-8 space-y-4`}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <Badge className="bg-amber-500/15 text-amber-800 border-amber-300/60 hover:bg-amber-500/20">
                  {t.featuredLabel}
                </Badge>
                <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-700">
                  {featured.category}
                </Badge>
                <span className="inline-flex items-center gap-1 font-mono text-zinc-400">
                  <Calendar className="size-3" />
                  {new Date(featured.updated_at || featured.published_at || Date.now()).toLocaleDateString("pt-BR")}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 leading-snug group-hover:text-amber-700 transition-colors">
                {featured.title}
              </h2>

              <p className="text-xs sm:text-sm leading-relaxed text-zinc-600 line-clamp-3">
                {featured.direct_answer}
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 text-zinc-600">
                <span className="inline-flex items-center gap-1.5 font-medium text-zinc-800">
                  <UserCheck className="size-3.5 text-emerald-600" />
                  {featured.author_name}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-400">
                  <Clock className="size-3" />
                  {featured.reading_time_min} {t.minRead}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 font-medium text-zinc-950">
                {t.readMore}
                <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Articles Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          {t.emptyMsg}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {pagePosts.map((post) => {
            const updatedDate = new Date(post.updated_at || post.published_at || Date.now()).toLocaleDateString("pt-BR");
            return (
              <Link
                key={post.id}
                href={post.href}
                className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-zinc-400 transition-all"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-zinc-100 border-b border-zinc-100">
                  {post.featured_image_url ? (
                    <img
                      src={post.featured_image_url}
                      alt={post.featured_image_alt || post.title}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-linear-grid text-zinc-400">
                      <BookOpen className="size-7" />
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        title={post.category || undefined}
                        className="border-zinc-300 bg-zinc-50 text-zinc-800 text-[10px] max-w-[205px]"
                      >
                        <span className="truncate">{post.category}</span>
                      </Badge>
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-400 shrink-0">
                        <Calendar className="size-3" />
                        {updatedDate}
                      </span>
                    </div>

                    <h2 className="text-[15px] font-semibold tracking-tight text-zinc-950 leading-snug group-hover:text-amber-700 transition-colors line-clamp-2">
                      {post.title}
                    </h2>

                    <p className="text-xs leading-relaxed text-zinc-600 line-clamp-3">
                      {post.direct_answer}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                    <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700">
                      <UserCheck className="size-3.5 text-emerald-600" />
                      {post.author_name}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-zinc-900">
                      {t.readMore}
                      <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs">
          <span className="font-mono text-zinc-500">{t.pageOf(safePage, totalPages)}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              {t.prevPage}
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              {t.nextPage}
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Regulatory Trust Banner */}
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 flex items-start gap-3 text-xs text-amber-950">
        <ShieldCheck className="size-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong>{t.complianceTitle}</strong> {t.complianceBody}
        </div>
      </div>

      <div className="text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
        <BookOpen className="size-3.5" />
        <span>{t.schemaFooter}</span>
      </div>
    </div>
  );
}
