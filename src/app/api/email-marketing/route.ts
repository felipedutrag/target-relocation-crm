import { readPrompt, withPromptInstructions } from "@/lib/prompt-store";
import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceUser } from "@/lib/supabase/server";
import { resolveOpenAiClient, TARGET_COMPLIANCE_SYSTEM_PROMPT, slugifyPt } from "@/lib/openai";
import {
  applyTemplateVariables,
  formatResendError,
  resendApiRequest,
  resolveResendConfig,
  sendBatchViaResend,
  sendEmailViaResend,
} from "@/lib/resend";

export const dynamic = "force-dynamic";

function splitEmails(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter((s) => s.includes("@"));
  }
  return String(raw || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
}

function maskResendKey(k: string | null): string | null {
  if (!k) return null;
  if (k.length <= 10) return "re_****";
  return `${k.slice(0, 6)}••••••${k.slice(-4)}`;
}

export async function GET() {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase, member } = auth;

    const cfg = await resolveResendConfig(supabase);

    const [templatesRes, logsRes, personsRes] = await Promise.all([
      supabase.from("email_templates").select("*").order("id", { ascending: true }),
      supabase.from("email_logs").select("*").order("created_at", { ascending: false }).limit(120),
      supabase
        .from("persons")
        .select("id, name, primary_email, org_name, org_id, label_name")
        .not("primary_email", "is", null)
        .neq("primary_email", "")
        .limit(400),
    ]);

    let domains: unknown[] = [];
    let audiences: unknown[] = [];
    let broadcasts: unknown[] = [];
    let remoteEmails: unknown[] = [];
    let resendError: string | null = null;

    if (cfg.apiKey) {
      const [domRes, audRes, bcastRes, emailsRes] = await Promise.all([
        resendApiRequest<{ data?: unknown[] }>(cfg.apiKey, "/domains"),
        resendApiRequest<{ data?: unknown[] }>(cfg.apiKey, "/audiences"),
        resendApiRequest<{ data?: unknown[] }>(cfg.apiKey, "/broadcasts"),
        resendApiRequest<{ data?: unknown[] }>(cfg.apiKey, "/emails"),
      ]);
      if (domRes.ok) domains = domRes.data?.data || [];
      else resendError = domRes.error;
      if (audRes.ok) audiences = audRes.data?.data || [];
      if (bcastRes.ok) broadcasts = bcastRes.data?.data || [];
      if (emailsRes.ok) remoteEmails = emailsRes.data?.data || [];
    }

    const logs = logsRes.data || [];
    const totalSent = logs.length;
    const delivered = logs.filter((l) => ["delivered", "opened", "clicked"].includes(l.status)).length;
    const opened = logs.filter((l) => l.opens_count > 0 || l.status === "opened" || l.status === "clicked").length;
    const clicked = logs.filter((l) => l.clicks_count > 0 || l.status === "clicked").length;
    const bounced = logs.filter((l) => ["bounced", "complained", "failed"].includes(l.status)).length;

    return NextResponse.json({
      configured: Boolean(cfg.apiKey),
      source: cfg.source,
      maskedKey: maskResendKey(cfg.apiKey),
      fromEmail: cfg.fromEmail,
      isSandbox: cfg.fromEmail.includes("onboarding@resend.dev"),
      isAdmin: member.role === "admin" || member.role === "ops",
      resendError,
      domains,
      audiences,
      broadcasts,
      remoteEmails,
      templates: templatesRes.data || [],
      logs,
      crmContacts: personsRes.data || [],
      stats: { totalSent, delivered, opened, clicked, bounced },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase, member, user } = auth;

    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action || "");
    const cfg = await resolveResendConfig(supabase);

    if (action === "save_settings") {
      if (member.role !== "admin" && member.role !== "ops") {
        return NextResponse.json({ error: "Apenas Klaus ou Felipe podem salvar chaves Resend." }, { status: 403 });
      }
      const now = new Date().toISOString();
      const upserts: Array<{ key: string; value: string; updated_by: string; updated_at: string }> = [];
      if (typeof body.apiKey === "string" && body.apiKey.trim()) {
        upserts.push({ key: "resend_api_key", value: body.apiKey.trim(), updated_by: user!.id, updated_at: now });
      }
      if (typeof body.fromEmail === "string" && body.fromEmail.trim()) {
        upserts.push({ key: "resend_from_email", value: body.fromEmail.trim(), updated_by: user!.id, updated_at: now });
      }
      if (upserts.length > 0) {
        const { error } = await supabase.from("workspace_settings").upsert(upserts, { onConflict: "key" });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "save_template") {
      const name = String(body.name || "").trim();
      const subject = String(body.subject || "").trim();
      const htmlContent = String(body.html_content || "").trim();
      if (!name || !subject || !htmlContent) {
        return NextResponse.json({ error: "Nome, assunto e HTML são obrigatórios." }, { status: 400 });
      }
      const slug = slugifyPt(String(body.slug || name)) || `tpl-${Date.now()}`;
      const varsMatches = [...htmlContent.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]);
      const uniqueVars = [...new Set(varsMatches)];

      const { data, error } = await supabase
        .from("email_templates")
        .upsert(
          {
            slug,
            name,
            category: String(body.category || "Institucional"),
            subject,
            preview_text: String(body.preview_text || ""),
            html_content: htmlContent,
            text_content: String(body.text_content || ""),
            variables_json: uniqueVars,
            created_by: member.full_name,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "slug" }
        )
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, template: data });
    }

    if (action === "generate_ai_email") {
      const ai = await resolveOpenAiClient(supabase);
      if (!ai.client) {
        return NextResponse.json({ error: "Configure sua OpenAI API Key para gerar e-mails com IA.", aiRequired: true }, { status: 400 });
      }
      const goal = String(body.goal || "").trim() || "Newsletter técnica mensal para RH de multinacionais sobre vistos e MTE";
      const completion = await ai.client.chat.completions.create({
        model: ai.model,
        response_format: { type: "json_object" },
        temperature: 0.35,
        messages: [
          {
            role: "system",
            content: `${withPromptInstructions(TARGET_COMPLIANCE_SYSTEM_PROMPT, await readPrompt(supabase, "email"))}\nCrie um e-mail marketing HTML responsivo (inline CSS elegante, largura máxima 600px, tipografia limpa sem spamwords). Suporte as variáveis {{nome}} e {{empresa}} se fizer sentido.`,
          },
          {
            role: "user",
            content: `Objetivo da campanha de e-mail: ${goal}\n\nRetorne JSON:\n{"subject":"Assunto claro sem exagero","preview_text":"Texto de pré-visualização (max 90 chars)","html_content":"<div style='font-family:Inter,Arial,sans-serif;...'>...</div>","text_content":"Versão em texto puro"}`,
          },
        ],
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
      return NextResponse.json({ success: true, generated: parsed });
    }

    if (!cfg.apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY não configurada." }, { status: 400 });
    }

    if (action === "send_email") {
      const to = splitEmails(body.to);
      if (to.length === 0) return NextResponse.json({ error: "Informe pelo menos 1 destinatário válido." }, { status: 400 });
      const subject = String(body.subject || "").trim();
      const rawHtml = String(body.html || "").trim();
      const rawText = String(body.text || "").trim();
      if (!subject || (!rawHtml && !rawText)) {
        return NextResponse.json({ error: "Assunto e conteúdo (HTML ou texto) são obrigatórios." }, { status: 400 });
      }

      const vars: Record<string, string> = {
        nome: String(body.var_nome || to[0].split("@")[0]),
        empresa: String(body.var_empresa || "sua empresa"),
      };
      const html = rawHtml ? applyTemplateVariables(rawHtml, vars) : undefined;
      const text = rawText ? applyTemplateVariables(rawText, vars) : undefined;
      const finalSubject = applyTemplateVariables(subject, vars);

      const cc = splitEmails(body.cc);
      const bcc = splitEmails(body.bcc);
      const replyTo = typeof body.replyTo === "string" && body.replyTo.trim() ? body.replyTo.trim() : undefined;
      const scheduledAt = typeof body.scheduledAt === "string" && body.scheduledAt.trim() ? body.scheduledAt.trim() : undefined;
      const tags = Array.isArray(body.tags)
        ? (body.tags as Array<{ name: string; value: string }>)
        : [{ name: "source", value: "target_crm" }];

      const res = await sendEmailViaResend({
        apiKey: cfg.apiKey,
        from: typeof body.from === "string" && body.from.trim() ? body.from.trim() : cfg.fromEmail,
        to,
        subject: finalSubject,
        html,
        text,
        cc,
        bcc,
        replyTo,
        scheduledAt,
        tags,
      });

      await supabase.rpc("log_resend_email", {
        p_payload: {
          resend_email_id: res.id || `err-${Date.now()}`,
          source: "dashboard",
          from_email: res.from,
          to_emails: to,
          cc_emails: cc,
          bcc_emails: bcc,
          reply_to: replyTo || null,
          subject: finalSubject,
          html_body: html || null,
          text_body: text || null,
          status: res.ok ? (scheduledAt ? "scheduled" : "sent") : "failed",
          scheduled_at: scheduledAt || null,
          sent_by_name: member.full_name,
          sent_by_email: member.email,
          deal_id: body.deal_id ? Number(body.deal_id) : null,
          person_id: body.person_id ? Number(body.person_id) : null,
          template_id: body.template_id ? Number(body.template_id) : null,
          tags_json: tags,
          error_message: res.error,
        },
      });

      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true, id: res.id });
    }

    if (action === "send_batch") {
      const recipientsRaw = Array.isArray(body.recipients) ? (body.recipients as Array<{ email: string; name?: string; company?: string }>) : [];
      const recipients = recipientsRaw.filter((r) => r.email && r.email.includes("@")).slice(0, 100);
      if (recipients.length === 0) return NextResponse.json({ error: "Nenhum destinatário válido para lote." }, { status: 400 });
      const subject = String(body.subject || "").trim();
      const rawHtml = String(body.html || "").trim();
      const from = typeof body.from === "string" && body.from.trim() ? body.from.trim() : cfg.fromEmail;

      const items = recipients.map((r) => {
        const vars = { nome: r.name || r.email.split("@")[0], empresa: r.company || "sua empresa" };
        return {
          from,
          to: [r.email.trim()],
          subject: applyTemplateVariables(subject, vars),
          html: applyTemplateVariables(rawHtml, vars),
          tags: [{ name: "campaign", value: "crm_batch" }],
        };
      });

      const res = await sendBatchViaResend(cfg.apiKey, items);
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });

      for (let i = 0; i < items.length; i++) {
        await supabase.rpc("log_resend_email", {
          p_payload: {
            resend_email_id: res.ids[i] || `batch-${Date.now()}-${i}`,
            source: "batch",
            from_email: from,
            to_emails: items[i].to,
            subject: items[i].subject,
            html_body: items[i].html,
            status: "sent",
            sent_by_name: member.full_name,
            sent_by_email: member.email,
            tags_json: items[i].tags,
          },
        });
      }
      return NextResponse.json({ success: true, count: res.ids.length, ids: res.ids });
    }

    if (action === "create_audience") {
      const name = String(body.name || "").trim();
      if (!name) return NextResponse.json({ error: "Nome da audiência obrigatório." }, { status: 400 });
      const res = await resendApiRequest(cfg.apiKey, "/audiences", { method: "POST", body: { name } });
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true, audience: res.data });
    }

    if (action === "delete_audience") {
      const audienceId = String(body.audienceId || "").trim();
      const res = await resendApiRequest(cfg.apiKey, `/audiences/${encodeURIComponent(audienceId)}`, { method: "DELETE" });
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "list_contacts") {
      const audienceId = String(body.audienceId || "").trim();
      const res = await resendApiRequest<{ data?: unknown[] }>(cfg.apiKey, `/audiences/${encodeURIComponent(audienceId)}/contacts`);
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true, contacts: res.data?.data || [] });
    }

    if (action === "add_contact") {
      const audienceId = String(body.audienceId || "").trim();
      const email = String(body.email || "").trim();
      if (!audienceId || !email.includes("@")) return NextResponse.json({ error: "Audiência e e-mail válido obrigatórios." }, { status: 400 });
      const res = await resendApiRequest(cfg.apiKey, `/audiences/${encodeURIComponent(audienceId)}/contacts`, {
        method: "POST",
        body: {
          email,
          first_name: String(body.firstName || ""),
          last_name: String(body.lastName || ""),
          unsubscribed: false,
        },
      });
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true, contact: res.data });
    }

    if (action === "delete_contact") {
      const audienceId = String(body.audienceId || "").trim();
      const contactId = String(body.contactId || "").trim();
      const res = await resendApiRequest(
        cfg.apiKey,
        `/audiences/${encodeURIComponent(audienceId)}/contacts/${encodeURIComponent(contactId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "sync_crm_contacts") {
      const audienceId = String(body.audienceId || "").trim();
      const limit = Math.min(50, Math.max(1, Number(body.limit || 25)));
      if (!audienceId) return NextResponse.json({ error: "Selecione uma audiência." }, { status: 400 });
      const { data: people } = await supabase
        .from("persons")
        .select("name, primary_email")
        .not("primary_email", "is", null)
        .neq("primary_email", "")
        .limit(limit);

      let synced = 0;
      for (const p of people || []) {
        const email = String(p.primary_email || "").trim();
        if (!email.includes("@")) continue;
        const parts = String(p.name || "").trim().split(/\s+/);
        const r = await resendApiRequest(cfg.apiKey, `/audiences/${encodeURIComponent(audienceId)}/contacts`, {
          method: "POST",
          body: {
            email,
            first_name: parts[0] || "",
            last_name: parts.slice(1).join(" "),
            unsubscribed: false,
          },
        });
        if (r.ok) synced++;
      }
      return NextResponse.json({ success: true, synced });
    }

    if (action === "create_broadcast") {
      const audienceId = String(body.audienceId || "").trim();
      const subject = String(body.subject || "").trim();
      const html = String(body.html || "").trim();
      const from = typeof body.from === "string" && body.from.trim() ? body.from.trim() : cfg.fromEmail;
      if (!audienceId || !subject || !html) {
        return NextResponse.json({ error: "Audiência, assunto e HTML são obrigatórios para criar Broadcast." }, { status: 400 });
      }
      const res = await resendApiRequest(cfg.apiKey, "/broadcasts", {
        method: "POST",
        body: {
          audience_id: audienceId,
          from,
          subject,
          html,
          name: String(body.name || subject).slice(0, 80),
        },
      });
      if (!res.ok) return NextResponse.json({ error: formatResendError(res.error || "", from) }, { status: 400 });
      return NextResponse.json({ success: true, broadcast: res.data });
    }

    if (action === "send_broadcast") {
      const broadcastId = String(body.broadcastId || "").trim();
      const res = await resendApiRequest(cfg.apiKey, `/broadcasts/${encodeURIComponent(broadcastId)}/send`, {
        method: "POST",
        body: body.scheduledAt ? { scheduled_at: String(body.scheduledAt) } : {},
      });
      if (!res.ok) return NextResponse.json({ error: formatResendError(res.error || "", cfg.fromEmail) }, { status: 400 });
      return NextResponse.json({ success: true, result: res.data });
    }

    if (action === "delete_broadcast") {
      const broadcastId = String(body.broadcastId || "").trim();
      const res = await resendApiRequest(cfg.apiKey, `/broadcasts/${encodeURIComponent(broadcastId)}`, { method: "DELETE" });
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "add_domain") {
      const name = String(body.name || "").trim();
      if (!name) return NextResponse.json({ error: "Domínio obrigatório (ex: targetrelocation.com.br)." }, { status: 400 });
      const res = await resendApiRequest(cfg.apiKey, "/domains", {
        method: "POST",
        body: { name, region: String(body.region || "sa-east-1") },
      });
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true, domain: res.data });
    }

    if (action === "verify_domain") {
      const domainId = String(body.domainId || "").trim();
      const res = await resendApiRequest(cfg.apiKey, `/domains/${encodeURIComponent(domainId)}/verify`, { method: "POST" });
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true, result: res.data });
    }

    if (action === "delete_domain") {
      const domainId = String(body.domainId || "").trim();
      const res = await resendApiRequest(cfg.apiKey, `/domains/${encodeURIComponent(domainId)}`, { method: "DELETE" });
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "cancel_email") {
      const emailId = String(body.emailId || "").trim();
      const res = await resendApiRequest(cfg.apiKey, `/emails/${encodeURIComponent(emailId)}/cancel`, { method: "POST" });
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      await supabase.from("email_logs").update({ status: "canceled" }).eq("resend_email_id", emailId);
      return NextResponse.json({ success: true });
    }

    if (action === "refresh_email") {
      const emailId = String(body.emailId || "").trim();
      const res = await resendApiRequest<{ last_event?: string }>(cfg.apiKey, `/emails/${encodeURIComponent(emailId)}`);
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      if (res.data?.last_event) {
        await supabase.from("email_logs").update({ status: res.data.last_event }).eq("resend_email_id", emailId);
      }
      return NextResponse.json({ success: true, email: res.data });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
