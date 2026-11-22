import type { Metadata } from "next";
import { AdLandingPage } from "@/components/landing/ad-landing-page";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Imigração Corporativa & Global Mobility B2B | Target Relocation",
  description:
    "Parceira estratégica de RH e Global Mobility para vistos de trabalho no Brasil (MTE), registro na Polícia Federal (RNM), relocation executivo e vistos nas Américas.",
  alternates: { canonical: `${SITE_URL}/pagina-b2b-cloned-3393` },
};

export default function PaginaB2BPage() {
  return (
    <AdLandingPage
      config={{
        slug: "pagina-b2b-cloned-3393",
        badge: "GLOBAL MOBILITY B2B • RH & COMPLIANCE",
        headline: "Imigração Corporativa e Relocation Executivo para Empresas",
        subheadline:
          "Operamos como extensão estratégica do seu RH na transferência de executivos e especialistas para o Brasil, México, EUA, Argentina e Chile, com ponto único de contato.",
        serviceInterest: "Imigração Corporativa & Relocation B2B",
        bullets: [
          {
            title: "MTE & Polícia Federal (RNM)",
            detail: "Autorizações de residência (RN 02, RN 03, RN 11, Mercosul), acompanhamento no DOU e emissão de RNM.",
          },
          {
            title: "Home Finding & Escolas",
            detail: "Look & See, busca de imóveis corporativos, vistoria, utilidades e colocação em escolas internacionais.",
          },
          {
            title: "Tax & Documentação Local",
            detail: "CPF para estrangeiros, orientação fiscal de residência tributária, conta bancária e CNH.",
          },
          {
            title: "Cobertura Américas",
            detail: "Operação integrada no Brasil, México, Estados Unidos, Argentina e Chile com SLA corporativo.",
          },
        ],
        complianceNote:
          "Processos migratórios passam por análise legal do Ministério do Trabalho e Emprego (MTE) e registro na Polícia Federal. Atuamos com total rigor documental e controle de prazos.",
        ctaLabel: "Falar com Consultor B2B",
        whatsappText: "Olá! Gostaria de agendar uma reunião B2B com a Target Relocation.",
      }}
    />
  );
}
