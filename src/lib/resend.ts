import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_RESEND_FROM =
  process.env.RESEND_FROM_EMAIL?.trim() || "Target Relocation <onboarding@resend.dev>";

export interface ResolvedResendConfig {
  apiKey: string | null;
  fromEmail: string;
  source: "workspace_settings" | "env" | "none";
}

/** Resolves Resend API key & default sender address from workspace_settings or env vars. */
export async function resolveResendConfig(
  supabase?: SupabaseClient | null
): Promise<ResolvedResendConfig> {
  let dbKey: string | null = null;
  let dbFrom: string | null = null;

  if (supabase) {
    try {
      const { data } = await supabase
        .from("workspace_settings")
        .select("key, value")
        .in("key", ["resend_api_key", "resend_from_email"]);
      for (const row of data || []) {
        if (row.key === "resend_api_key" && row.value?.trim()) {
          dbKey = row.value.trim();
        }
        if (row.key === "resend_from_email" && row.value?.trim()) {
          dbFrom = row.value.trim();
        }
      }
    } catch {
      // RLS blocks non-admins from reading workspace_settings; fall back cleanly to env vars.
    }
  }

  const envKey = process.env.RESEND_API_KEY?.trim() || null;
  const apiKey = dbKey || envKey;
  const fromEmail = dbFrom || DEFAULT_RESEND_FROM;

  return {
    apiKey,
    fromEmail,
    source: dbKey ? "workspace_settings" : envKey ? "env" : "none",
  };
}

/** Translates Resend sandbox / validation messages into actionable Portuguese diagnostics. */
export function formatResendError(rawMsg: string, fromEmail: string): string {
  const lower = (rawMsg || "").toLowerCase();
  if (lower.includes("testing emails") || lower.includes("verify a domain") || lower.includes("own email address")) {
    return `${rawMsg} (Modo Sandbox Resend ativo com ${fromEmail}: verifique um domínio próprio em 'Domínios & Config' para enviar para outros destinatários externos, ou use seu e-mail da conta Resend / endereços de teste delivered@resend.dev).`;
  }
  return rawMsg || "Falha na comunicação com a API do Resend.";
}

export async function resendApiRequest<T = Record<string, unknown>>(
  apiKey: string,
  endpoint: string,
  init: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {}
): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
  const res = await fetch(`https://api.resend.com${endpoint}`, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { message: text };
  }

  if (!res.ok) {
    const errObj = parsed as { message?: string; name?: string } | null;
    return {
      ok: false,
      status: res.status,
      data: null,
      error: errObj?.message || text || `Resend HTTP ${res.status}`,
    };
  }

  return { ok: true, status: res.status, data: parsed as T, error: null };
}

export interface SendSingleEmailInput {
  apiKey: string;
  from?: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  scheduledAt?: string;
  tags?: Array<{ name: string; value: string }>;
}

/** Sends a single transactional/marketing email through Resend SDK. */
export async function sendEmailViaResend(input: SendSingleEmailInput) {
  const resend = new Resend(input.apiKey);
  const from = (input.from || DEFAULT_RESEND_FROM).trim();
  const toList = Array.isArray(input.to) ? input.to : [input.to];

  const payload = {
    from,
    to: toList,
    subject: input.subject,
    html: input.html || `<p>${(input.text || "").replace(/\n/g, "<br/>")}</p>`,
    text: input.text,
    ...(input.cc && input.cc.length > 0 ? { cc: input.cc } : {}),
    ...(input.bcc && input.bcc.length > 0 ? { bcc: input.bcc } : {}),
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
    ...(input.tags && input.tags.length > 0 ? { tags: input.tags } : {}),
  };

  const { data, error } = await resend.emails.send(payload);
  if (error) {
    return {
      ok: false as const,
      id: null,
      from,
      error: formatResendError(error.message, from),
    };
  }
  return {
    ok: true as const,
    id: data?.id || null,
    from,
    error: null,
  };
}

/** Sends up to 100 individual emails per batch call through Resend SDK. */
export async function sendBatchViaResend(
  apiKey: string,
  items: Array<{
    from?: string;
    to: string[];
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
    tags?: Array<{ name: string; value: string }>;
  }>
) {
  const resend = new Resend(apiKey);
  const { data, error } = await resend.batch.send(
    items.map((it) => ({
      from: (it.from || DEFAULT_RESEND_FROM).trim(),
      to: it.to,
      subject: it.subject,
      html: it.html,
      text: it.text,
      ...(it.replyTo ? { replyTo: it.replyTo } : {}),
      ...(it.tags && it.tags.length > 0 ? { tags: it.tags } : {}),
    }))
  );
  if (error) {
    return { ok: false as const, ids: [] as string[], error: formatResendError(error.message, DEFAULT_RESEND_FROM) };
  }
  const ids = (data?.data || []).map((x) => x.id).filter(Boolean);
  return { ok: true as const, ids, error: null };
}

export function applyTemplateVariables(content: string, vars: Record<string, string>): string {
  let out = content;
  for (const [k, v] of Object.entries(vars)) {
    const safeKey = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\{\\{\\s*${safeKey}\\s*\\}\\}`, "gi"), v);
  }
  return out;
}
