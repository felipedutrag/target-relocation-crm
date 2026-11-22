import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";
import { BlogSiteChrome } from "@/components/blog/blog-site-chrome";
import { ThankYouTracker } from "@/components/analytics/thank-you-tracker";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Solicitação Recebida | Target Relocation",
  description:
    "Recebemos sua solicitação de assessoria em imigração corporativa e relocation. Nossa equipe técnica entrará em contato em breve.",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/obrigado` },
};

export default async function ObrigadoPage({
  searchParams,
}: {
  searchParams: Promise<{ origem?: string }>;
}) {
  const sp = await searchParams;
  const origem = sp?.origem || "site";

  return (
    <BlogSiteChrome locale="pt">
      <ThankYouTracker origin={origem} />
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-8 sm:p-10 text-center space-y-6 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
            <CheckCircle2 className="size-7" />
          </div>

          <div className="space-y-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
              Target Relocation • Atendimento B2B e Consular
            </span>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-zinc-950">
              Solicitação recebida com sucesso
            </h1>
            <p className="text-sm leading-relaxed text-zinc-600">
              Obrigado pelo contato. Nossa equipe especializada analisará o escopo enviado e retornará em breve para
              agendar um diagnóstico técnico ou alinhar os próximos passos.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="https://wa.me/551125946276?text=Ol%C3%A1!%20Acabei%20de%20enviar%20uma%20solicita%C3%A7%C3%A3o%20pelo%20site%20da%20Target%20Relocation."
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              <MessageCircle className="mr-2 size-4 text-emerald-400" />
              Falar agora no WhatsApp
            </a>
            <Link
              href="/blog"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Explorar Guias Técnicos
              <ArrowRight className="ml-2 size-3.5" />
            </Link>
          </div>

          <p className="text-[11px] text-zinc-400 pt-2">
            Av. Adolfo Pinheiro, 2054, Sala 404 — Alto da Boa Vista, São Paulo/SP • (11) 2594-6276
          </p>
        </div>
      </main>
    </BlogSiteChrome>
  );
}
