export type LandingLocale = "en" | "es" | "pt";

export const LANDING_LOCALES: { code: LandingLocale; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "es", label: "Español", short: "ES" },
  { code: "pt", label: "Português", short: "PT" },
];

export interface LandingCopy {
  htmlLang: string;
  nav: {
    solutions: string;
    catalog: string;
    process: string;
    about: string;
    insights: string;
    faq: string;
    login: string;
    accessCrm: string;
    languageLabel: string;
    mobileLinks: [string, string][];
  };
  hero: {
    locationTag: string;
    modes: {
      id: string;
      tag: string;
      title: string;
      description: string;
      cta: string;
    }[];
    enterCrmBtn: string;
    whatsappHref: string;
    whatsappLabel: string;
  };
  showcase: {
    workspacePath: string;
    globalSearch: string;
    openLiveCrm: string;
    metrics: {
      label: string;
      value: string;
      note: string;
      noteTone: "emerald" | "zinc" | "amber";
      hasRadioIcon?: boolean;
    }[];
    rows: {
      id: number;
      code: string;
      title: string;
      meta: string;
      val: string;
      dot: string;
    }[];
  };
  pillars: {
    code: string;
    title: string;
    description: string;
  }[];
  trusted: {
    eyebrow: string;
    counter: string;
    companies: { name: string; sector: string }[];
  };
  services: {
    badge: string;
    title: string;
    subtitle: string;
    cta: string;
    items: {
      tag: string;
      title: string;
      description: string;
    }[];
  };
  catalog: {
    eyebrow: string;
    title: string;
    subtitle: string;
    openProposalsBtn: string;
    tabs: {
      br: string;
      mxUs: string;
      ar: string;
      cl: string;
    };
    emptyPrefix: string;
    emptyBold: string;
    emptySuffix: string;
    onRequest: string;
  };
  process: {
    eyebrow: string;
    title: string;
    subtitle: string;
    stepPrefix: string;
    steps: {
      step: string;
      title: string;
      description: string;
    }[];
  };
  about: {
    eyebrow: string;
    title: string;
    description: string;
    ctaSpecialist: string;
    ctaPortal: string;
    partnersEyebrow: string;
    partnersTitle: string;
    partners: {
      org: string;
      desc: string;
    }[];
    testimonials: {
      quote: string;
      author: string;
      company: string;
    }[];
  };
  blog: {
    eyebrow: string;
    title: string;
    viewAll: string;
    readMore: string;
    posts: {
      date: string;
      tag: string;
      title: string;
      excerpt: string;
      readTime: string;
    }[];
  };
  faq: {
    eyebrow: string;
    title: string;
    items: { q: string; a: string }[];
  };
  contact: {
    badge: string;
    title: string;
    subtitle: string;
    successTitle: (dealId: number) => string;
    successDescription: string;
    openDealBtn: (dealId: number) => string;
    newRequestBtn: string;
    nameLabel: string;
    namePlaceholder: string;
    companyLabel: string;
    companyPlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    serviceLabel: string;
    serviceOptions: { id: string; label: string; crmTitle: string }[];
    messageLabel: string;
    messagePlaceholder: string;
    validationError: string;
    submitErrorFallback: string;
    originTag: string;
    formTag: string;
    submitIdle: string;
    submitLoading: string;
    officeEyebrow: string;
    officeTitle: string;
    officeDesc: string;
  };
  footer: {
    tagline: string;
    solutions: string;
    process: string;
    about: string;
    login: string;
    crmPortal: string;
    copyright: (year: number) => string;
    stackNote: string;
  };
}

export const LANDING_COPY: Record<LandingLocale, LandingCopy> = {
  en: {
    htmlLang: "en",
    nav: {
      solutions: "Solutions",
      catalog: "Catalog",
      process: "Process",
      about: "About & Partners",
      insights: "Insights",
      faq: "FAQ",
      login: "Login",
      accessCrm: "Open CRM",
      languageLabel: "Language",
      mobileLinks: [
        ["#servicos", "Corporate Solutions"],
        ["#catalogo", "Multi-Country Catalog"],
        ["#etapas", "Process Stages"],
        ["#sobre", "About & Partnerships"],
        ["#blog", "Insights & Blog"],
        ["#faq", "Frequently Asked Questions"],
        ["#contato", "Contact & Assessment"],
      ],
    },
    hero: {
      locationTag: "São Paulo & Global",
      modes: [
        {
          id: "relocation",
          tag: "B2B Corporate Mobility",
          title: "Corporate Relocation with executive precision.",
          description:
            "From work visas and DOU authorizations to housing, school placement, and family integration. We handle global bureaucracy so your HR team stays focused on the business.",
          cta: "Speak with a Specialist",
        },
        {
          id: "immigration",
          tag: "Immigration Law & Compliance",
          title: "Strategic immigration, agile execution, zero bottlenecks.",
          description:
            "Technical representation before the Ministry of Justice, Federal Police, and consulates (Brazil, USA, Mexico, Argentina, and Chile), cutting timelines and eliminating legal exposure.",
          cta: "Request Immigration Assessment",
        },
        {
          id: "endtoend",
          tag: "One-Stop-Shop Platform",
          title: "From arrival to repatriation in one unified workflow.",
          description:
            "Complete expatriate lifecycle management uniting visas, tax advisory, international moving, pet transport, and residential settling-in services.",
          cta: "Book a B2B Consultation",
        },
      ],
      enterCrmBtn: "Sign in to Target CRM",
      whatsappHref:
        "https://wa.me/551125946276?text=Hello!%20I%20would%20like%20to%20speak%20with%20Target%20Relocation.",
      whatsappLabel: "WhatsApp +55 (11) 2594-6276",
    },
    showcase: {
      workspacePath: "target-relocation / workspace / dou-radar",
      globalSearch: "K Global Search",
      openLiveCrm: "Open live CRM →",
      metrics: [
        { label: "Multinationals Served", value: "70+", note: "B2B Active", noteTone: "emerald" },
        { label: "Deals in CRM", value: "4,344", note: "2 pipelines", noteTone: "zinc" },
        {
          label: "Companies & Tax IDs",
          value: "2,973",
          note: "RF Score",
          noteTone: "amber",
          hasRadioIcon: true,
        },
        { label: "Global Services", value: "55+", note: "5 countries", noteTone: "zinc" },
      ],
      rows: [
        {
          id: 3432,
          code: "TR-3432",
          title: "PneuStore / CantuStore — Executive Relocation Proposal (PDF)",
          meta: "Outbound Pipeline • Immigration + Settling-In",
          val: "R$ 62,315",
          dot: "bg-emerald-500",
        },
        {
          id: 3361,
          code: "DOU-3361",
          title: "JSL S.A — Official Gazette Publication RN 02/2017",
          meta: "DOU Radar • Federal Revenue Score 100/100",
          val: "Gold ICP",
          dot: "bg-amber-500",
        },
      ],
    },
    pillars: [
      {
        code: "01",
        title: "Proven Expertise & Transparency",
        description:
          "Built on our partners' first-hand international experience, with clear SLAs, full milestone traceability, and trust from 70+ multinationals.",
      },
      {
        code: "02",
        title: "Complete One-Stop-Shop Solution",
        description:
          "Immigration, Tax, Home Finding, School Hunting, international moving, and pet transport coordinated through one single point of contact.",
      },
      {
        code: "03",
        title: "Consultative Advisory for HR",
        description:
          "We operate as a strategic extension of People Mobility & Compliance, with scalable workflows for individual transfers or large deployments.",
      },
    ],
    trusted: {
      eyebrow: "Companies that trust Target Relocation",
      counter: "70+ multinationals in active operation",
      companies: [
        { name: "JSL S.A.", sector: "Logistics & Transport" },
        { name: "BYD Brasil", sector: "Electric Mobility" },
        { name: "Air France / KLM", sector: "Global Aviation" },
        { name: "PneuStore", sector: "Operations & Retail" },
        { name: "Saipem", sector: "Offshore Engineering" },
        { name: "Colégio Magister", sector: "Education" },
      ],
    },
    services: {
      badge: "FULL PORTFOLIO",
      title: "Relocation & Immigration Solutions",
      subtitle:
        "Complete service architecture for domestic and international executive mobility, backed by end-to-end compliance governance.",
      cta: "Request B2B Proposal",
      items: [
        {
          tag: "IMMIGRATION",
          title: "Visas & Residence Permits",
          description:
            "Work visas (RN 02/2017, RN 03/2017, executives & investors), Federal Police registration, RNM cards, and timely renewals.",
        },
        {
          tag: "CONSULAR",
          title: "End-to-End Immigration Advisory",
          description:
            "Full support across MigranteWeb, Ministry of Foreign Affairs, and consulates for Brazil and outbound markets (USA B1/B2/L1, Mexico, Argentina, Chile).",
        },
        {
          tag: "CITIZENSHIP",
          title: "Citizenship & Naturalization",
          description:
            "Legal and documentary management of ordinary/extraordinary naturalization and citizenship recognition workflows for executives.",
        },
        {
          tag: "LIFECYCLE",
          title: "Strategic Expatriate Management",
          description:
            "Full lifecycle governance — pre-departure, in-country onboarding, renewals, and repatriation — aligned with corporate policy.",
        },
        {
          tag: "TAX & FISCAL",
          title: "Tax Advisory Services",
          description:
            "Foreigner CPF issuance, tax residency orientation, individual filings, and fiscal compliance in Brazil and abroad.",
        },
        {
          tag: "LOGISTICS",
          title: "Domestic & International Moving",
          description:
            "Door-to-door air, sea, and road freight coordination with vetted global partners, inventory control, and customs clearance.",
        },
        {
          tag: "PET RELO",
          title: "International Pet Transport",
          description:
            "Microchipping, rabies serology, veterinary health certificates (CVI), sanitary permits, and safe air transit for family pets.",
        },
        {
          tag: "SETTLING-IN",
          title: "Destination Settling-In Support",
          description:
            "Home finding, school search, bank account opening, driver's license conversion, sworn translations, and cross-cultural coaching.",
        },
      ],
    },
    catalog: {
      eyebrow: "Multi-Country Catalog",
      title: "International Mobility Scope",
      subtitle: "Structured immigration, tax, and settling-in services tailored to your corporate relocation policy.",
      openProposalsBtn: "Request Proposal",
      tabs: {
        br: "Brazil",
        mxUs: "Mexico & USA",
        ar: "Argentina",
        cl: "Chile",
      },
      emptyPrefix: "Contact our specialist team to scope a custom ",
      emptyBold: "Multi-Country Relocation",
      emptySuffix: " plan for your assignees.",
      onRequest: "Request proposal",
    },
    process: {
      eyebrow: "Operational Workflow",
      title: "Our Simplified Relocation Process",
      subtitle:
        "Six standardized stages that eliminate document bottlenecks and deliver predictability for HR and peace of mind for executive families.",
      stepPrefix: "Stage",
      steps: [
        {
          step: "01",
          title: "Profile Assessment & Optimal Visa",
          description:
            "Review of role, project duration, and assignee background to select the fastest Normative Resolution or consular visa track.",
        },
        {
          step: "02",
          title: "Documentation & Filings",
          description:
            "Dual verification of certificates, Hague Apostille legalization, sworn translations, and completion of DS-160 & MigranteWeb filings.",
        },
        {
          step: "03",
          title: "Housing & Residential Setup",
          description:
            "Neighborhood and property curation, accompanied viewings, lease negotiation, move-in inspection, and internet/utility activation.",
        },
        {
          step: "04",
          title: "Schooling & Family Integration",
          description:
            "Search for international and bilingual schools, enrollment support, family reunion visas, and academic diploma validation.",
        },
        {
          step: "05",
          title: "Cross-Cultural Training",
          description:
            "Practical coaching on business etiquette, city logistics, local safety, and cultural norms to accelerate productive onboarding.",
        },
        {
          step: "06",
          title: "Post-Relocation Ongoing Support",
          description:
            "Continuous monitoring of residence expirations (2-year / permanent), contract amendments, and recurring compliance duties in Brazil.",
        },
      ],
    },
    about: {
      eyebrow: "About Target",
      title: "Built from Experience to Deliver Corporate Outcomes",
      description:
        "Founded from our partners' real-world expatriate journeys, Target Relocation turns complex immigration workflows into predictable operations. With 70+ multinationals served, we act as a strategic partner to mitigate regulatory risk and accelerate talent deployment.",
      ctaSpecialist: "Speak with a Specialist",
      ctaPortal: "Access CRM Portal",
      partnersEyebrow: "Institutional Partnerships",
      partnersTitle: "Credibility & Networks That Ensure Compliance",
      partners: [
        {
          org: "ABEMMI",
          desc: "Brazilian Association of International Mobility Specialists.",
        },
        {
          org: "ITALCAM",
          desc: "Italian-Brazilian Chamber of Commerce, Industry & Agriculture.",
        },
        {
          org: "Arab-Brazilian Chamber of Commerce",
          desc: "Institutional support for corporate mobility between Brazil and the Middle East.",
        },
      ],
      testimonials: [
        {
          quote:
            "Target operates with technical clarity and predictability. We cut foreign specialist onboarding lead times and eliminated documentary requests.",
          author: "People Mobility Management",
          company: "Automotive & Logistics Multinational",
        },
        {
          quote:
            "From residence visas and Federal Police registration to home finding and international school placement, their human-centered service made every difference for our executives.",
          author: "Human Resources Directorate",
          company: "Industrial & Energy Group (SP)",
        },
        {
          quote:
            "Transparent scope and direct communication. Centralizing immigration, tax, and settling-in with one partner simplified our entire international operation.",
          author: "Talent Acquisition Coordination",
          company: "Global Operations & Retail",
        },
      ],
    },
    blog: {
      eyebrow: "Immigration Intelligence",
      title: "Global Mobility Insights & Updates",
      viewAll: "View all articles →",
      readMore: "Read more →",
      posts: [
        {
          date: "NOV 13, 2026",
          tag: "Compliance",
          title: "Foreign worker quotas in Venezuela: how many expats can you deploy",
          excerpt:
            "Understand legal ratios for foreign staff inside local entities, technical exemptions, and local workforce balance rules.",
          readTime: "4 min",
        },
        {
          date: "NOV 13, 2026",
          tag: "Brazil Immigration",
          title: "Chinese investor visa in Brazil: requirements & timeline",
          excerpt:
            "Capital investment thresholds, apostilled corporate documents, dependent extensions, processing times, and permit renewals.",
          readTime: "5 min",
        },
        {
          date: "NOV 12, 2026",
          tag: "Family",
          title: "Family reunion in Brazil: spouse & children of expatriates",
          excerpt:
            "Who expatriate professionals can sponsor to Brazil, required civil records, and complete Federal Police registration steps.",
          readTime: "4 min",
        },
      ],
    },
    faq: {
      eyebrow: "Common Questions",
      title: "Frequently Asked Questions",
      items: [
        {
          q: "Why hire a specialized corporate relocation firm?",
          a: "To guarantee legal compliance, predictable timelines and budgets, avoid immigration fines, and let your HR team focus on strategic priorities while specialists run the full journey.",
        },
        {
          q: "What differentiates Target Relocation in the B2B market?",
          a: "100% consultative delivery backed by corporate SLAs. Our experience with 70+ multinationals ensures alignment with global audit and compliance frameworks.",
        },
        {
          q: "Do you work with companies of different sizes?",
          a: "Yes. We build modular scopes ranging from growing firms launching their first international hire to large multinational groups managing high monthly expat volume.",
        },
        {
          q: "How do you handle US visas and outbound destinations?",
          a: "We manage the full process for the USA, Mexico, Argentina, Chile, and Europe: visa category selection, DS-160 / local filings, consular scheduling, dossier prep, and interview coaching.",
        },
        {
          q: "Does Target operate outside São Paulo?",
          a: "Yes. Our headquarters are in Alto da Boa Vista, São Paulo, and we operate nationwide across Brazil while coordinating moves and relocations across every continent.",
        },
        {
          q: "How do we start a project or request a proposal?",
          a: "Submit your project details in the form below or message us on WhatsApp. Your request goes straight into our CRM for technical assessment and multi-country quoting.",
        },
      ],
    },
    contact: {
      badge: "CORPORATE MOBILITY DESK",
      title: "Ready to Simplify Your Team's Global Mobility?",
      subtitle:
        "Share your project scope and timeline. Our specialists will prepare a tailored immigration and relocation plan for your team.",
      successTitle: (id) => `Request logged in CRM (Deal #${id})`,
      successDescription:
        "Organization, contact record, and initial diagnostic note have been saved in Supabase Postgres.",
      openDealBtn: (id) => `Open Deal #${id}`,
      newRequestBtn: "New inquiry",
      nameLabel: "Full name *",
      namePlaceholder: "Your name",
      companyLabel: "Company",
      companyPlaceholder: "Company name",
      emailLabel: "Corporate email *",
      emailPlaceholder: "name@company.com",
      phoneLabel: "Phone / WhatsApp",
      phonePlaceholder: "+55 (11) 99999-9999",
      serviceLabel: "Service of interest",
      serviceOptions: [
        {
          id: "visas",
          label: "Visas & Residence Permits (Brazil / DOU)",
          crmTitle: "Visas & Residence Permits",
        },
        {
          id: "outbound",
          label: "Immigration Advisory & US / Outbound Visas",
          crmTitle: "Immigration Advisory & US Visa",
        },
        {
          id: "full",
          label: "Full Relocation Package (Home + School + Settling-In)",
          crmTitle: "Full Relocation Package",
        },
        {
          id: "tax",
          label: "Expatriate Lifecycle & Tax / CPF Advisory",
          crmTitle: "Expatriate Management & Tax",
        },
        {
          id: "logistics",
          label: "International Moving & Pet Transport",
          crmTitle: "International Moving & Pet Transport",
        },
        {
          id: "citizenship",
          label: "Citizenship & Naturalization",
          crmTitle: "Citizenship & Naturalization",
        },
      ],
      messageLabel: "Project context",
      messagePlaceholder: "Origin, destination, number of assignees, or target start date...",
      validationError: "Please enter your name and corporate email to submit the assessment.",
      submitErrorFallback: "Failed to save contact in CRM",
      originTag: "Target Relocation Landing Page (EN)",
      formTag: "Landing Page Diagnostic Form (EN)",
      submitIdle: "Send Request to Specialist",
      submitLoading: "Saving to CRM...",
      officeEyebrow: "São Paulo • Headquarters",
      officeTitle: "Alto da Boa Vista Office",
      officeDesc:
        "In-person and remote support for multinational HR teams with nationwide Brazilian coverage and vetted international partners.",
    },
    footer: {
      tagline:
        "Target Relocation — Corporate Immigration Advisory, Visas & Global Mobility Solutions.",
      solutions: "Solutions",
      process: "Process",
      about: "About",
      login: "Login",
      crmPortal: "CRM Portal →",
      copyright: (year) => `© ${year} Target Relocation. All rights reserved.`,
      stackNote: "Target Relocation • Corporate Immigration & Global Mobility",
    },
  },

  es: {
    htmlLang: "es",
    nav: {
      solutions: "Soluciones",
      catalog: "Catálogo",
      process: "Proceso",
      about: "Nosotros & Alianzas",
      insights: "Insights",
      faq: "FAQ",
      login: "Login",
      accessCrm: "Abrir CRM",
      languageLabel: "Idioma",
      mobileLinks: [
        ["#servicos", "Soluciones Corporativas"],
        ["#catalogo", "Catálogo Multi-País"],
        ["#etapas", "Etapas del Proceso"],
        ["#sobre", "Nosotros & Alianzas"],
        ["#blog", "Insights & Blog"],
        ["#faq", "Preguntas Frecuentes"],
        ["#contato", "Contacto & Diagnóstico"],
      ],
    },
    hero: {
      locationTag: "São Paulo & Global",
      modes: [
        {
          id: "relocation",
          tag: "Movilidad Corporativa B2B",
          title: "Relocation Corporativo con precisión ejecutiva.",
          description:
            "Desde visas de trabajo y autorizaciones en el DOU hasta vivienda, colegios y adaptación familiar. Nos ocupamos de la burocracia global para que tu equipo de RR. HH. se enfoque en el negocio.",
          cta: "Hablar con Especialista",
        },
        {
          id: "immigration",
          tag: "Compliance & Legislación Migratoria",
          title: "Inmigración estratégica, ágil y cero pendientes.",
          description:
            "Gestión técnica ante el Ministerio de Justicia, Policía Federal y consulados (Brasil, EE. UU., México, Argentina y Chile), acortando plazos y eliminando riesgos legales.",
          cta: "Solicitar Diagnóstico Migratorio",
        },
        {
          id: "endtoend",
          tag: "Plataforma One-Stop-Shop",
          title: "De la llegada a la repatriación en un flujo único.",
          description:
            "Gestión integral de expatriados unificando visas, asesoría fiscal (Tax), mudanza internacional, traslado de mascotas y soporte residencial.",
          cta: "Agendar Reunión B2B",
        },
      ],
      enterCrmBtn: "Ingresar al CRM Target",
      whatsappHref:
        "https://wa.me/551125946276?text=%C2%A1Hola!%20Me%20gustar%C3%ADa%20hablar%20con%20Target%20Relocation.",
      whatsappLabel: "WhatsApp +55 (11) 2594-6276",
    },
    showcase: {
      workspacePath: "target-relocation / workspace / radar-dou",
      globalSearch: "K Búsqueda Global",
      openLiveCrm: "Abrir CRM en vivo →",
      metrics: [
        { label: "Multinacionales Atendidas", value: "+70", note: "B2B Activo", noteTone: "emerald" },
        { label: "Negocios en el CRM", value: "4.344", note: "2 embudos", noteTone: "zinc" },
        {
          label: "Empresas & CNPJs",
          value: "2.973",
          note: "Score RF",
          noteTone: "amber",
          hasRadioIcon: true,
        },
        { label: "Servicios Globales", value: "55+", note: "5 países", noteTone: "zinc" },
      ],
      rows: [
        {
          id: 3432,
          code: "TR-3432",
          title: "PneuStore / CantuStore — Propuesta Relocation Ejecutivo (PDF)",
          meta: "Pipeline Outbound • Inmigración + Settling-In",
          val: "R$ 62.315",
          dot: "bg-emerald-500",
        },
        {
          id: 3361,
          code: "DOU-3361",
          title: "JSL S.A — Publicación Diario Oficial RN 02/2017",
          meta: "Radar DOU • Receita Federal Score 100/100",
          val: "ICP Oro",
          dot: "bg-amber-500",
        },
      ],
    },
    pillars: [
      {
        code: "01",
        title: "Experiencia Comprobada y Transparencia",
        description:
          "Basada en la vivencia internacional real de los socios, con SLA claro, trazabilidad por etapa y confianza de más de 70 multinacionales.",
      },
      {
        code: "02",
        title: "Solución Completa: One-Stop-Shop",
        description:
          "Inmigración, Tax, Home Finding, School Hunting, mudanza internacional y traslado de mascotas coordinados por un único punto de contacto.",
      },
      {
        code: "03",
        title: "Atención Consultiva para RR. HH.",
        description:
          "Operamos como extensión estratégica de People Mobility & Compliance, con flujos escalables para traslados individuales o grandes despliegues.",
      },
    ],
    trusted: {
      eyebrow: "Empresas que confían en Target Relocation",
      counter: "+70 multinacionales en operación",
      companies: [
        { name: "JSL S.A.", sector: "Logística & Transporte" },
        { name: "BYD Brasil", sector: "Movilidad Eléctrica" },
        { name: "Air France / KLM", sector: "Aviación Global" },
        { name: "PneuStore", sector: "Operaciones & Retail" },
        { name: "Saipem", sector: "Ingeniería Offshore" },
        { name: "Colégio Magister", sector: "Educación" },
      ],
    },
    services: {
      badge: "PORTAFOLIO COMPLETO",
      title: "Soluciones de Relocation e Inmigración",
      subtitle:
        "Arquitectura completa de servicios para movilidad nacional e internacional de ejecutivos, con gobernanza documental de punta a punta.",
      cta: "Solicitar Propuesta B2B",
      items: [
        {
          tag: "INMIGRACIÓN",
          title: "Visas y Permisos de Residencia",
          description:
            "Visas de trabajo (RN 02/2017, RN 03/2017, ejecutivos e inversionistas), registro ante la Policía Federal, RNM y renovaciones en plazo.",
        },
        {
          tag: "CONSULAR",
          title: "Asesoría de Inmigración Integral",
          description:
            "Soporte completo ante MigranteWeb, Cancillería y consulados para Brasil y exterior (EE. UU. B1/B2/L1, México, Argentina y Chile).",
        },
        {
          tag: "CIUDADANÍA",
          title: "Ciudadanía y Naturalización",
          description:
            "Gestión jurídica y documental de procesos de naturalización ordinaria/extraordinaria y reconocimiento de ciudadanía para ejecutivos.",
        },
        {
          tag: "LIFECYCLE",
          title: "Gestión Estratégica de Expatriados",
          description:
            "Acompañamiento de todo el ciclo — preembarque, onboarding en destino, renovaciones y repatriación — alineado con la política corporativa.",
        },
        {
          tag: "TAX & FISCAL",
          title: "Consultoría Tributaria (Tax)",
          description:
            "Emisión de CPF para extranjeros, orientación de residencia fiscal, declaraciones y cumplimiento tributario en Brasil y el exterior.",
        },
        {
          tag: "LOGÍSTICA",
          title: "Mudanza Nacional e Internacional",
          description:
            "Coordinación puerta a puerta aérea, marítima y terrestre con aliados globales homologados, inventario y despacho aduanero.",
        },
        {
          tag: "PET RELO",
          title: "Traslado Internacional de Mascotas",
          description:
            "Microchip, serología antirrábica, CVI, permisos sanitarios y logística aérea segura para que perros y gatos viajen con la familia.",
        },
        {
          tag: "SETTLING-IN",
          title: "Soluciones de Soporte en Destino",
          description:
            "Home Finding, búsqueda de colegios, apertura de cuenta bancaria, licencia de conducir, traducciones públicas y entrenamiento intercultural.",
        },
      ],
    },
    catalog: {
      eyebrow: "Catálogo Multi-País",
      title: "Alcance de Movilidad Internacional",
      subtitle: "Servicios estructurados de inmigración, tax y settling-in a medida para su empresa.",
      openProposalsBtn: "Solicitar Propuesta",
      tabs: {
        br: "Brasil",
        mxUs: "México y EE. UU.",
        ar: "Argentina",
        cl: "Chile",
      },
      emptyPrefix: "Consulta con nuestro equipo especialista un plan a medida de ",
      emptyBold: "Movilidad Corporativa",
      emptySuffix: " para tu equipo.",
      onRequest: "Solicitar propuesta",
    },
    process: {
      eyebrow: "Flujo Operativo",
      title: "Nuestro Proceso de Relocation Simplificado",
      subtitle:
        "Seis etapas estandarizadas que eliminan cuellos de botella documentales y aseguran previsibilidad para RR. HH. y tranquilidad para la familia.",
      stepPrefix: "Etapa",
      steps: [
        {
          step: "01",
          title: "Análisis de Perfil & Visa Ideal",
          description:
            "Diagnóstico del cargo, duración del proyecto e historial del colaborador para encuadrarlo en la Resolución Normativa o visa consular más ágil.",
        },
        {
          step: "02",
          title: "Documentación & Formularios",
          description:
            "Doble verificación de certificados, Apostilla de La Haya, traducciones juradas y llenado de formularios como DS-160 y MigranteWeb.",
        },
        {
          step: "03",
          title: "Vivienda & Servicios Residenciales",
          description:
            "Curaduría de barrios e inmuebles, visitas guiadas, negociación de contrato, inspección inicial y activación de internet y servicios.",
        },
        {
          step: "04",
          title: "Integración Escolar & Familia",
          description:
            "Búsqueda de colegios internacionales y bilingües, apoyo en matrículas, visas de reunificación familiar y convalidación de títulos.",
        },
        {
          step: "05",
          title: "Entrenamiento Intercultural",
          description:
            "Sesiones prácticas sobre etiqueta corporativa, rutina urbana, seguridad y cultura local para acelerar la adaptación productiva.",
        },
        {
          step: "06",
          title: "Soporte Post-Relocation",
          description:
            "Monitoreo continuo de vencimientos de residencia (2 años / permanente), adendas contractuales y obligaciones continuas en Brasil.",
        },
      ],
    },
    about: {
      eyebrow: "Sobre Target",
      title: "Nacida de la Experiencia para Generar Resultados Corporativos",
      description:
        "Fundada a partir de la vivencia internacional real de sus socios, Target Relocation convierte procesos migratorios complejos en operaciones previsibles. Con más de 70 multinacionales atendidas, mitigamos riesgos regulatorios y agilizamos el ingreso de talento.",
      ctaSpecialist: "Hablar con Especialista",
      ctaPortal: "Acceder al Portal CRM",
      partnersEyebrow: "Alianzas Institucionales",
      partnersTitle: "Credibilidad y Conexiones que Garantizan Seguridad",
      partners: [
        {
          org: "ABEMMI",
          desc: "Asociación Brasileña de Especialistas en Movilidad Internacional.",
        },
        {
          org: "ITALCAM",
          desc: "Cámara Ítalo-Brasileña de Comercio, Industria y Agricultura.",
        },
        {
          org: "Cámara de Comercio Árabe-Brasileña",
          desc: "Respaldo institucional a la movilidad empresarial Brasil–Medio Oriente.",
        },
      ],
      testimonials: [
        {
          quote:
            "Target opera con claridad técnica y previsibilidad. Redujimos los tiempos de movilización de especialistas extranjeros y eliminamos requerimientos documentales.",
          author: "Gerencia de People Mobility",
          company: "Multinacional Automotriz & Logística",
        },
        {
          quote:
            "Desde la visa de residencia y el registro en la Policía Federal hasta la búsqueda de casa y colegio internacional, el trato humano marcó la diferencia.",
          author: "Dirección de Recursos Humanos",
          company: "Grupo Industrial & Energía (SP)",
        },
        {
          quote:
            "Alcance transparente y comunicación directa. Centralizar inmigración, tax y settling-in con un único aliado simplificó toda nuestra operación.",
          author: "Coordinación de Talent Acquisition",
          company: "Operadora Global & Retail",
        },
      ],
    },
    blog: {
      eyebrow: "Inteligencia Migratoria",
      title: "Insights y Noticias sobre Movilidad Global",
      viewAll: "Ver todos los artículos →",
      readMore: "Leer más →",
      posts: [
        {
          date: "13 NOV 2026",
          tag: "Compliance",
          title: "Cuota de extranjeros en Venezuela: cuántos expatriados trasladar",
          excerpt:
            "Comprende cómo funciona la proporción legal de colaboradores extranjeros en empresas locales, excepciones técnicas y balance de nómina.",
          readTime: "4 min",
        },
        {
          date: "13 NOV 2026",
          tag: "Inmigración BR",
          title: "Visa de inversionista chino en Brasil: cómo funciona",
          excerpt:
            "Requisitos de aporte de capital, documentos apostillados, extensión para dependientes familiares, plazos y renovación.",
          readTime: "5 min",
        },
        {
          date: "12 NOV 2026",
          tag: "Familia",
          title: "Reunificación familiar en Brasil: cónyuge e hijos del expatriado",
          excerpt:
            "A quién puede patrocinar el profesional expatriado en Brasil, actas exigidas y flujo completo de registro ante la Policía Federal.",
          readTime: "4 min",
        },
      ],
    },
    faq: {
      eyebrow: "Dudas Frecuentes",
      title: "Preguntas Frecuentes",
      items: [
        {
          q: "¿Por qué contratar una empresa especializada en relocation corporativo?",
          a: "Para garantizar cumplimiento legal, previsibilidad de costos y plazos, evitar multas migratorias y permitir que RR. HH. se enfoque en decisiones estratégicas.",
        },
        {
          q: "¿Cuál es el diferencial de Target Relocation en el mercado B2B?",
          a: "Operación 100% consultiva con SLA corporativo. Nuestra experiencia con más de 70 multinacionales asegura alineación total con auditorías y compliance global.",
        },
        {
          q: "¿Atienden empresas de distintos tamaños?",
          a: "Sí. Estructuramos paquetes modulares desde compañías en etapa inicial de internacionalización hasta grandes grupos multinacionales con alto volumen mensual.",
        },
        {
          q: "¿Cómo funciona la asesoría para visa estadounidense y otros destinos?",
          a: "Cubrimos todo el proceso para EE. UU., México, Argentina, Chile y Europa: encuadre de categoría, DS-160/formularios, citas consulares y preparación de entrevista.",
        },
        {
          q: "¿La cobertura de Target incluye ciudades fuera de São Paulo?",
          a: "Sí. Nuestra sede está en Alto da Boa Vista, São Paulo, pero operamos en todo Brasil y coordinamos traslados y mudanzas en todos los continentes.",
        },
        {
          q: "¿Cómo iniciar un proyecto o solicitar una propuesta?",
          a: "Envía tu solicitud en el formulario inferior o escríbenos por WhatsApp. El lead ingresa directo en nuestro CRM para diagnóstico técnico y emisión de propuesta.",
        },
      ],
    },
    contact: {
      badge: "MESA CORPORATIVA B2B",
      title: "¿Listo para Simplificar la Movilidad de tu Equipo?",
      subtitle:
        "Comparte el alcance y plazos de tu proyecto. Nuestros especialistas estructurarán un plan migratorio y de relocation a medida.",
      successTitle: (id) => `Solicitud registrada en el CRM (Negocio #${id})`,
      successDescription:
        "Organización, contacto y nota inicial ya quedaron guardados en la base Supabase Postgres.",
      openDealBtn: (id) => `Abrir Negocio #${id}`,
      newRequestBtn: "Nueva solicitud",
      nameLabel: "Nombre completo *",
      namePlaceholder: "Tu nombre",
      companyLabel: "Empresa",
      companyPlaceholder: "Nombre de la empresa",
      emailLabel: "Correo corporativo *",
      emailPlaceholder: "nombre@empresa.com",
      phoneLabel: "Teléfono / WhatsApp",
      phonePlaceholder: "+55 (11) 99999-9999",
      serviceLabel: "Servicio de interés",
      serviceOptions: [
        {
          id: "visas",
          label: "Visas y Permisos de Residencia (Brasil / DOU)",
          crmTitle: "Visas y Permisos de Residencia",
        },
        {
          id: "outbound",
          label: "Asesoría Migratoria & Visa Americana (EE. UU. / Exterior)",
          crmTitle: "Asesoría Migratoria & Visa Americana",
        },
        {
          id: "full",
          label: "Paquete Relocation Completo (Home + School + Settling-In)",
          crmTitle: "Paquete Relocation Completo",
        },
        {
          id: "tax",
          label: "Gestión de Expatriados & Tax / CPF",
          crmTitle: "Gestión de Expatriados & Tax",
        },
        {
          id: "logistics",
          label: "Mudanza Internacional & Traslado de Mascotas",
          crmTitle: "Mudanza Internacional & Mascotas",
        },
        {
          id: "citizenship",
          label: "Ciudadanía y Naturalización",
          crmTitle: "Ciudadanía y Naturalización",
        },
      ],
      messageLabel: "Contexto del proyecto",
      messagePlaceholder: "Origen, destino, cantidad de expatriados o fecha estimada...",
      validationError: "Ingresa tu nombre y correo corporativo para registrar el diagnóstico.",
      submitErrorFallback: "Error al registrar contacto en el CRM",
      originTag: "Landing Page Target Relocation (ES)",
      formTag: "Formulario Diagnóstico Landing Page (ES)",
      submitIdle: "Enviar Solicitud a Especialista",
      submitLoading: "Registrando en el CRM...",
      officeEyebrow: "São Paulo • Casa Matriz",
      officeTitle: "Oficina Alto da Boa Vista",
      officeDesc:
        "Atención presencial y remota para áreas de RR. HH. multinacionales con cobertura en todo Brasil y aliados internacionales homologados.",
    },
    footer: {
      tagline:
        "Target Relocation — Asesoría de Inmigración, Visas y Movilidad Global Corporativa.",
      solutions: "Soluciones",
      process: "Proceso",
      about: "Nosotros",
      login: "Login",
      crmPortal: "Portal CRM →",
      copyright: (year) => `© ${year} Target Relocation. Todos los derechos reservados.`,
      stackNote: "Target Relocation • Corporate Immigration & Global Mobility",
    },
  },

  pt: {
    htmlLang: "pt-BR",
    nav: {
      solutions: "Soluções",
      catalog: "Catálogo",
      process: "Processo",
      about: "Sobre & Parcerias",
      insights: "Insights",
      faq: "FAQ",
      login: "Login",
      accessCrm: "Acessar CRM",
      languageLabel: "Idioma",
      mobileLinks: [
        ["#servicos", "Soluções Corporativas"],
        ["#catalogo", "Catálogo Multi-País"],
        ["#etapas", "Etapas do Processo"],
        ["#sobre", "Sobre & Parcerias"],
        ["#blog", "Insights & Blog"],
        ["#faq", "Perguntas Frequentes"],
        ["#contato", "Contato & Diagnóstico"],
      ],
    },
    hero: {
      locationTag: "São Paulo & Global",
      modes: [
        {
          id: "relocation",
          tag: "Mobilidade Corporativa B2B",
          title: "Relocation Corporativo com precisão executiva.",
          description:
            "Da obtenção de vistos de trabalho e autorizações no DOU até a moradia, escola e adaptação familiar. Cuidamos da burocracia global para seu RH focar no negócio.",
          cta: "Falar com Especialista",
        },
        {
          id: "immigration",
          tag: "Compliance & Legislação Migratória",
          title: "Imigração estratégica, ágil e zero pendências.",
          description:
            "Atuação técnica junto ao Ministério da Justiça, Polícia Federal e consulados (Brasil, EUA, México, Argentina e Chile), reduzindo prazos e eliminando riscos legais.",
          cta: "Solicitar Diagnóstico Migratório",
        },
        {
          id: "endtoend",
          tag: "Plataforma One-Stop-Shop",
          title: "Da chegada à repatriação em fluxo único.",
          description:
            "Gestão completa de expatriados integrando vistos, consultoria tributária (Tax), mudança internacional, transporte de pets e suporte residencial.",
          cta: "Agendar Reunião B2B",
        },
      ],
      enterCrmBtn: "Entrar no CRM Target",
      whatsappHref:
        "https://wa.me/551125946276?text=Ol%C3%A1!%20Gostaria%20de%20falar%20com%20a%20Target%20Relocation.",
      whatsappLabel: "WhatsApp (11) 2594-6276",
    },
    showcase: {
      workspacePath: "target-relocation / workspace / radar-dou",
      globalSearch: "K Busca Global",
      openLiveCrm: "Abrir CRM ao vivo →",
      metrics: [
        { label: "Multinacionais Atendidas", value: "+70", note: "B2B Ativo", noteTone: "emerald" },
        { label: "Negócios no CRM", value: "4.344", note: "2 funis", noteTone: "zinc" },
        {
          label: "Empresas & CNPJs",
          value: "2.973",
          note: "Score RF",
          noteTone: "amber",
          hasRadioIcon: true,
        },
        { label: "Serviços Globais", value: "55+", note: "5 países", noteTone: "zinc" },
      ],
      rows: [
        {
          id: 3432,
          code: "TR-3432",
          title: "PneuStore / CantuStore — Proposta Relocation Executivo (PDF)",
          meta: "Pipeline Outbound • Imigração + Settling-In",
          val: "R$ 62.315",
          dot: "bg-emerald-500",
        },
        {
          id: 3361,
          code: "DOU-3361",
          title: "JSL S.A — Publicação Diário Oficial RN 02/2017",
          meta: "Radar DOU • Receita Federal Score 100/100",
          val: "ICP Ouro",
          dot: "bg-amber-500",
        },
      ],
    },
    pillars: [
      {
        code: "01",
        title: "Expertise Comprovada e Transparência",
        description:
          "Fundada na vivência internacional dos sócios, com SLA claro, rastreabilidade de etapas e autoridade junto a mais de 70 multinacionais.",
      },
      {
        code: "02",
        title: "Solução Completa: One-Stop-Shop",
        description:
          "Imigração, Tax, Home Finding, School Hunting, mudança internacional e transporte de pets coordenados por um único ponto de contato.",
      },
      {
        code: "03",
        title: "Atendimento Consultivo para RH",
        description:
          "Operamos como extensão estratégica de People Mobility & Compliance, com fluxos escaláveis para projetos individuais ou grandes implantações.",
      },
    ],
    trusted: {
      eyebrow: "Empresas que confiam na Target Relocation",
      counter: "+70 multinacionais em operação",
      companies: [
        { name: "JSL S.A.", sector: "Logística & Transporte" },
        { name: "BYD Brasil", sector: "Mobilidade Elétrica" },
        { name: "Air France / KLM", sector: "Aviação Global" },
        { name: "PneuStore", sector: "Operações & Varejo" },
        { name: "Saipem", sector: "Engenharia Offshore" },
        { name: "Colégio Magister", sector: "Educação" },
      ],
    },
    services: {
      badge: "PORTFÓLIO COMPLETO",
      title: "Soluções de Relocação e Imigração",
      subtitle:
        "Arquitetura completa de serviços para mobilidade nacional e internacional de executivos, com governança documental ponta a ponta.",
      cta: "Solicitar Proposta B2B",
      items: [
        {
          tag: "IMIGRAÇÃO",
          title: "Vistos e Autorizações de Residência",
          description:
            "Vistos de trabalho (RN 02/2017, RN 03/2017, executivos e investidores), registro na Polícia Federal, RNM e renovações dentro do prazo.",
        },
        {
          tag: "CONSULAR",
          title: "Assessoria de Imigração Completa",
          description:
            "Suporte completo ao MigranteWeb, Itamaraty e consulados para Brasil e exterior (EUA B1/B2/L1, México, Argentina e Chile).",
        },
        {
          tag: "CIDADANIA",
          title: "Cidadania e Naturalização",
          description:
            "Condução jurídica e documental de processos de naturalização ordinária/extraordinária e reconhecimento de cidadania para executivos.",
        },
        {
          tag: "LIFECYCLE",
          title: "Gestão Estratégica de Expatriados",
          description:
            "Acompanhamento de todo o ciclo — pré-embarque, onboarding no país, renovações e repatriação — alinhado à política global da empresa.",
        },
        {
          tag: "TAX & FISCAL",
          title: "Consultoria Tributária (Tax)",
          description:
            "Emissão de CPF para estrangeiros, orientação fiscal de residência tributária, declarações e conformidade no Brasil e exterior.",
        },
        {
          tag: "LOGÍSTICA",
          title: "Mudança Nacional e Internacional",
          description:
            "Coordenação porta a porta aérea, marítima e rodoviária com parceiros globais homologados, inventário e desembaraço aduaneiro.",
        },
        {
          tag: "PET RELO",
          title: "Transporte Internacional de Pets",
          description:
            "Microchipagem, sorologia antirrábica, CVI, licenças sanitárias e logística aérea segura para cães e gatos acompanharem a família.",
        },
        {
          tag: "SETTLING-IN",
          title: "Soluções de Suporte Adicionais",
          description:
            "Home Finding, busca por escolas, abertura de conta bancária, CNH, traduções juramentadas e treinamento intercultural.",
        },
      ],
    },
    catalog: {
      eyebrow: "Catálogo Multi-País",
      title: "Escopo de Mobilidade Internacional",
      subtitle: "Serviços estruturados de imigração, tax e settling-in sob medida para a política global da sua empresa.",
      openProposalsBtn: "Solicitar Proposta",
      tabs: {
        br: "Brasil",
        mxUs: "México & EUA",
        ar: "Argentina",
        cl: "Chile",
      },
      emptyPrefix: "Fale com nossos especialistas para estruturar um plano de ",
      emptyBold: "Mobilidade Corporativa",
      emptySuffix: " sob medida.",
      onRequest: "Solicitar proposta",
    },
    process: {
      eyebrow: "Workflow Operacional",
      title: "Nosso Processo de Relocation Simplificado",
      subtitle:
        "Seis etapas padronizadas que eliminam gargalos documentais e garantem previsibilidade para o RH e tranquilidade para a família do executivo.",
      stepPrefix: "Etapa",
      steps: [
        {
          step: "01",
          title: "Análise de Perfil & Visto Ideal",
          description:
            "Diagnóstico do cargo, prazo do projeto e histórico do colaborador para enquadramento na Resolução Normativa ou visto consular mais ágil.",
        },
        {
          step: "02",
          title: "Documentação & Formulários",
          description:
            "Conferência dupla de certidões, apostilamento de Haia, traduções juramentadas e preenchimento de formulários como DS-160 e MigranteWeb.",
        },
        {
          step: "03",
          title: "Moradia & Serviços Residenciais",
          description:
            "Curadoria de bairros e imóveis, visitas guiadas, negociação contratual, vistoria de entrada e ativação de internet e utilidades.",
        },
        {
          step: "04",
          title: "Integração Educacional & Família",
          description:
            "Pesquisa de escolas internacionais e bilíngues, apoio em matrículas, vistos de reunião familiar e revalidação de diplomas.",
        },
        {
          step: "05",
          title: "Treinamento Intercultural",
          description:
            "Sessões práticas sobre etiqueta corporativa, rotina urbana, segurança e cultura local para acelerar a adaptação produtiva.",
        },
        {
          step: "06",
          title: "Suporte Pós-Realocação",
          description:
            "Monitoramento contínuo de prazos de residência (2 anos / indeterminado), alterações contratuais e obrigações contínuas no Brasil.",
        },
      ],
    },
    about: {
      eyebrow: "Sobre a Target",
      title: "Nascida da Experiência para Gerar Resultados Corporativos",
      description:
        "Fundada a partir da vivência internacional real dos sócios, a Target Relocation transforma processos migratórios complexos em operações previsíveis. Com mais de 70 multinacionais atendidas, atuamos como investimento estratégico para mitigar riscos regulatórios e agilizar a entrada de talentos no país.",
      ctaSpecialist: "Falar com Especialista",
      ctaPortal: "Acessar Portal CRM",
      partnersEyebrow: "Parcerias Institucionais",
      partnersTitle: "Credibilidade e Conexões que Garantem Segurança",
      partners: [
        {
          org: "ABEMMI",
          desc: "Associação Brasileira de Especialistas em Mobilidade Internacional.",
        },
        {
          org: "ITALCAM",
          desc: "Câmara Ítalo-Brasileira de Comércio, Indústria e Agricultura.",
        },
        {
          org: "Câmara de Comércio Árabe-Brasileira",
          desc: "Suporte institucional à mobilidade empresarial Brasil–Oriente Médio.",
        },
      ],
      testimonials: [
        {
          quote:
            "A Target opera com clareza técnica e previsibilidade. Reduzimos o tempo de mobilização de especialistas estrangeiros e eliminamos exigências documentais.",
          author: "Gerência de People Mobility",
          company: "Multinacional Automotiva & Logística",
        },
        {
          quote:
            "Do visto de residência e registro na Polícia Federal à busca de casa e escola internacional, o atendimento humanizado fez toda a diferença para nossos diretores.",
          author: "Diretoria de Recursos Humanos",
          company: "Grupo Industrial & Energia (SP)",
        },
        {
          quote:
            "Escopo transparente e comunicação direta. Centralizar imigração, tax e settling-in com um único parceiro simplificou toda nossa operação internacional.",
          author: "Coordenação de Talent Acquisition",
          company: "Operadora Global & Varejo",
        },
      ],
    },
    blog: {
      eyebrow: "Inteligência Migratória",
      title: "Insights e Notícias sobre Mobilidade Global",
      viewAll: "Ver todos os artigos →",
      readMore: "Leia mais →",
      posts: [
        {
          date: "13 NOV 2026",
          tag: "Compliance",
          title: "Cota de estrangeiros na Venezuela: quantos expatriados levar",
          excerpt:
            "Entenda como funciona a proporção legal de colaboradores estrangeiros nas empresas, exceções técnicas e equilíbrio de equipe local.",
          readTime: "4 min",
        },
        {
          date: "13 NOV 2026",
          tag: "Imigração BR",
          title: "Visto de investidor chinês no Brasil: como funciona",
          excerpt:
            "Requisitos de aporte de capital, documentação apostilada, extensão para dependentes familiares, prazos e renovação da autorização.",
          readTime: "5 min",
        },
        {
          date: "12 NOV 2026",
          tag: "Família",
          title: "Reunião familiar no Brasil: cônjuge e filhos do expatriado",
          excerpt:
            "Quem o profissional expatriado pode chamar ao Brasil, certidões exigidas e fluxo completo de registro na Polícia Federal.",
          readTime: "4 min",
        },
      ],
    },
    faq: {
      eyebrow: "Dúvidas Frequentes",
      title: "Perguntas Frequentes",
      items: [
        {
          q: "Por que contratar uma empresa especializada em relocation corporativo?",
          a: "Para garantir conformidade legal, previsibilidade de custos e prazos, evitar multas migratórias e permitir que o time de RH foque em decisões estratégicas enquanto especialistas executam toda a jornada.",
        },
        {
          q: "Qual o diferencial da Target Relocation para o mercado B2B?",
          a: "Atuação 100% consultiva com SLA corporativo. Nossa experiência com mais de 70 multinacionais assegura alinhamento direto com políticas globais de compliance e auditoria.",
        },
        {
          q: "Vocês atendem empresas de diferentes portes?",
          a: "Sim. Estruturamos pacotes modulares desde empresas em fase inicial de internacionalização até grandes grupos multinacionais com alto volume mensal de expatriados.",
        },
        {
          q: "Como funciona a assessoria para visto americano e vistos de saída?",
          a: "Cobrimos todo o processo para EUA, México, Argentina, Chile e Europa: enquadramento de categoria, DS-160/formulários locais, agendamento consular, dossiê e preparação para entrevista.",
        },
        {
          q: "A atuação da Target abrange cidades fora de São Paulo?",
          a: "Sim. Nossa sede fica no Alto da Boa Vista em São Paulo, mas operamos em todo o Brasil e coordenamos realocações e mudanças para todos os continentes.",
        },
        {
          q: "Como iniciar um projeto ou solicitar proposta?",
          a: "Envie sua demanda no formulário abaixo ou fale via WhatsApp. O lead entra diretamente no nosso CRM para diagnóstico técnico e emissão de proposta multi-país.",
        },
      ],
    },
    contact: {
      badge: "ATENDIMENTO CORPORATIVO B2B",
      title: "Pronto para Simplificar a Mobilidade da sua Equipe?",
      subtitle:
        "Compartilhe o escopo e os prazos do seu projeto. Nossos especialistas estruturam um plano sob medida de imigração e relocation.",
      successTitle: (id) => `Solicitação registrada no CRM (Negócio #${id})`,
      successDescription:
        "Organização, contato e nota inicial já estão salvos na base Supabase Postgres.",
      openDealBtn: (id) => `Abrir Negócio #${id}`,
      newRequestBtn: "Nova solicitação",
      nameLabel: "Nome completo *",
      namePlaceholder: "Seu nome",
      companyLabel: "Empresa",
      companyPlaceholder: "Nome da empresa",
      emailLabel: "E-mail corporativo *",
      emailPlaceholder: "nome@empresa.com.br",
      phoneLabel: "Telefone / WhatsApp",
      phonePlaceholder: "(11) 99999-9999",
      serviceLabel: "Serviço de interesse",
      serviceOptions: [
        {
          id: "visas",
          label: "Vistos e Autorizações de Residência (Brasil / DOU)",
          crmTitle: "Vistos e Autorizações de Residência",
        },
        {
          id: "outbound",
          label: "Assessoria de Imigração & Visto Americano (EUA / Exterior)",
          crmTitle: "Assessoria de Imigração & Visto Americano",
        },
        {
          id: "full",
          label: "Pacote Relocation Completo (Home + School + Settling-In)",
          crmTitle: "Pacote Relocation Completo",
        },
        {
          id: "tax",
          label: "Gestão de Expatriados & Tax / CPF",
          crmTitle: "Gestão de Expatriados & Tax",
        },
        {
          id: "logistics",
          label: "Mudança Internacional & Transporte de Pets",
          crmTitle: "Mudança Internacional & Transporte de Pets",
        },
        {
          id: "citizenship",
          label: "Cidadania e Naturalização",
          crmTitle: "Cidadania e Naturalização",
        },
      ],
      messageLabel: "Contexto do projeto",
      messagePlaceholder: "Origem, destino, número de expatriados ou prazo estimado...",
      validationError: "Informe seu nome e e-mail corporativo para registrar o diagnóstico.",
      submitErrorFallback: "Falha ao registrar contato no CRM",
      originTag: "Landing Page Target Relocation (PT)",
      formTag: "Formulário Diagnóstico Landing Page (PT)",
      submitIdle: "Enviar Solicitação para Especialista",
      submitLoading: "Registrando no CRM...",
      officeEyebrow: "São Paulo • Matriz",
      officeTitle: "Escritório Alto da Boa Vista",
      officeDesc:
        "Atendimento presencial e remoto para RHs multinacionais com cobertura nacional e parceiros internacionais homologados.",
    },
    footer: {
      tagline:
        "Target Relocation — Assessoria de Imigração, Vistos e Mobilidade Global Corporativa.",
      solutions: "Soluções",
      process: "Processo",
      about: "Sobre",
      login: "Login",
      crmPortal: "Portal CRM →",
      copyright: (year) => `© ${year} Target Relocation. Todos os direitos reservados.`,
      stackNote: "Target Relocation • Corporate Immigration & Global Mobility",
    },
  },
};
