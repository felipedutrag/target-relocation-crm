import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BlogSiteChrome } from "@/components/blog/blog-site-chrome";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Política de Privacidade e LGPD | Target Relocation",
  description:
    "Política de Privacidade da Target Relocation em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) e diretrizes de publicidade.",
  alternates: {
    canonical: `${SITE_URL}/politica-de-privacidade`,
    languages: {
      "pt-BR": `${SITE_URL}/politica-de-privacidade`,
      "en-US": `${SITE_URL}/privacy-policy`,
    },
  },
};

export default function PrivacyPolicyPtPage() {
  return (
    <BlogSiteChrome
      locale="pt"
      alternateHrefs={{
        pt: "/politica-de-privacidade",
        en: "/privacy-policy",
        es: "/politica-de-privacidade",
      }}
    >
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <article className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-6 text-sm leading-relaxed text-zinc-700">
          <div className="space-y-3 border-b border-zinc-200 pb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>LGPD • Lei nº 13.709/2018</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-semibold tracking-[-0.03em] text-zinc-950">
              Política de Privacidade
            </h1>
            <p className="text-xs font-mono text-zinc-500">
              Target Relocation • Última atualização: novembro de 2026
            </p>
          </div>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">1. Controladora e Escopo</h2>
            <p>
              A <strong>Target Relocation</strong>, com escritório em Av. Adolfo Pinheiro, 2054, Sala 404, Alto da Boa
              Vista, São Paulo/SP, CEP 04734-003, atua como controladora dos dados pessoais coletados neste site,
              em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">2. Dados Coletados e Finalidade</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Formulários de contato e diagnóstico:</strong> nome completo, empresa, e-mail corporativo,
                telefone/WhatsApp e informações do projeto informadas voluntariamente para responder solicitações de
                proposta comercial e assessoria em imigração corporativa ou relocation.
              </li>
              <li>
                <strong>Dados de navegação e medição de campanhas:</strong> cookies técnicos, páginas visitadas, parâmetros
                UTM, dispositivo, região aproximada e interações para mensuração de desempenho de anúncios e melhoria
                editorial via ferramentas como Google Analytics 4, Google Ads, Meta Pixel e Microsoft Clarity, quando ativos.
              </li>
              <li>
                <strong>Documentação contratual:</strong> em projetos contratados, documentos pessoais e migratórios são
                tratados exclusivamente sob sigilo profissional para execução de processos perante o MTE, Polícia
                Federal, consulados e órgãos competentes.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">3. Compartilhamento e Segurança</h2>
            <p>
              Não comercializamos nem alugamos dados pessoais. O compartilhamento ocorre apenas quando estritamente
              necessário à prestação dos serviços contratados (órgãos governamentais, consulados, despachantes ou
              parceiros logísticos internacionais sob confidencialidade) ou por obrigação legal.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">4. Direitos do Titular e Encarregado (DPO)</h2>
            <p>
              Você pode solicitar confirmação de tratamento, acesso, correção, portabilidade ou exclusão de seus dados
              pessoais a qualquer momento pelo e-mail{" "}
              <a href="mailto:comercial@targetrelocation.com.br" className="font-medium text-zinc-950 underline">
                comercial@targetrelocation.com.br
              </a>{" "}
              ou pelo telefone +55 (11) 2594-6276.
            </p>
          </section>

          <div className="pt-4 border-t border-zinc-200 flex flex-wrap gap-4 text-xs">
            <Link href="/" className="font-medium text-zinc-950 underline underline-offset-4">
              ← Voltar para a página inicial
            </Link>
            <Link href="/privacy-policy" className="text-zinc-600 hover:text-zinc-950 underline underline-offset-4">
              Read in English
            </Link>
          </div>
        </article>
      </main>
    </BlogSiteChrome>
  );
}
