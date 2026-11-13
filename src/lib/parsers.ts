export const DEAL_LABEL_MAP: Record<string, { label: string; color: string }> = {
  "29": { label: "Snove", color: "yellow" },
  "30": { label: "Snov", color: "purple" },
  "31": { label: "B2B", color: "blue" },
  "34": { label: "PF | B2C", color: "green" },
  "35": { label: "Form-contato", color: "brown" },
  "36": { label: "WhatsApp", color: "green" },
};

export const PERSON_LABEL_MAP: Record<string, { label: string; color: string }> = {
  "14": { label: "Customer", color: "green" },
  "15": { label: "Hot lead", color: "red" },
  "16": { label: "Warm lead", color: "yellow" },
  "17": { label: "Cold lead", color: "blue" },
  "32": { label: "PF | B2C", color: "green" },
  "33": { label: "B2B", color: "red" },
};

export const ORG_LABEL_MAP: Record<string, { label: string; color: string }> = {
  "10": { label: "Customer", color: "green" },
  "11": { label: "Hot lead", color: "red" },
  "12": { label: "Warm lead", color: "yellow" },
  "13": { label: "Cold lead", color: "blue" },
  "27": { label: "Snove", color: "gray" },
  "28": { label: "Snove", color: "orange" },
  "47": { label: "DOU", color: "blue" },
};

export const CUSTOM_DEAL_KEYS = {
  meeting_reminder: "1a91804bcf3b2c1b142f9119eb8b209799614ce7",
  conversation_context: "5200593051466ebafb560a44a7bd876b1974cd95",
  last_email_sent: "dd96a5da10f8f53b8cddf24e507c9bd273c3703b",
  custom_email_tag: "7ff8b2151d14721e03f01d3d676eb444c6fdd882",
  service_interest: "729bcae2a50ddab699b6fbe0e141fa849dd8523b",
  origin_country: "7b423a4ea43d2eec3629d4af69e5a73122dcd4ac",
  lead_ip: "1b1fe1f0943c5df9d48127e4031c9a2c24dfd999",
  device_info: "0eda6c0d52847aee82adcff0a4e643269471fe1e",
  form_page_url: "77f056c4479e4cbbdba4248a3bce9d81055ed784",
  form_filled: "28b5a59439c144d21b337f33b034462ab1c203fd",
  utm_source: "2c9e9ed529e6f2cd4f1d4dbb8776d8018b09973f",
  utm_medium: "d56e6f38392b69bf8ddc28c14a52a0b7a086a147",
  utm_campaign: "5e8663ed31f56da5c05ab0fa80c7522433500dd4",
  utm_term: "b882a065bf00df6d2364e030a557b5344d99f810",
  utm_content: "6b01584eb08ed06124f788193f6913d71607b698",
  utm_id: "4f9f28281af08b19201d568c466fb15bf9407bcc",
  utm_adgroup: "64328933a2784c372c4d7792fd5c05719a3f103e",
  gclid: "2a1fb5bec9b17707384b860c11e9e9c41bbf1fd5",
  gbraid: "42a0f7c012872c9c43f0b54ac0af9981c6c6a32c",
  segment: "fed16fcc607c79c05258398c906de521d9086d26",
  product_interest: "2577ddd136d5ccd20b056aefbc4ab7217841329c",
  website: "3f7499323bc458fe5e76e86a0f9221cd466e6628",
  meeting_date: "f2e3c3498a3dc781282cd2c3b48c0ee6468fdebb",
  meeting_link: "865d2bb41f5864170ae9e5cfa2bfce94074f58c1",
  cnpj: "d29d609a44183c4f21bea5ce3b94e26bf15f8fea",
  score: "5b9a95c4b24bfd05e50e048252f4372bd709ccc2",
  expat_count: "e45e513c212205e82344d833560bbf3664e02df3",
  dou_act_type: "499fc7ef73b3f52fcbb6d61f4981f872f6c208fa",
  dou_link: "c02384ff994bdbe195c874689e5b0fda91c76785",
  company_size: "ffba452d138ea72d9b6c50ef04d26da60af7a483",
  company_porte: "30f69a6cf02ae705cf4fe8056b33db83e710c7aa",
} as const;

export function stripHtmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function rewritePipedriveAssetLinks(html: string): string {
  if (!html) return "";
  return html.replace(
    /https:\/\/target3\.pipedrive\.com\/api\/v1\/files\/(\d+)\/download/g,
    "/api/files/$1"
  );
}

export type NoteCategory =
  | "dou_authorization"
  | "enrichment_score"
  | "email_sequence"
  | "call_script"
  | "inbound_form"
  | "general";

export interface ParsedExpat {
  name: string;
  country: string;
  birth_date?: string;
  passport?: string;
}

export interface ParsedNoteMeta {
  category: NoteCategory;
  // DOU fields
  expat_count?: number;
  company_name?: string;
  normative_resolution?: string;
  process_number?: string;
  term?: string;
  expats?: ParsedExpat[];
  // Enrichment fields
  score?: number;
  qualified?: boolean;
  criteria?: string;
  rf_status?: string;
  porte?: string;
  cnpj?: string;
  foundation?: string;
  cnae?: string;
  capital?: string;
  phone?: string;
  city?: string;
  partners?: string[];
  linkedin_url?: string;
  // Call script / Email fields
  hook?: string;
  target_contact?: string;
  emails?: Array<{ step: string; subject: string; body: string }>;
}

export function parseNoteContent(rawHtml: string): {
  category: NoteCategory;
  cleanHtml: string;
  meta: ParsedNoteMeta;
} {
  const cleanHtml = rewritePipedriveAssetLinks(rawHtml || "");
  const text = stripHtmlToText(rawHtml || "");

  if (text.includes("COLABORADORES ESTRANGEIROS") || text.includes("autorizacao no DOU")) {
    const countMatch = text.match(/COLABORADORES ESTRANGEIROS\s*\((\d+)\)/i);
    const companyMatch = text.match(/Empresa:\s*(.+)/i);
    const procMatch = text.match(/(.+?)\s*\|\s*Processo:\s*([^\s\n]+)/i);
    const termMatch = text.match(/Prazo:\s*(.+)/i);

    const expats: ParsedExpat[] = [];
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(
        /^\s*\d+\.\s*(.+?)\s*[—–-]\s*([^|]+?)(?:\s*\|\s*Nasc:\s*([^|]+?))?(?:\s*\|\s*Passaporte:\s*(.+))?$/i
      );
      if (m) {
        expats.push({
          name: m[1].trim(),
          country: m[2].trim(),
          birth_date: m[3]?.trim(),
          passport: m[4]?.trim(),
        });
      }
    }

    return {
      category: "dou_authorization",
      cleanHtml,
      meta: {
        category: "dou_authorization",
        expat_count: countMatch ? Number(countMatch[1]) : expats.length || 1,
        company_name: companyMatch?.[1]?.trim(),
        normative_resolution: procMatch?.[1]?.trim(),
        process_number: procMatch?.[2]?.trim(),
        term: termMatch?.[1]?.trim(),
        expats,
      },
    };
  }

  if (text.includes("Score:") && (text.includes("Receita Federal") || text.includes("Critérios:"))) {
    const scoreMatch = text.match(/Score:\s*(\d+)\s*\/\s*100/i);
    const criteriaMatch = text.match(/Critérios:\s*(.+)/i);
    const sitMatch = text.match(/Situação:\s*(.+)/i);
    const porteMatch = text.match(/Porte:\s*(.+)/i);
    const cnpjMatch = text.match(/CNPJ:\s*([^\s\n]+)/i);
    const fundMatch = text.match(/Fundação:\s*(.+)/i);
    const cnaeMatch = text.match(/CNAE:\s*(.+)/i);
    const capMatch = text.match(/Capital:\s*(.+)/i);
    const telMatch = text.match(/Telefone:\s*(.+)/i);
    const cityMatch = text.match(/Cidade:\s*(.+)/i);
    const linkedinMatch = text.match(/https:\/\/www\.linkedin\.com\/company\/[^\s<"]+/i);

    const partners: string[] = [];
    const qsIdx = text.indexOf("Quadro Societário");
    if (qsIdx !== -1) {
      const afterQs = text.slice(qsIdx).split(/\r?\n/).slice(1);
      for (const l of afterQs) {
        const trimmed = l.trim();
        if (!trimmed || trimmed.startsWith("🔗") || trimmed.startsWith("👔") || trimmed.startsWith("🔷") || trimmed.startsWith("👤")) {
          if (partners.length > 0 || trimmed.startsWith("🔗") || trimmed.startsWith("👔")) break;
          continue;
        }
        if (trimmed.includes("—")) {
          partners.push(trimmed);
          if (partners.length >= 12) break;
        }
      }
    }

    const scoreVal = scoreMatch ? Number(scoreMatch[1]) : undefined;
    return {
      category: "enrichment_score",
      cleanHtml,
      meta: {
        category: "enrichment_score",
        score: scoreVal,
        qualified: scoreVal !== undefined ? scoreVal >= 40 : undefined,
        criteria: criteriaMatch?.[1]?.trim(),
        rf_status: sitMatch?.[1]?.trim(),
        porte: porteMatch?.[1]?.trim(),
        cnpj: cnpjMatch?.[1]?.trim(),
        foundation: fundMatch?.[1]?.trim(),
        cnae: cnaeMatch?.[1]?.trim(),
        capital: capMatch?.[1]?.trim(),
        phone: telMatch?.[1]?.trim(),
        city: cityMatch?.[1]?.trim(),
        partners,
        linkedin_url: linkedinMatch?.[0],
      },
    };
  }

  if (text.includes("SEQUÊNCIA DE") && text.includes("E-MAIL")) {
    const hookMatch = text.match(/Gancho:\s*(.+)/i);
    const emails: Array<{ step: string; subject: string; body: string }> = [];
    const blocks = text.split(/━+/);
    for (const block of blocks) {
      const m = block.match(/E-MAIL\s*\d+\s*\([^)]+\)/i);
      if (m) {
        const subjMatch = block.match(/ASSUNTO:\s*(.+)/i);
        const bodyStart = subjMatch ? block.indexOf(subjMatch[0]) + subjMatch[0].length : block.indexOf(m[0]) + m[0].length;
        emails.push({
          step: m[0].trim(),
          subject: subjMatch?.[1]?.trim() || "",
          body: block.slice(bodyStart).trim(),
        });
      }
    }
    return {
      category: "email_sequence",
      cleanHtml,
      meta: {
        category: "email_sequence",
        hook: hookMatch?.[1]?.trim(),
        emails,
      },
    };
  }

  if (text.includes("SCRIPT DE LIGAÇÃO")) {
    const hookMatch = text.match(/Gancho:\s*([^)\n]+)/i);
    const targetMatch = text.match(/Falar com:\s*(.+)/i);
    return {
      category: "call_script",
      cleanHtml,
      meta: {
        category: "call_script",
        hook: hookMatch?.[1]?.trim(),
        target_contact: targetMatch?.[1]?.trim(),
      },
    };
  }

  if (text.includes("Formulário:") || text.includes("Interesse:")) {
    return {
      category: "inbound_form",
      cleanHtml,
      meta: { category: "inbound_form" },
    };
  }

  return {
    category: "general",
    cleanHtml,
    meta: { category: "general" },
  };
}

export function resolveLabelIds(
  rawLabel: unknown,
  map: Record<string, { label: string; color: string }>
): { labelName: string; labelColor: string } {
  if (rawLabel === null || rawLabel === undefined || rawLabel === "") {
    return { labelName: "", labelColor: "" };
  }
  const tokens = String(rawLabel)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const names: string[] = [];
  let firstColor = "";
  for (const t of tokens) {
    const hit = map[t];
    if (hit) {
      names.push(hit.label);
      if (!firstColor) firstColor = hit.color;
    } else {
      names.push(t);
    }
  }
  return { labelName: names.join(", "), labelColor: firstColor };
}

export function parseCsvRecords(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        currentRow.push(currentField);
        currentField = "";
      } else if (ch === "\r") {
        if (content[i + 1] === "\n") i++;
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else if (ch === "\n") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.replace(/^\uFEFF/, "").trim());
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0] === "") continue;
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c] ?? "";
    }
    out.push(obj);
  }
  return out;
}
