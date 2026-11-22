import type { Metadata } from "next";
import { AdLandingPage } from "@/components/landing/ad-landing-page";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Visto Americano para Executivos e Empresas | Target Relocation",
  description:
    "Assessoria técnica para vistos americanos corporativos e de negócios (B1/B2 e transferências empresariais): DS-160, CASV, consulado e preparação documental.",
  alternates: { canonical: `${SITE_URL}/seu-visto-para-os-eua` },
};

export default function VistoEuaPage() {
  return (
    <AdLandingPage
      config={{
        slug: "seu-visto-para-os-eua",
        badge: "ASSESSORIA CONSULAR EUA • TARGET RELOCATION",
        headline: "Visto Americano para Executivos e Viagens Corporativas",
        subheadline:
          "Condução estratégica do processo consular para os Estados Unidos: enquadramento de categoria, preenchimento rigoroso do DS-160, agendamento no CASV/Consulado e orientação executiva.",
        serviceInterest: "Assessoria de Visto Americano (EUA)",
        bullets: [
          {
            title: "Enquadramento & DS-160",
            detail: "Análise de perfil e preenchimento técnico sem inconsistências documentais.",
          },
          {
            title: "CASV & Consulado",
            detail: "Gestão completa de agendamentos biométricos, taxas MRV e entrevista consular.",
          },
          {
            title: "Dossiê Corporativo",
            detail: "Revisão de cartas-convite, vínculos empregatícios e comprovação de missão de negócios.",
          },
          {
            title: "Atendimento Consultivo",
            detail: "Suporte direto para executivos, diretores e equipes de RH em viagens internacionais.",
          },
        ],
        complianceNote:
          "Nota regulatória: a concessão de vistos americanos é decisão soberana das autoridades consulares dos Estados Unidos após análise de elegibilidade e entrevista. Não prometemos aprovação automática.",
        ctaLabel: "Solicitar Avaliação Consular",
        whatsappText: "Olá! Gostaria de falar com a Target Relocation sobre visto americano.",
      }}
    />
  );
}
