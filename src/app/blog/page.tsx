import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/server";
import { BlogListClient, type PublicBlogPost } from "@/components/blog/blog-list-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog & Guias Técnicos GEO | Target Relocation — Imigração Corporativa",
  description:
    "Respostas técnicas diretas para RH e Global Mobility sobre RN 02/2017, RN 11/2017, Residência Mercosul, Ministério do Trabalho (MTE), Polícia Federal e Relocation Executivo no Brasil.",
};

export default async function BlogIndexPage() {
  let posts: PublicBlogPost[] = [];
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("id, slug, title, question_headline, direct_answer, pillar, author_name, author_role, published_at, updated_at, utm_campaign")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    posts = (data || []) as PublicBlogPost[];
  } catch {
    posts = [];
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center shrink-0">
              <img src="/target-logo.png" alt="Target Relocation" className="h-9 w-auto object-contain" />
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 font-mono text-[11px] text-zinc-600">
              <ShieldCheck className="size-3 text-emerald-600" />
              Portal Técnico GEO/SEO
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            >
              <ArrowLeft className="size-3.5" />
              Site Institucional
            </Link>
            <Link
              href="/login"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
            >
              CRM
            </Link>
            <Link
              href="/#contato"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Falar com Especialista
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-zinc-200/80 bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700">
            Imigração Corporativa & Global Mobility • Base Regulatória Atualizada
          </div>
          <h1 className="max-w-3xl text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-zinc-950">
            Guias técnicos para decisões de RH e mobilidade de executivos no Brasil.
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-600">
            Cada página responde objetivamente às perguntas mais críticas sobre resoluções normativas (RN 02/2017, RN
            03/2017, RN 11/2017), Residência Mercosul, Ministério do Trabalho e Emprego (MTE) e registro na Polícia
            Federal — assinada por <strong>Klaus Duailibi</strong>.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <BlogListClient posts={posts} />
      </main>
    </div>
  );
}
