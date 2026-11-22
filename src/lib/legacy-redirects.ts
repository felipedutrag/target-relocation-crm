/**
 * Redirects 301 (permanent: true => 308) das URLs do WordPress antigo que hoje dao 404.
 * Fonte: Google Search Console (sc-domain:targetrelocation.com.br).
 * A landing atual e uma pagina unica em PT; paginas comerciais antigas apontam para a secao equivalente.
 */

export interface LegacyRedirect {
  source: string;
  destination: string;
}

// PT: pagina institucional / comercial -> secao da landing
const PT_SECTIONS: Record<string, string> = {
  "sobre-nos": "/#sobre",
  "servicos": "/#servicos",
  "contato": "/#contato",
  "home-new": "/",
  "home": "/",
  "in-company": "/#servicos",
  "formulario-pf": "/#contato",
  "formulario-pj": "/#contato",
  "pagina-b2b": "/#contato",
  "muito-obrigado": "/obrigado",
  "transporte-de-pets": "/#servicos",
  "assessoria-de-imigracao": "/#servicos",
  "consultoria-tributaria-tax": "/#servicos",
  "cidadania-e-naturalizacao": "/#servicos",
  "gestao-de-expatriados": "/#servicos",
  "assessoria-de-visto-e-residencia": "/#servicos",
  "mudanca-nacional-e-internacional": "/#servicos",
  "solucoes-adicionais": "/#servicos",
  "servico-tax-expatriados": "/#servicos",
  "vistos-e-autorizacoes-de-residencias": "/#servicos",
  "cartorio-e-documentos-civis": "/#servicos",
  "consultoria-visto-imigracao": "/#servicos",
  "assessoria-vistos-documentacoes": "/#servicos",
  "fgts": "/#servicos",
  "cadastro-gov-br": "/#servicos",
  "adaptacao-cultural": "/#servicos",
};

// EN / ES: pagina institucional / comercial
const EN_SECTIONS: Record<string, string> = {
  "about-us": "/#sobre",
  "services": "/#servicos",
  "contact": "/#contato",
  "privacy-policy-2": "/privacy-policy",
  "in-company": "/#servicos",
  "pf-form": "/#contato",
  "b2b-page": "/#contato",
  "thank-you-very-much": "/obrigado",
  "obrigado": "/obrigado",
  "muito-obrigado": "/obrigado",
  "transporting-pets": "/#servicos",
  "immigration-advice": "/#servicos",
  "tax-consultancy": "/#servicos",
  "tax": "/#servicos",
  "citizenship-and-naturalization": "/#servicos",
  "expatriate-management": "/#servicos",
  "visa-and-residence-advice": "/#servicos",
  "national-and-international-removals": "/#servicos",
  "additional-solutions": "/#servicos",
  "naturalizacao-brasileira": "/#servicos",
  "consultoria-de-relocation-executivo": "/#servicos",
  "relocation-para-familias": "/#servicos",
  "notary-and-civil-documents": "/#servicos",
  "cultural-adaptation": "/#servicos",
  "adaptacao-cultural": "/#servicos",
  "fgts": "/#servicos",
  "cadastro-gov-br": "/#servicos",
  "assessoria-vistos-documentacoes": "/#servicos",
  "your-visa-for-usa-cloned-business": "/seu-visto-para-os-eua-cloned-negocios",
};

const ES_SECTIONS: Record<string, string> = {
  "acerca-de-nosotros": "/#sobre",
  "servicios": "/#servicos",
  "servicos": "/#servicos",
  "pongase-en-contacto-con": "/#contato",
  "politica-de-privacidad": "/politica-de-privacidade",
  "en-la-empresa": "/#servicos",
  "in-company": "/#servicos",
  "pf-formulario": "/#contato",
  "formulario-pj": "/#contato",
  "pagina-b2b": "/#contato",
  "muchas-gracias": "/obrigado",
  "transporte-de-animales": "/#servicos",
  "asesoramiento-sobre-inmigracion": "/#servicos",
  "asesoria-fiscal": "/#servicos",
  "impuesto": "/#servicos",
  "ciudadania-y-naturalizacion": "/#servicos",
  "gestion-de-expatriados": "/#servicos",
  "asesoramiento-sobre-visados-y-residencia": "/#servicos",
  "mudanzas-nacionales-e-internacionales": "/#servicos",
  "soluciones-adicionales": "/#servicos",
  "naturalizacao-brasileira": "/#servicos",
  "relocation-para-executivos": "/#servicos",
  "notaria-y-documentos-civiles": "/#servicos",
  "adaptacion-cultural": "/#servicos",
  "fgts": "/#servicos",
  "assessoria-vistos-documentacoes": "/#servicos",
  "seu-visto-para-os-eua-cloned-negocios": "/seu-visto-para-os-eua-cloned-negocios",
};

// Categorias / hubs / paginacao do WordPress -> indice do blog
const BLOG_HUBS = [
  "documentacao-pessoal", "uncategorized", "migracao", "vistos-e-documentacao", "mobilidade",
  "relocation-e-expatriados", "news", "morar-no-exterior", "vistos-e-residencia-no-brasil",
  "naturalizacao-e-cidadania", "documentos-para-estrangeiros", "imigracao",
  "processos-para-trabalhar-legalmente",
  // EN
  "visas-and-documentation", "personal-documentation", "documents-for-foreigners", "mobility",
  "migration", "relocation-and-expatriates", "live-abroad", "visas-and-residency-in-brazil",
  "processes-for-working-legally", "united-states", "naturalization-and-citizenship",
  // ES
  "visados-y-documentacion", "documentacion-personal", "documentos-para-extranjeros", "movilidad",
  "migracion", "reubicacion-y-expatriados", "noticias", "vivir-en-el-extranjero",
  "visados-y-residencia-en-brasil", "sin-categorizar", "estados-unidos",
];

// Artigos antigos (slugs renomeados no WP) -> artigo atual equivalente
const POST_MAP: Array<[string, string]> = [
  // CTPS
  ["/ctps-para-estrangeiros-brasil", "/ctps-para-estrangeiros"],
  ["/en/ctps-para-estrangeiros-brasil", "/en/ctps-for-foreigners"],
  ["/es/ctps-para-estrangeiros-brasil", "/es/ctps-para-extranjeros"],
  ["/en/ctps-for-foreigners-brazil", "/en/ctps-for-foreigners"],
  ["/es/ctps-para-extranjeros-brasil", "/es/ctps-para-extranjeros"],
  ["/en/ctps-in-brazil-complete-guide-for-foreigners", "/en/ctps-for-foreigners"],
  ["/es/el-ctps-en-brasil-guia-completa-para-extranjeros", "/es/ctps-para-extranjeros"],
  ["/en/ctps-no-brasil-guia-completo-para-estrangeiros", "/en/ctps-for-foreigners"],
  ["/es/ctps-no-brasil-guia-completo-para-estrangeiros", "/es/ctps-para-extranjeros"],
  // Visto B1/B2
  ["/visto-b1-ou-b2-qual-e-o-certo-para-sua-viagem-aos-eua", "/visto-b1-e-b2-qual-a-diferenca-e-qual-e-o-ideal-para-os-eua"],
  ["/en/visto-b1-ou-b2-qual-e-o-certo-para-sua-viagem-aos-eua", "/en/what-is-the-difference-between-a-b1-and-a-b2-visa-and-which-one-is-best-for-the-usa"],
  ["/en/b1-or-b2-visa-which-one-is-right-for-your-trip-to-the-usa", "/en/what-is-the-difference-between-a-b1-and-a-b2-visa-and-which-one-is-best-for-the-usa"],
  ["/es/visado-b1-o-b2-cual-es-el-mas-adecuado-para-su-viaje-a-ee-uu", "/es/visados-b1-y-b2-cual-es-la-diferencia-y-cual-es-el-mas-adecuado-para-viajar-a-ee-uu"],
  // CNH
  ["/conversao-da-cnh-estrangeira-no-brasil-entenda-o-processo", "/cnh-para-estrangeiros-atualizado"],
  ["/en/conversao-da-cnh-estrangeira-no-brasil-entenda-o-processo", "/en/updated-drivers-license-for-foreigners"],
  ["/es/conversao-da-cnh-estrangeira-no-brasil-entenda-o-processo", "/es/licencia-de-conducir-para-extranjeros-actualizada"],
  ["/en/foreign-drivers-license-conversion-in-brazil-understand-the-process", "/en/updated-drivers-license-for-foreigners"],
  ["/es/conversion-del-permiso-de-conducir-extranjero-en-brasil-entienda-el-proceso", "/es/licencia-de-conducir-para-extranjeros-actualizada"],
  // Apostila de Haia
  ["/apostilamento-de-haia-documentos-expatriado", "/apostilamento-haia-imigracao"],
  ["/en/apostilamento-de-haia-documentos-expatriado", "/en/hague-apostille-immigration"],
  ["/es/apostilamento-de-haia-documentos-expatriado", "/es/apostilla-de-la-haya-inmigracion"],
  ["/en/hague-apostille-for-expatriate-documents", "/en/hague-apostille-immigration"],
  ["/es/apostilla-de-la-haya-para-documentos-de-expatriados", "/es/apostilla-de-la-haya-inmigracion"],
  ["/es/apostilamento-de-haia-documentos-expatriado", "/es/apostilla-de-la-haya-inmigracion"],
  // CELPE-Bras 2020
  ["/celpe-bras-2020", "/celpe-bras-2025"],
  // Cluster RNM / CRNM (PT / EN / ES)
  ["/rnm", "/rnm-no-brasil"],
  ["/crnm", "/rnm-no-brasil"],
  ["/rnm-crnm-rne-entenda-as-diferencas", "/rnm-no-brasil"],
  ["/o-que-e-o-rnm-e-por-que-ele-e-obrigatorio-para-estrangeiros-no-brasil", "/rnm-no-brasil"],
  ["/rnm-para-estrangeiros-no-brasil-o-que-e-como-emitir-e-por-que-e-indispensavel", "/rnm-no-brasil"],
  ["/rnm-como-estrangeiros-podem-legalizar-residencia-no-brasil", "/rnm-no-brasil"],
  ["/entenda-a-crnm-o-documento-essencial-para-estrangeiros-no-brasil", "/rnm-no-brasil"],
  ["/renovacao-da-crnm-entenda-o-processo", "/rnm-para-estrangeiros-emitir-renovar"],
  ["/renovacao-rnm", "/rnm-para-estrangeiros-emitir-renovar"],
  ["/en/rnm", "/en/rnm-in-brazil"],
  ["/en/crnm", "/en/rnm-in-brazil"],
  ["/en/rnm-crnm-rne-understand-the-differences", "/en/rnm-in-brazil"],
  ["/en/what-is-the-rnm-and-why-is-it-mandatory-for-foreigners-in-brazil", "/en/rnm-in-brazil"],
  ["/en/rnm-for-foreigners-in-brazil-what-and-how-to-issue-it-and-why-it-is-indispensable", "/en/rnm-in-brazil"],
  ["/en/rnm-how-foreigners-can-legalize-residence-in-brazil", "/en/rnm-in-brazil"],
  ["/en/understand-the-crnm-the-essential-document-for-foreigners-in-brazil", "/en/rnm-in-brazil"],
  ["/en/crnm-renewal-understand-the-process", "/en/rnm-for-foreigners-issue-renew"],
  ["/en/rnm-renewal", "/en/rnm-for-foreigners-issue-renew"],
  ["/es/rnm", "/es/rnm-en-brasil"],
  ["/es/crnm", "/es/rnm-en-brasil"],
  ["/es/rnm-crnm-rne-entender-las-diferencias", "/es/rnm-en-brasil"],
  ["/es/que-es-la-rnm-y-por-que-es-obligatoria-para-los-extranjeros-en-brasil", "/es/rnm-en-brasil"],
  ["/es/o-que-e-o-rnm-e-por-que-ele-e-obrigatorio-para-estrangeiros-no-brasil", "/es/rnm-en-brasil"],
  ["/es/rnm-para-extranjeros-en-brasil-que-y-como-emitirlo-y-por-que-es-imprescindible", "/es/rnm-en-brasil"],
  ["/es/rnm-como-pueden-los-extranjeros-legalizar-su-residencia-en-brasil", "/es/rnm-en-brasil"],
  ["/es/entienda-que-es-el-crnm-el-documento-imprescindible-para-los-extranjeros-en-brasil", "/es/rnm-en-brasil"],
  ["/es/renovacion-del-crnm-entienda-el-proceso", "/es/rnm-para-extranjeros-emitir-renovar"],
  ["/es/renovacion-rnm", "/es/rnm-para-extranjeros-emitir-renovar"],
  // Cluster CASV (PT / EN / ES)
  ["/casv", "/casv-eua-visto"],
  ["/casv-centro-atendimento-ao-solicitante-de-visto", "/casv-eua-visto"],
  ["/casv-o-que-e-e-por-que-ele-e-obrigatorio-no-processo-de-visto-americano", "/casv-eua-visto"],
  ["/en/casv", "/en/casv-u-s-visa"],
  ["/en/casv-center-for-visa-applicants", "/en/casv-u-s-visa"],
  ["/en/casv-centro-atendimento-ao-solicitante-de-visto", "/en/casv-u-s-visa"],
  ["/en/what-is-casv-and-why-is-it-mandatory-in-the-american-visa-process", "/en/casv-u-s-visa"],
  ["/es/casv", "/es/casv-ee-uu-visado"],
  ["/es/casv-centro-atendimento-ao-solicitante-de-visto", "/es/casv-ee-uu-visado"],
  ["/es/centro-de-servicios-para-solicitantes-de-visado-casv", "/es/casv-ee-uu-visado"],
  ["/es/casv-que-es-y-por-que-es-obligatorio-en-el-proceso-de-obtencion-de-un-visado-estadounidense", "/es/casv-ee-uu-visado"],
];

function build(): LegacyRedirect[] {
  const list: LegacyRedirect[] = [];

  // Home de idiomas (nao existe /en e /es)
  list.push({ source: "/en", destination: "/" });
  list.push({ source: "/es", destination: "/" });

  for (const [slug, dest] of Object.entries(PT_SECTIONS)) list.push({ source: `/${slug}`, destination: dest });
  for (const [slug, dest] of Object.entries(EN_SECTIONS)) list.push({ source: `/en/${slug}`, destination: dest });
  for (const [slug, dest] of Object.entries(ES_SECTIONS)) list.push({ source: `/es/${slug}`, destination: dest });

  // Hubs de categoria (+ paginacao /page/N e /pagina/N)
  for (const hub of BLOG_HUBS) {
    list.push({ source: `/${hub}/:rest*`, destination: "/blog" });
    list.push({ source: `/en/${hub}/:rest*`, destination: "/en/blog" });
    list.push({ source: `/es/${hub}/:rest*`, destination: "/es/blog" });
  }

  // Paginacao do blog antigo
  list.push({ source: "/blog/page/:n", destination: "/blog" });
  list.push({ source: "/en/blog/page/:n", destination: "/en/blog" });
  list.push({ source: "/es/blog/pagina/:n", destination: "/es/blog" });

  for (const [from, to] of POST_MAP) list.push({ source: from, destination: to });

  return list;
}

export const LEGACY_REDIRECTS: LegacyRedirect[] = build();
