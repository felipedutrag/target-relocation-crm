export type SeoCheckStatus = "good" | "ok" | "bad";
export type SeoGrade = "good" | "ok" | "needs_improvement";

export interface SeoCheckItem {
  id: string;
  group: "seo" | "readability";
  label: string;
  status: SeoCheckStatus;
  score: number;
  maxScore: number;
  detail: string;
  hint: string;
}

export interface SeoAnalyzeInput {
  slug?: string | null;
  title?: string | null;
  question_headline?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  focus_keyword?: string | null;
  direct_answer?: string | null;
  content_html?: string | null;
  content_markdown?: string | null;
  featured_image_url?: string | null;
  featured_image_alt?: string | null;
  faq_schema_json?: unknown;
  author_name?: string | null;
}

export interface SeoAnalysisResult {
  focusKeyword: string;
  seoScore: number;
  readabilityScore: number;
  seoGrade: SeoGrade;
  wordCount: number;
  readingTimeMin: number;
  checks: SeoCheckItem[];
  summary: {
    good: number;
    ok: number;
    bad: number;
  };
}

const STOP_WORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "para",
  "no",
  "na",
  "nos",
  "nas",
  "em",
  "e",
  "o",
  "a",
  "os",
  "as",
  "um",
  "uma",
  "uns",
  "umas",
  "como",
  "que",
  "com",
  "por",
  "se",
  "ao",
  "aos",
  "ou",
  "sobre",
  "qual",
  "quais",
  "quem",
  "quando",
  "onde",
  "seu",
  "sua",
  "seus",
  "suas",
  "entre",
  "guia",
  "the",
  "for",
  "in",
  "on",
  "to",
  "and",
  "of",
  "el",
  "la",
  "los",
  "las",
  "en",
  "del",
  "con",
  "por",
  "y",
]);

/** Normalizes text into lowercase accent-free space-collapsed characters for token matching. */
function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num) || 32));
}

function stripTagsToText(htmlOrMd: string): string {
  return decodeBasicEntities(
    htmlOrMd
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[#>*_`~|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Derives a 2-4 word focus keyphrase from explicit input, slug, or title. */
export function inferFocusKeyword(input: Pick<SeoAnalyzeInput, "focus_keyword" | "slug" | "title">): string {
  const explicit = (input.focus_keyword || "").trim();
  if (explicit) return explicit;

  const slugTokens = normalizeText((input.slug || "").replace(/-/g, " "))
    .split(" ")
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  if (slugTokens.length >= 2) {
    return slugTokens.slice(0, 4).join(" ");
  }

  const titleTokens = normalizeText(input.title || "")
    .split(" ")
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  return titleTokens.slice(0, 4).join(" ") || normalizeText(input.title || input.slug || "imigracao corporativa");
}

function matchKeywordCoverage(haystack: string, keyword: string): number {
  const normHay = normalizeText(haystack).replace(/-/g, " ");
  const normKey = normalizeText(keyword).replace(/-/g, " ");
  if (!normKey) return 0;
  if (normHay.includes(normKey)) return 1;
  const tokens = normKey.split(" ").filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
  if (tokens.length === 0) return normHay.includes(normKey) ? 1 : 0;
  const matched = tokens.filter((t) => normHay.includes(t)).length;
  return matched / tokens.length;
}

function extractParagraphsAndMetrics(input: SeoAnalyzeInput) {
  const html = (input.content_html || "").trim();
  const md = (input.content_markdown || "").trim();

  if (html) {
    const plain = stripTagsToText(html);
    const words = plain ? plain.split(/\s+/).filter(Boolean) : [];
    const headings = (html.match(/<h[2-3]\b/gi) || []).length;
    const imgTags = [...html.matchAll(/<img\b([^>]*)>/gi)].map((m) => m[1]);
    const imgsWithoutAlt = imgTags.filter((attrs) => {
      const altMatch = attrs.match(/\balt=["']([^"']*)["']/i);
      return !altMatch || !altMatch[1].trim();
    }).length;
    const internalLinks = [
      ...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi),
    ].filter((m) => m[1].startsWith("/") || m[1].includes("targetrelocation.com.br")).length;
    const hasList = /<(ul|ol)\b/i.test(html);

    const rawParas = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => stripTagsToText(m[1]))
      .filter((t) => t.length > 0);
    const paragraphs = rawParas.length > 0 ? rawParas : plain ? [plain] : [];

    return {
      plain,
      wordCount: words.length,
      headings,
      inlineImgCount: imgTags.length,
      imgsWithoutAlt,
      internalLinks,
      hasList,
      paragraphs,
    };
  }

  const plain = stripTagsToText(md);
  const words = plain ? plain.split(/\s+/).filter(Boolean) : [];
  const headings = (md.match(/^#{2,3}\s+/gm) || []).length;
  const mdImgs = [...md.matchAll(/!\[([^\]]*)\]\([^)]+\)/g)];
  const imgsWithoutAlt = mdImgs.filter((m) => !m[1].trim()).length;
  const internalLinks = [...md.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].filter(
    (m) => m[1].startsWith("/") || m[1].includes("targetrelocation.com.br")
  ).length;
  const hasList = /^(\s*[-*]|\s*\d+\.)\s+/m.test(md);
  const paragraphs = md
    .split(/\n{2,}/)
    .map((b) => stripTagsToText(b))
    .filter((b) => b.length > 0);

  return {
    plain,
    wordCount: words.length,
    headings,
    inlineImgCount: mdImgs.length,
    imgsWithoutAlt,
    internalLinks,
    hasList,
    paragraphs,
  };
}

/** Computes Yoast-style SEO & Readability scores and detailed actionable checks for any Target blog article. */
export function analyzeArticleSeo(input: SeoAnalyzeInput): SeoAnalysisResult {
  const focusKeyword = inferFocusKeyword(input);
  const seoTitle = (input.seo_title || input.question_headline || input.title || "").trim();
  const metaDesc = (input.seo_description || input.direct_answer || "").trim();
  const slug = (input.slug || "").trim();
  const directAnswer = (input.direct_answer || "").trim();
  const faqCount = Array.isArray(input.faq_schema_json) ? input.faq_schema_json.length : 0;

  const {
    plain,
    wordCount,
    headings,
    inlineImgCount,
    imgsWithoutAlt,
    internalLinks,
    hasList,
    paragraphs,
  } = extractParagraphsAndMetrics(input);

  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));
  const checks: SeoCheckItem[] = [];

  // 1. Focus keyword in SEO title (max 12)
  const titleCov = matchKeywordCoverage(seoTitle, focusKeyword);
  const keyInTitleStart =
    normalizeText(seoTitle).startsWith(normalizeText(focusKeyword).split(" ")[0] || "___");
  const cTitleKw: SeoCheckItem =
    titleCov >= 0.85
      ? {
          id: "focus_in_title",
          group: "seo",
          label: "Palavra-chave foco no Título SEO",
          status: "good",
          score: 12,
          maxScore: 12,
          detail: keyInTitleStart
            ? `A palavra-chave "${focusKeyword}" aparece no início do título.`
            : `Todos os termos de "${focusKeyword}" estão presentes no título SEO.`,
          hint: "Excelente alinhamento semântico para buscadores.",
        }
      : titleCov >= 0.5
        ? {
            id: "focus_in_title",
            group: "seo",
            label: "Palavra-chave foco no Título SEO",
            status: "ok",
            score: 7,
            maxScore: 12,
            detail: `Cobertura parcial (${Math.round(titleCov * 100)}%) de "${focusKeyword}" no título.`,
            hint: "Inclua a frase-chave completa preferencialmente no início do Título SEO.",
          }
        : {
            id: "focus_in_title",
            group: "seo",
            label: "Palavra-chave foco no Título SEO",
            status: "bad",
            score: 0,
            maxScore: 12,
            detail: `A frase-chave "${focusKeyword}" quase não aparece no Título SEO.`,
            hint: "Reescreva o Título SEO incluindo o termo foco buscado pelo RH.",
          };
  checks.push(cTitleKw);

  // 2. SEO Title length (max 10)
  const titleLen = seoTitle.length;
  checks.push(
    titleLen >= 35 && titleLen <= 60
      ? {
          id: "seo_title_length",
          group: "seo",
          label: "Largura do Título SEO (SERP Google)",
          status: "good",
          score: 10,
          maxScore: 10,
          detail: `${titleLen} caracteres (faixa ideal: 35–60).`,
          hint: "Não sofrerá truncamento nos resultados de busca.",
        }
      : titleLen >= 25 && titleLen <= 68
        ? {
            id: "seo_title_length",
            group: "seo",
            label: "Largura do Título SEO (SERP Google)",
            status: "ok",
            score: 6,
            maxScore: 10,
            detail: `${titleLen} caracteres (próximo ao limite de 60 chars).`,
            hint: "Ajuste para 45–58 caracteres para maximizar o CTR no Google.",
          }
        : {
            id: "seo_title_length",
            group: "seo",
            label: "Largura do Título SEO (SERP Google)",
            status: "bad",
            score: 2,
            maxScore: 10,
            detail: `${titleLen} caracteres (${titleLen > 68 ? "muito longo — Google vai cortar" : "muito curto"}).`,
            hint: "Mantenha entre 35 e 60 caracteres.",
          }
  );

  // 3. Meta Description quality + keyword (max 12)
  const descLen = metaDesc.length;
  const descCov = matchKeywordCoverage(metaDesc, focusKeyword);
  checks.push(
    descLen >= 115 && descLen <= 160 && descCov >= 0.6
      ? {
          id: "meta_description",
          group: "seo",
          label: "Meta Description otimizada",
          status: "good",
          score: 12,
          maxScore: 12,
          detail: `${descLen} caracteres com presença da palavra-chave foco.`,
          hint: "Comprimento ideal para snippet no Google.",
        }
      : descLen >= 80 && descLen <= 175
        ? {
            id: "meta_description",
            group: "seo",
            label: "Meta Description otimizada",
            status: "ok",
            score: 7,
            maxScore: 12,
            detail: `${descLen} caracteres (${descCov < 0.6 ? "faltam termos-chave" : "tamanho ajustável"}).`,
            hint: "Mire em 120–155 caracteres incluindo a palavra-chave foco.",
          }
        : {
            id: "meta_description",
            group: "seo",
            label: "Meta Description otimizada",
            status: "bad",
            score: 0,
            maxScore: 12,
            detail: descLen === 0 ? "Meta description ausente." : `${descLen} caracteres (fora da faixa 115–160).`,
            hint: "Escreva uma síntese clara de 120–155 caracteres com CTA técnico.",
          }
  );

  // 4. Slug optimization (max 8)
  const slugCov = matchKeywordCoverage(slug.replace(/-/g, " "), focusKeyword);
  checks.push(
    slug.length > 0 && slug.length <= 75 && slugCov >= 0.6
      ? {
          id: "slug_optimization",
          group: "seo",
          label: "Palavra-chave no Slug da URL",
          status: "good",
          score: 8,
          maxScore: 8,
          detail: `Slug /${slug} (${slug.length} chars) preserva o índice e contém o tema.`,
          hint: "URL limpa e amigável para indexação.",
        }
      : slug.length > 0
        ? {
            id: "slug_optimization",
            group: "seo",
            label: "Palavra-chave no Slug da URL",
            status: "ok",
            score: 5,
            maxScore: 8,
            detail: `Slug /${slug} (${slug.length} chars).`,
            hint: "Slugs importados preservam 100% da indexação existente.",
          }
        : {
            id: "slug_optimization",
            group: "seo",
            label: "Palavra-chave no Slug da URL",
            status: "bad",
            score: 0,
            maxScore: 8,
            detail: "Slug ausente.",
            hint: "Defina um slug curto contendo a palavra-chave.",
          }
  );

  // 5. Focus keyword in introduction / first paragraph (max 10)
  const introText = `${directAnswer} ${paragraphs[0] || ""}`.trim();
  const introCov = matchKeywordCoverage(introText, focusKeyword);
  checks.push(
    introCov >= 0.65
      ? {
          id: "keyword_in_intro",
          group: "seo",
          label: "Palavra-chave na introdução / Resposta Direta",
          status: "good",
          score: 10,
          maxScore: 10,
          detail: `O 1º parágrafo responde diretamente usando os termos de "${focusKeyword}".`,
          hint: "Forte sinal de relevância para Google e respostas GEO (ChatGPT/Perplexity).",
        }
      : introCov >= 0.35
        ? {
            id: "keyword_in_intro",
            group: "seo",
            label: "Palavra-chave na introdução / Resposta Direta",
            status: "ok",
            score: 6,
            maxScore: 10,
            detail: "Presença parcial dos termos foco no parágrafo de abertura.",
            hint: "Reforce o termo exato no bloco de Resposta Direta.",
          }
        : {
            id: "keyword_in_intro",
            group: "seo",
            label: "Palavra-chave na introdução / Resposta Direta",
            status: "bad",
            score: 0,
            maxScore: 10,
            detail: "O termo foco não foi encontrado na introdução.",
            hint: "Comece o artigo respondendo diretamente à pergunta do título com a frase-chave.",
          }
  );

  // 6. Content length (max 12)
  checks.push(
    wordCount >= 600
      ? {
          id: "content_length",
          group: "seo",
          label: "Profundidade e extensão do texto",
          status: "good",
          score: 12,
          maxScore: 12,
          detail: `${wordCount} palavras (~${readingTimeMin} min de leitura).`,
          hint: "Excelente profundidade técnica para ranqueamento orgânico.",
        }
      : wordCount >= 300
        ? {
            id: "content_length",
            group: "seo",
            label: "Profundidade e extensão do texto",
            status: "ok",
            score: 7,
            maxScore: 12,
            detail: `${wordCount} palavras (recomendado >= 600 para autoridade máxima).`,
            hint: "Expanda com checklist documental, prazos MTE/PF e cenários práticos de RH.",
          }
        : {
            id: "content_length",
            group: "seo",
            label: "Profundidade e extensão do texto",
            status: "bad",
            score: 2,
            maxScore: 12,
            detail: `${wordCount} palavras (conteúdo curto < 300 palavras).`,
            hint: "Adicione pelo menos 300–600 palavras com detalhamento regulatório.",
          }
  );

  // 7. Subheadings H2/H3 (max 10)
  checks.push(
    headings >= 2
      ? {
          id: "subheadings",
          group: "seo",
          label: "Estrutura de subtítulos (H2 / H3)",
          status: "good",
          score: 10,
          maxScore: 10,
          detail: `${headings} subtítulos estruturando a leitura.`,
          hint: "Boa escaneabilidade e hierarquia semântica.",
        }
      : headings === 1
        ? {
            id: "subheadings",
            group: "seo",
            label: "Estrutura de subtítulos (H2 / H3)",
            status: "ok",
            score: 5,
            maxScore: 10,
            detail: "Apenas 1 subtítulo detectado.",
            hint: "Adicione mais seções H2/H3 para separar requisitos, documentos e etapas.",
          }
        : {
            id: "subheadings",
            group: "seo",
            label: "Estrutura de subtítulos (H2 / H3)",
            status: "bad",
            score: 0,
            maxScore: 10,
            detail: "Nenhum subtítulo H2/H3 encontrado.",
            hint: "Quebre o texto em blocos com H2/H3 claros.",
          }
  );

  // 8. Featured & Inline Images + ALT attributes (max 10)
  const hasFeatured = Boolean(input.featured_image_url?.trim());
  const hasAltFeatured = !hasFeatured || Boolean(input.featured_image_alt?.trim());
  const totalImgs = (hasFeatured ? 1 : 0) + inlineImgCount;
  const totalMissingAlt = (!hasAltFeatured ? 1 : 0) + imgsWithoutAlt;
  checks.push(
    totalImgs >= 1 && totalMissingAlt === 0
      ? {
          id: "images_alt",
          group: "seo",
          label: "Imagens e atributos ALT",
          status: "good",
          score: 10,
          maxScore: 10,
          detail: `${totalImgs} imagem(ns) hospedada(s) no Supabase com texto ALT preenchido.`,
          hint: "Ótimo para Google Imagens e acessibilidade.",
        }
      : totalImgs >= 1
        ? {
            id: "images_alt",
            group: "seo",
            label: "Imagens e atributos ALT",
            status: "ok",
            score: 6,
            maxScore: 10,
            detail: `${totalImgs} imagem(ns), mas ${totalMissingAlt} sem texto ALT descritivo.`,
            hint: "Preencha o atributo ALT da imagem destacada descrevendo o tema do visto/serviço.",
          }
        : {
            id: "images_alt",
            group: "seo",
            label: "Imagens e atributos ALT",
            status: "bad",
            score: 0,
            maxScore: 10,
            detail: "Nenhuma imagem vinculada a este artigo.",
            hint: "Adicione uma imagem destacada no Supabase Storage e preencha o ALT.",
          }
  );

  // 9. Internal Links / Site Cross-References (max 6)
  checks.push(
    internalLinks >= 2
      ? {
          id: "internal_links",
          group: "seo",
          label: "Links internos no conteúdo",
          status: "good",
          score: 6,
          maxScore: 6,
          detail: `${internalLinks} links internos apontando para outras páginas da Target.`,
          hint: "Fortalece a malha interna de autoridade e retenção.",
        }
      : internalLinks === 1
        ? {
            id: "internal_links",
            group: "seo",
            label: "Links internos no conteúdo",
            status: "ok",
            score: 4,
            maxScore: 6,
            detail: "1 link interno detectado.",
            hint: "Considere linkar outro guia relacionado (ex: RN 02, CPF, RNM).",
          }
        : {
            id: "internal_links",
            group: "seo",
            label: "Links internos no conteúdo",
            status: "bad",
            score: 2,
            maxScore: 6,
            detail: "Sem links internos no corpo do texto (além do CTA de rodapé).",
            hint: "Inclua links internos para páginas relacionadas da Target Relocation.",
          }
  );

  // 10. GEO FAQ Schema & Authorship E-E-A-T (max 10)
  const hasAuthor = Boolean(input.author_name?.trim());
  checks.push(
    faqCount >= 2 && directAnswer.length >= 60 && hasAuthor
      ? {
          id: "geo_schema_authority",
          group: "seo",
          label: "GEO FAQ Schema & Autoria E-E-A-T",
          status: "good",
          score: 10,
          maxScore: 10,
          detail: `${faqCount} perguntas FAQ Schema + resposta direta + autoria (${input.author_name}).`,
          hint: "Estrutura máxima para citação em ChatGPT, Gemini, Perplexity e AI Overviews.",
        }
      : directAnswer.length >= 40 && hasAuthor
        ? {
            id: "geo_schema_authority",
            group: "seo",
            label: "GEO FAQ Schema & Autoria E-E-A-T",
            status: "ok",
            score: 6,
            maxScore: 10,
            detail: `Resposta direta e autor (${input.author_name}) ok, mas faltam FAQs estruturadas (${faqCount}).`,
            hint: "Use 'Otimizar SEO com OpenAI' para gerar 4 perguntas FAQ Schema automaticamente.",
          }
        : {
            id: "geo_schema_authority",
            group: "seo",
            label: "GEO FAQ Schema & Autoria E-E-A-T",
            status: "bad",
            score: 2,
            maxScore: 10,
            detail: "Falta FAQ Schema estruturado e resposta direta no 1º parágrafo.",
            hint: "Complete Resposta Direta + FAQ Schema para pontuar no GEO.",
          }
  );

  // --- READABILITY CHECKS (4 checks totaling 100 normalized) ---
  const sentences = plain
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const longSentences = sentences.filter((s) => s.split(/\s+/).length > 25).length;
  const longSentencePct = sentences.length > 0 ? Math.round((longSentences / sentences.length) * 100) : 0;

  checks.push(
    longSentencePct <= 25
      ? {
          id: "sentence_length",
          group: "readability",
          label: "Comprimento das frases",
          status: "good",
          score: 25,
          maxScore: 25,
          detail: `Apenas ${longSentencePct}% das frases têm mais de 25 palavras (máx: 25%).`,
          hint: "Leitura objetiva e direta para executivos de RH.",
        }
      : longSentencePct <= 35
        ? {
            id: "sentence_length",
            group: "readability",
            label: "Comprimento das frases",
            status: "ok",
            score: 16,
            maxScore: 25,
            detail: `${longSentencePct}% das frases ultrapassam 25 palavras.`,
            hint: "Divida algumas frases longas para melhorar a fluidez.",
          }
        : {
            id: "sentence_length",
            group: "readability",
            label: "Comprimento das frases",
            status: "bad",
            score: 8,
            maxScore: 25,
            detail: `${longSentencePct}% das frases têm > 25 palavras (ideal <= 25%).`,
            hint: "Quebre períodos extensos em frases menores.",
          }
  );

  const longParas = paragraphs.filter((p) => p.split(/\s+/).filter(Boolean).length > 150).length;
  checks.push(
    longParas === 0
      ? {
          id: "paragraph_length",
          group: "readability",
          label: "Tamanho dos parágrafos",
          status: "good",
          score: 25,
          maxScore: 25,
          detail: "Nenhum parágrafo ultrapassa 150 palavras.",
          hint: "Blocos leves e confortáveis em desktop e mobile.",
        }
      : longParas <= 2
        ? {
            id: "paragraph_length",
            group: "readability",
            label: "Tamanho dos parágrafos",
            status: "ok",
            score: 15,
            maxScore: 25,
            detail: `${longParas} parágrafo(s) com mais de 150 palavras.`,
            hint: "Divida parágrafos longos em 2–3 linhas cada.",
          }
        : {
            id: "paragraph_length",
            group: "readability",
            label: "Tamanho dos parágrafos",
            status: "bad",
            score: 6,
            maxScore: 25,
            detail: `${longParas} parágrafos muito extensos (> 150 palavras).`,
            hint: "Reduza o tamanho dos parágrafos para facilitar a leitura rápida.",
          }
  );

  const wordsPerHeading = headings > 0 ? Math.round(wordCount / headings) : wordCount;
  checks.push(
    headings >= 2 && wordsPerHeading <= 350
      ? {
          id: "subheading_distribution",
          group: "readability",
          label: "Distribuição de subtítulos",
          status: "good",
          score: 25,
          maxScore: 25,
          detail: `Média de ~${wordsPerHeading} palavras por subtítulo (limite: 350).`,
          hint: "Seções bem espaçadas ao longo de todo o artigo.",
        }
      : headings >= 1
        ? {
            id: "subheading_distribution",
            group: "readability",
            label: "Distribuição de subtítulos",
            status: "ok",
            score: 15,
            maxScore: 25,
            detail: `Média de ~${wordsPerHeading} palavras por seção.`,
            hint: "Adicione um subtítulo a cada 250–300 palavras.",
          }
        : {
            id: "subheading_distribution",
            group: "readability",
            label: "Distribuição de subtítulos",
            status: "bad",
            score: 5,
            maxScore: 25,
            detail: "Texto sem divisões por subtítulos H2/H3.",
            hint: "Insira subtítulos claros entre os tópicos.",
          }
  );

  checks.push(
    hasList
      ? {
          id: "scannability_lists",
          group: "readability",
          label: "Escaneabilidade (listas & tópicos)",
          status: "good",
          score: 25,
          maxScore: 25,
          detail: "Artigo utiliza listas em tópicos ou numeradas.",
          hint: "Listas aumentam retenção e chance de Featured Snippet.",
        }
      : {
          id: "scannability_lists",
          group: "readability",
          label: "Escaneabilidade (listas & tópicos)",
          status: "ok",
          score: 12,
          maxScore: 25,
          detail: "Nenhuma lista estruturada detectada.",
          hint: "Transforme requisitos ou etapas em lista com marcadores.",
        }
  );

  const seoChecks = checks.filter((c) => c.group === "seo");
  const readChecks = checks.filter((c) => c.group === "readability");

  const seoEarned = seoChecks.reduce((acc, c) => acc + c.score, 0);
  const seoMax = seoChecks.reduce((acc, c) => acc + c.maxScore, 0);
  const seoScore = seoMax > 0 ? Math.min(100, Math.round((seoEarned / seoMax) * 100)) : 0;

  const readEarned = readChecks.reduce((acc, c) => acc + c.score, 0);
  const readMax = readChecks.reduce((acc, c) => acc + c.maxScore, 0);
  const readabilityScore = readMax > 0 ? Math.min(100, Math.round((readEarned / readMax) * 100)) : 0;

  const seoGrade: SeoGrade =
    seoScore >= 75 ? "good" : seoScore >= 50 ? "ok" : "needs_improvement";

  const summary = {
    good: checks.filter((c) => c.status === "good").length,
    ok: checks.filter((c) => c.status === "ok").length,
    bad: checks.filter((c) => c.status === "bad").length,
  };

  return {
    focusKeyword,
    seoScore,
    readabilityScore,
    seoGrade,
    wordCount,
    readingTimeMin,
    checks,
    summary,
  };
}
