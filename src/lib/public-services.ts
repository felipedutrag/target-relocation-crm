import type { LandingLocale } from "@/components/landing/landing-translations";

export interface PublicServiceItem {
  id: string;
  countryKey: "Brasil" | "México / EUA" | "Argentina" | "Chile";
  category: string;
  name: string;
  scope: string;
  serviceId: string;
}

export const PUBLIC_SERVICES_CATALOG: Record<LandingLocale, PublicServiceItem[]> = {
  pt: [
    // Brasil
    {
      id: "br-rel-1",
      countryKey: "Brasil",
      category: "Relocation",
      name: "Look & See — Visita Exploratória",
      scope: "Alinhamento de perfil, tour guiado por bairros residenciais, infraestrutura, escolas internacionais, custo de vida e segurança.",
      serviceId: "full",
    },
    {
      id: "br-rel-2",
      countryKey: "Brasil",
      category: "Relocation",
      name: "House Hunting (Definitivo & Temporário)",
      scope: "Pré-seleção de imóveis conforme política corporativa, agendamento com imobiliárias, visitas acompanhadas e revisão contratual.",
      serviceId: "full",
    },
    {
      id: "br-rel-3",
      countryKey: "Brasil",
      category: "Relocation",
      name: "Vistoria de Imóvel & Ativação Residencial",
      scope: "Vistoria detalhada de entrada e saída com relatório fotográfico, transferência de água, luz e gás, além de instalação de internet.",
      serviceId: "full",
    },
    {
      id: "br-rel-4",
      countryKey: "Brasil",
      category: "Relocation",
      name: "Busca de Escolas (School Search)",
      scope: "Mapeamento de escolas internacionais e bilíngues, agendamento de visitas técnicas e apoio completo no processo de matrícula.",
      serviceId: "full",
    },
    {
      id: "br-img-1",
      countryKey: "Brasil",
      category: "Imigração & Vistos",
      name: "Vistos de Trabalho (RN 02, RN 03 e RN 11)",
      scope: "Protocolo técnico junto ao MTE (MigranteWeb), acompanhamento até publicação no DOU, registro na Polícia Federal (RNM), CPF e CTPS.",
      serviceId: "visas",
    },
    {
      id: "br-img-2",
      countryKey: "Brasil",
      category: "Imigração & Vistos",
      name: "Residência Mercosul & Reunião Familiar",
      scope: "Enquadramento legal, conferência de certidões apostiladas, protocolo de autorização de residência e emissão de RNM para titular e dependentes.",
      serviceId: "visas",
    },

    // México / EUA
    {
      id: "mxus-1",
      countryKey: "México / EUA",
      category: "Imigração EUA",
      name: "Visto Americano B1/B2 & Corporativo (L1)",
      scope: "Enquadramento consular, preenchimento estratégico do DS-160, agendamento no CASV e Consulado, além de preparação executiva para entrevista.",
      serviceId: "outbound",
    },
    {
      id: "mxus-2",
      countryKey: "México / EUA",
      category: "Imigração México",
      name: "Visto Consular de Trabalho no México",
      scope: "Solicitação de NUT junto ao INM, preparação de dossiê corporativo e protocolo consular para titular e dependentes familiares.",
      serviceId: "outbound",
    },
    {
      id: "mxus-3",
      countryKey: "México / EUA",
      category: "Imigração México",
      name: "Residência e Canje no INM (México)",
      scope: "Gestão completa da troca de visto por cartão de residência temporária junto ao Instituto Nacional de Migración para executivo e família.",
      serviceId: "outbound",
    },
    {
      id: "mxus-4",
      countryKey: "México / EUA",
      category: "Logística & Pets",
      name: "Transporte Internacional de Pets",
      scope: "Microchipagem ISO, sorologia antirrábica, emissão de CVI chancelado pelo MAPA, permissões sanitárias e coordenação de embarque aéreo.",
      serviceId: "logistics",
    },

    // Argentina
    {
      id: "ar-1",
      countryKey: "Argentina",
      category: "Imigração & Vistos",
      name: "Residência Temporária / Permanente & DNI",
      scope: "Protocolo migratório perante a Dirección Nacional de Migraciones (Mercosul e Não-Mercosul), emissão de DNI argentino e registro fiscal CUIL.",
      serviceId: "visas",
    },
    {
      id: "ar-2",
      countryKey: "Argentina",
      category: "Compliance B2B",
      name: "Cadastro RENURE & Documentação Local",
      scope: "Habilitação da empresa patrocinadora no RENURE, certidões de antecedentes, traduções públicas no Colegio de Traductores e legalizações.",
      serviceId: "tax",
    },
    {
      id: "ar-3",
      countryKey: "Argentina",
      category: "Relocation",
      name: "Pacote Settling-In & Home Search (Argentina)",
      scope: "Orientation na cidade de destino, busca de imóvel residencial, suporte bancário e coordenação completa da chegada em Buenos Aires e região.",
      serviceId: "full",
    },

    // Chile
    {
      id: "cl-1",
      countryKey: "Chile",
      category: "Imigração & Vistos",
      name: "Residência Temporária & Autorização de Trabalho",
      scope: "Solicitação de residência sujeita a contrato ou permissão temporária de trabalho no Servicio Nacional de Migraciones para titular e família.",
      serviceId: "visas",
    },
    {
      id: "cl-2",
      countryKey: "Chile",
      category: "Documentação Local",
      name: "RUT Provisório / Definitivo & Cédula",
      scope: "Acompanhamento para registro na PDI, emissão de Cédula de Identidad chilena e obtenção de RUT junto ao Servicio de Impuestos Internos.",
      serviceId: "tax",
    },
    {
      id: "cl-3",
      countryKey: "Chile",
      category: "Relocation",
      name: "Home Search & School Search (Santiago / Chile)",
      scope: "Curadoria de imóveis residenciais, visitas guiadas em bairros corporativos e mapeamento de escolas internacionais em Santiago.",
      serviceId: "full",
    },
  ],

  en: [
    // Brazil
    {
      id: "br-rel-1",
      countryKey: "Brasil",
      category: "Relocation",
      name: "Look & See — Destination Orientation",
      scope: "Assignee profile briefing, guided tour of residential neighborhoods, local infrastructure, international schools, cost of living, and safety.",
      serviceId: "full",
    },
    {
      id: "br-rel-2",
      countryKey: "Brasil",
      category: "Relocation",
      name: "House Hunting (Permanent & Temporary)",
      scope: "Property curation aligned with corporate policy, brokerage coordination, accompanied viewings, and lease contract review.",
      serviceId: "full",
    },
    {
      id: "br-rel-3",
      countryKey: "Brasil",
      category: "Relocation",
      name: "Property Inspection & Utility Setup",
      scope: "Detailed move-in and move-out photographic inspection report, utility account transfers (water, power, gas), and home internet activation.",
      serviceId: "full",
    },
    {
      id: "br-rel-4",
      countryKey: "Brasil",
      category: "Relocation",
      name: "International School Search",
      scope: "Curated shortlist of bilingual and international schools matching family curriculum needs, accompanied visits, and enrollment guidance.",
      serviceId: "full",
    },
    {
      id: "br-img-1",
      countryKey: "Brasil",
      category: "Immigration & Visas",
      name: "Brazilian Work Visas (RN 02, RN 03 & RN 11)",
      scope: "Technical filing before the Ministry of Labor (MigranteWeb), DOU tracking, Federal Police registration (RNM), CPF, and labor compliance.",
      serviceId: "visas",
    },
    {
      id: "br-img-2",
      countryKey: "Brasil",
      category: "Immigration & Visas",
      name: "Mercosur Residency & Family Reunion",
      scope: "Legal track assessment, Hague Apostille audit, residence authorization filing, and RNM card issuance for assignees and dependents.",
      serviceId: "visas",
    },

    // Mexico / USA
    {
      id: "mxus-1",
      countryKey: "México / EUA",
      category: "US Immigration",
      name: "US B1/B2 Business & Corporate Visas",
      scope: "Consular strategy, accurate DS-160 preparation, CASV and US Consulate appointment scheduling, and executive interview readiness.",
      serviceId: "outbound",
    },
    {
      id: "mxus-2",
      countryKey: "México / EUA",
      category: "Mexico Immigration",
      name: "Mexico Consular Work Visa",
      scope: "Corporate NUT authorization before Mexico's INM, dossier assembly, and consular interview coordination for assignees and family.",
      serviceId: "outbound",
    },
    {
      id: "mxus-3",
      countryKey: "México / EUA",
      category: "Mexico Immigration",
      name: "Mexico INM Residency & Canje",
      scope: "Complete post-arrival conversion from consular visa to Temporary Resident Card at the Instituto Nacional de Migración.",
      serviceId: "outbound",
    },
    {
      id: "mxus-4",
      countryKey: "México / EUA",
      category: "Logistics & Pets",
      name: "International Pet Relocation",
      scope: "ISO microchipping, rabies titer test coordination, official veterinary health certificates (CVI), sanitary permits, and airline transit.",
      serviceId: "logistics",
    },

    // Argentina
    {
      id: "ar-1",
      countryKey: "Argentina",
      category: "Immigration & Visas",
      name: "Temporary / Permanent Residency & DNI",
      scope: "Filings before the Dirección Nacional de Migraciones (Mercosur & Non-Mercosur), Argentine DNI issuance, and CUIL tax registration.",
      serviceId: "visas",
    },
    {
      id: "ar-2",
      countryKey: "Argentina",
      category: "Corporate Compliance",
      name: "RENURE Registration & Local Records",
      scope: "Sponsor entity registration in RENURE, police clearance legalization, sworn public translations, and statutory municipal records.",
      serviceId: "tax",
    },
    {
      id: "ar-3",
      countryKey: "Argentina",
      category: "Relocation",
      name: "Settling-In & Home Search (Argentina)",
      scope: "City orientation, residential property search, local bank account guidance, and end-to-end arrival coordination in Buenos Aires.",
      serviceId: "full",
    },

    // Chile
    {
      id: "cl-1",
      countryKey: "Chile",
      category: "Immigration & Visas",
      name: "Temporary Residency & Work Authorization",
      scope: "Work-contract and short-term work permit filings before Chile's Servicio Nacional de Migraciones for principals and dependents.",
      serviceId: "visas",
    },
    {
      id: "cl-2",
      countryKey: "Chile",
      category: "Local Documentation",
      name: "RUT Issuance & Chilean ID Card",
      scope: "PDI international police registration, Chilean Cédula de Identidad issuance, and tax ID (RUT) activation before the SII.",
      serviceId: "tax",
    },
    {
      id: "cl-3",
      countryKey: "Chile",
      category: "Relocation",
      name: "Home Search & School Search (Chile)",
      scope: "Accompanied residential property tours across Santiago corporate districts and bilingual/international school placement support.",
      serviceId: "full",
    },
  ],

  es: [
    // Brasil
    {
      id: "br-rel-1",
      countryKey: "Brasil",
      category: "Relocation",
      name: "Look & See — Visita de Orientación",
      scope: "Alineación del perfil, recorrido guiado por barrios residenciales, infraestructura urbana, colegios internacionales y costo de vida.",
      serviceId: "full",
    },
    {
      id: "br-rel-2",
      countryKey: "Brasil",
      category: "Relocation",
      name: "House Hunting (Definitivo y Temporal)",
      scope: "Curaduría de inmuebles según la política corporativa, agenda con inmobiliarias, visitas acompañadas y revisión de contrato de alquiler.",
      serviceId: "full",
    },
    {
      id: "br-rel-3",
      countryKey: "Brasil",
      category: "Relocation",
      name: "Inspección de Inmueble y Servicios",
      scope: "Inspección inicial y de salida con informe fotográfico, cambio de titularidad de agua, luz y gas, y activación de internet.",
      serviceId: "full",
    },
    {
      id: "br-rel-4",
      countryKey: "Brasil",
      category: "Relocation",
      name: "Búsqueda de Colegios (School Search)",
      scope: "Mapeo de colegios internacionales y bilingües compatibles con la familia, visitas guiadas y asistencia en el proceso de matrícula.",
      serviceId: "full",
    },
    {
      id: "br-img-1",
      countryKey: "Brasil",
      category: "Inmigración y Visas",
      name: "Visas de Trabajo en Brasil (RN 02, RN 03 y RN 11)",
      scope: "Expediente técnico ante el Ministerio de Trabajo (MigranteWeb), seguimiento en el DOU, registro en Policía Federal (RNM) y CPF.",
      serviceId: "visas",
    },
    {
      id: "br-img-2",
      countryKey: "Brasil",
      category: "Inmigración y Visas",
      name: "Residencia Mercosur y Reunificación Familiar",
      scope: "Encuadre legal, auditoría de actas apostilladas, solicitud de autorización de residencia y emisión de RNM para titular y familia.",
      serviceId: "visas",
    },

    // México / EUA
    {
      id: "mxus-1",
      countryKey: "México / EUA",
      category: "Inmigración EE. UU.",
      name: "Visa Estadounidense B1/B2 y Corporativa",
      scope: "Estrategia consular, llenado técnico del DS-160, citas ante el CASV y Consulado, y preparación ejecutiva para la entrevista.",
      serviceId: "outbound",
    },
    {
      id: "mxus-2",
      countryKey: "México / EUA",
      category: "Inmigración México",
      name: "Visa Consular de Trabajo en México",
      scope: "Autorización por oferta de empleo (NUT) ante el INM, armado de expediente y gestión consular para el ejecutivo y su familia.",
      serviceId: "outbound",
    },
    {
      id: "mxus-3",
      countryKey: "México / EUA",
      category: "Inmigración México",
      name: "Residencia y Canje ante el INM (México)",
      scope: "Canje integral de visa consular por Tarjeta de Residente Temporal ante el Instituto Nacional de Migración en México.",
      serviceId: "outbound",
    },
    {
      id: "mxus-4",
      countryKey: "México / EUA",
      category: "Logística y Mascotas",
      name: "Traslado Internacional de Mascotas",
      scope: "Microchip ISO, serología antirrábica, emisión de CVI oficial, permisos sanitarios y coordinación aérea segura para perros y gatos.",
      serviceId: "logistics",
    },

    // Argentina
    {
      id: "ar-1",
      countryKey: "Argentina",
      category: "Inmigración y Visas",
      name: "Residencia Temporaria / Permanente y DNI",
      scope: "Trámite ante la Dirección Nacional de Migraciones (Mercosur y No Mercosur), obtención del DNI argentino y emisión de CUIL.",
      serviceId: "visas",
    },
    {
      id: "ar-2",
      countryKey: "Argentina",
      category: "Compliance Corporativo",
      name: "Alta en RENURE y Documentación Local",
      scope: "Inscripción de la empresa en el RENURE, certificados de antecedentes, traducciones públicas matriculadas y legalizaciones.",
      serviceId: "tax",
    },
    {
      id: "ar-3",
      countryKey: "Argentina",
      category: "Relocation",
      name: "Paquete Settling-In & Home Search (Argentina)",
      scope: "Orientación urbana en destino, búsqueda de vivienda residencial, soporte bancario y acompañamiento integral de llegada.",
      serviceId: "full",
    },

    // Chile
    {
      id: "cl-1",
      countryKey: "Chile",
      category: "Inmigración y Visas",
      name: "Residencia Temporal y Permiso de Trabajo",
      scope: "Gestión ante el Servicio Nacional de Migraciones para visas sujetas a contrato, permisos de corta duración y dependientes.",
      serviceId: "visas",
    },
    {
      id: "cl-2",
      countryKey: "Chile",
      category: "Documentación Local",
      name: "RUT Provisorio / Definitivo y Cédula",
      scope: "Registro ante Policía de Investigaciones (PDI), obtención de Cédula de Identidad chilena y tramitación de RUT ante el SII.",
      serviceId: "tax",
    },
    {
      id: "cl-3",
      countryKey: "Chile",
      category: "Relocation",
      name: "Home Search & School Search (Chile)",
      scope: "Selección y visitas a viviendas residenciales en Santiago y mapeo de colegios internacionales y bilingües para la familia.",
      serviceId: "full",
    },
  ],
};
