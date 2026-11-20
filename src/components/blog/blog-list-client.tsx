"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Calendar, Search, ShieldCheck, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface PublicBlogPost {
  id: number;
  slug: string;
  title: string;
  question_headline: string;
  direct_answer: string;
  pillar: string;
  author_name: string;
  author_role: string;
  published_at: string | null;
  updated_at: string;
  utm_campaign: string | null;
}

const PILLAR_LABELS: Record<string, string> = {
  faq_service: "Serviços em FAQ",
  news: "Notícias Regulatórias DOU/MTE",
  institutional: "Institucional & Cases",
};

export function BlogListClient({ posts }: { posts: PublicBlogPost[] }) {
  const [pillar, setPillar] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (pillar !== "all" && p.pillar !== pillar) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.question_headline.toLowerCase().includes(q) ||
          p.direct_answer.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [posts, pillar, search]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: `Todos (${posts.length})` },
            { id: "faq_service", label: "Serviços em FAQ" },
            { id: "news", label: "Notícias MTE/DOU" },
            { id: "institutional", label: "Institucional" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPillar(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                pillar === tab.id
                  ? "bg-zinc-950 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar RN 02, Mercosul, MTE, PF..."
            className="h-8 pl-8 text-xs bg-zinc-50 border-zinc-200"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
          Nenhum artigo publicado encontrado para este filtro.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => {
            const updatedDate = new Date(post.updated_at || post.published_at || Date.now()).toLocaleDateString("pt-BR");
            return (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-zinc-400 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-700 text-[10px]">
                      {PILLAR_LABELS[post.pillar] || post.pillar}
                    </Badge>
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-400">
                      <Calendar className="size-3" />
                      Atualizado {updatedDate}
                    </span>
                  </div>

                  <h2 className="text-base font-semibold tracking-tight text-zinc-950 leading-snug group-hover:text-amber-700 transition-colors">
                    {post.question_headline}
                  </h2>

                  <p className="text-xs leading-relaxed text-zinc-600 line-clamp-4">
                    {post.direct_answer}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700">
                    <UserCheck className="size-3.5 text-emerald-600" />
                    {post.author_name}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-zinc-900">
                    Ler guia técnico
                    <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 flex items-start gap-3 text-xs text-amber-950">
        <ShieldCheck className="size-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong>Nota de rigor regulatório:</strong> Todos os guias técnicos da Target Relocation são revisados
          contra as normas vigentes do Conselho Nacional de Imigração (CNIg), Ministério do Trabalho e Emprego (MTE) e
          Polícia Federal. Prazos e deferimentos dependem sempre de auditoria documental prévia.
        </div>
      </div>

      <div className="text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
        <BookOpen className="size-3.5" />
        <span>Conteúdo indexado com FAQ Schema (JSON-LD) para busca orgânica e mecanismos generativos (GEO).</span>
      </div>
    </div>
  );
}
