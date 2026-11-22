import type { Metadata } from "next";
import { AdLandingPage } from "@/components/landing/ad-landing-page";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Visto de Negócios EUA (B1) para Empresas | Target Relocation",
  description:
    "Assessoria especializada em vistos americanos B1/B2 de negócios para executivos, reuniões societárias, feiras e implantação técnica nos Estados Unidos.",
  alternates: { canonical: `${SITE_URL}/seu-visto-para-os-eua-cloned-negocios` },
};

export default function VistoEuaNegociosPage() {
  return (
    <AdLandingPage
      config={{
        slug: "seu-visto-para-os-eua-cloned-negocios",
        badge: "MOBILIDADE CORPORATIVA EUA • NEGÓCIOS B1",
        headline: "Visto de Negócios nos EUA para Executivos e Equipes",
        subheadline:
          "Estruturamos processos consulares para reuniões comerciais, treinamentos corporativos e prospecção nos Estados Unidos com rigor técnico e previsibilidade para o RH.",
        serviceInterest: "Visto de Negócios EUA (B1/B2)",
        bullets: [
          {
            title: "Gestão de Equipes Corporativas",
            detail: "Coordenação simultânea de vistos para diretores, gerentes e especialistas.",
          },
          {
            title: "Documentação & Vínculos",
            detail: "Checklist detalhado de carta-convite da matriz e comprovantes de vínculo no Brasil.",
          },
          {
            title: "Agendamentos Otimizados",
            detail: "Monitoramento de agenda no CASV e Consulados em São Paulo, Rio, Brasília e Recife.",
          },
          {
            title: "Conformidade de Escopo",
            detail: "Orientação clara sobre atividades permitidas no visto B1 versus trabalho remunerado local.",
          },
        ],
        complianceNote:
          "A atuação da Target Relocation compreende consultoria documental e preparação consular. Prazos de agendamento e decisão final dependem exclusivamente do Consulado dos EUA.",
        ctaLabel: "Solicitar Proposta Corporativa",
        whatsappText: "Olá! Preciso de assessoria para visto de negócios nos EUA para nossa empresa.",
      }}
    />
  );
}
