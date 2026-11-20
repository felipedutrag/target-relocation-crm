"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  Copy,
  Globe,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  Users,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

function applyTemplateVariables(content: string, vars: Record<string, string>): string {
  let out = content;
  for (const [k, v] of Object.entries(vars)) {
    const safeKey = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\{\\{\\s*${safeKey}\\s*\\}\\}`, "gi"), v);
  }
  return out;
}

interface EmailTemplate {
  id: number;
  slug: string;
  name: string;
  category: string;
  subject: string;
  preview_text: string;
  html_content: string;
  text_content: string;
  variables_json: string[];
}

interface EmailLog {
  id: number;
  resend_email_id: string | null;
  source: string;
  from_email: string;
  to_emails: string[];
  subject: string;
  html_body: string | null;
  status: string;
  scheduled_at: string | null;
  sent_by_name: string | null;
  opens_count: number;
  clicks_count: number;
  error_message: string | null;
  created_at: string;
}

interface ResendAudience {
  id: string;
  name: string;
  created_at: string;
}

interface ResendContact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribed?: boolean;
  created_at?: string;
}

interface ResendDomainRecord {
  record: string;
  name: string;
  type: string;
  ttl?: string;
  value: string;
  status: string;
}

interface ResendDomain {
  id: string;
  name: string;
  status: string;
  region: string;
  created_at: string;
  records?: ResendDomainRecord[];
}

interface ResendBroadcast {
  id: string;
  name: string;
  audience_id: string;
  status: string;
  subject?: string;
  created_at: string;
  sent_at?: string | null;
}

interface CrmContact {
  id: number;
  name: string;
  primary_email: string;
  org_name: string | null;
  label_name: string | null;
}

function getEmailStatusBadge(status: string): { label: string; className: string } {
  const s = (status || "").toLowerCase();
  if (s === "delivered" || s === "opened" || s === "clicked" || s === "verified") {
    return {
      label: s === "clicked" ? "Clicado" : s === "opened" ? "Aberto" : s === "verified" ? "Verificado" : "Entregue",
      className:
        "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300",
    };
  }
  if (s === "scheduled" || s === "queued" || s === "pending") {
    return {
      label: s === "scheduled" ? "Agendado" : "Na fila",
      className:
        "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300",
    };
  }
  if (s === "bounced" || s === "complained" || s === "failed" || s === "canceled") {
    return {
      label: s === "bounced" ? "Bounce" : s === "canceled" ? "Cancelado" : s === "complained" ? "Spam" : "Falhou",
      className:
        "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-300",
    };
  }
  return {
    label: status || "Enviado",
    className:
      "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300",
  };
}

export function EmailMarketingView({ onOpenAiSettings }: { onOpenAiSettings: () => void }) {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [fromEmail, setFromEmail] = useState("Target Relocation <onboarding@resend.dev>");
  const [isSandbox, setIsSandbox] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const [domains, setDomains] = useState<ResendDomain[]>([]);
  const [audiences, setAudiences] = useState<ResendAudience[]>([]);
  const [broadcasts, setBroadcasts] = useState<ResendBroadcast[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [crmContacts, setCrmContacts] = useState<CrmContact[]>([]);
  const [stats, setStats] = useState({ totalSent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 });

  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Composer state
  const [sendMode, setSendMode] = useState<"single" | "batch">("single");
  const [composerFrom, setComposerFrom] = useState("");
  const [toInput, setToInput] = useState("");
  const [ccInput, setCcInput] = useState("");
  const [bccInput, setBccInput] = useState("");
  const [replyToInput, setReplyToInput] = useState("klaus@targetrelocation.com.br");
  const [scheduledAtInput, setScheduledAtInput] = useState("");
  const [varNome, setVarNome] = useState("Diretor(a) de RH");
  const [varEmpresa, setVarEmpresa] = useState("Empresa ICP");
  const [subject, setSubject] = useState("Target Relocation — Compliance Migratório no Brasil");
  const [htmlBody, setHtmlBody] = useState(
    '<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;color:#18181b;border:1px solid #e4e4e7;border-radius:12px;"><h1 style="font-size:20px;margin:0 0 12px;">Olá {{nome}},</h1><p style="font-size:14px;line-height:1.65;color:#3f3f46;">Conteúdo oficial Target Relocation enviado via Resend para a <strong>{{empresa}}</strong>.</p></div>'
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [aiGoal, setAiGoal] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [sending, setSending] = useState(false);

  // Batch contacts selected
  const [selectedBatchEmails, setSelectedBatchEmails] = useState<string[]>([]);

  // Broadcast state
  const [bcastAudienceId, setBcastAudienceId] = useState("");
  const [bcastName, setBcastName] = useState("");
  const [bcastSubject, setBcastSubject] = useState("");
  const [bcastHtml, setBcastHtml] = useState("");
  const [busyBcast, setBusyBcast] = useState(false);

  // Audience & Contacts state
  const [newAudienceName, setNewAudienceName] = useState("");
  const [activeAudienceId, setActiveAudienceId] = useState("");
  const [audienceContacts, setAudienceContacts] = useState<ResendContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactFirst, setContactFirst] = useState("");
  const [contactLast, setContactLast] = useState("");
  const [syncingCrm, setSyncingCrm] = useState(false);

  // Template editor state
  const [tplName, setTplName] = useState("");
  const [tplCategory, setTplCategory] = useState("Outbound DOU");
  const [tplSubject, setTplSubject] = useState("");
  const [tplHtml, setTplHtml] = useState("");
  const [savingTpl, setSavingTpl] = useState(false);

  // Domain & Settings state
  const [newDomainName, setNewDomainName] = useState("");
  const [newDomainRegion, setNewDomainRegion] = useState("sa-east-1");
  const [cfgApiKey, setCfgApiKey] = useState("");
  const [cfgFromEmail, setCfgFromEmail] = useState("");
  const [savingCfg, setSavingCfg] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Logs filter
  const [logSourceFilter, setLogSourceFilter] = useState("all");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/email-marketing");
      const json = await res.json();
      setConfigured(Boolean(json.configured));
      setMaskedKey(json.maskedKey || null);
      setFromEmail(json.fromEmail || "Target Relocation <onboarding@resend.dev>");
      setComposerFrom((prev) => prev || json.fromEmail || "Target Relocation <onboarding@resend.dev>");
      setCfgFromEmail((prev) => prev || json.fromEmail || "Target Relocation <onboarding@resend.dev>");
      setIsSandbox(Boolean(json.isSandbox));
      setIsAdmin(Boolean(json.isAdmin));
      setResendError(json.resendError || null);
      setDomains(json.domains || []);
      setAudiences(json.audiences || []);
      setBroadcasts(json.broadcasts || []);
      setTemplates(json.templates || []);
      setLogs(json.logs || []);
      setCrmContacts(json.crmContacts || []);
      if (json.stats) setStats(json.stats);
      if (Array.isArray(json.audiences) && json.audiences.length > 0) {
        setActiveAudienceId((prev) => prev || json.audiences[0].id);
        setBcastAudienceId((prev) => prev || json.audiences[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadAudienceContacts = useCallback(async (audId: string) => {
    if (!audId) return;
    setLoadingContacts(true);
    try {
      const res = await fetch("/api/email-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_contacts", audienceId: audId }),
      });
      const json = await res.json();
      if (res.ok) setAudienceContacts(json.contacts || []);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    if (activeAudienceId) loadAudienceContacts(activeAudienceId);
  }, [activeAudienceId, loadAudienceContacts]);

  const liveRenderedHtml = useMemo(
    () => applyTemplateVariables(htmlBody, { nome: varNome, empresa: varEmpresa }),
    [htmlBody, varNome, varEmpresa]
  );

  const filteredLogs = useMemo(
    () => logs.filter((l) => logSourceFilter === "all" || l.source === logSourceFilter),
    [logs, logSourceFilter]
  );

  function applyTemplateToComposer(tpl: EmailTemplate) {
    setSelectedTemplateId(tpl.id);
    setSubject(tpl.subject);
    setHtmlBody(tpl.html_content);
    setNotice({ type: "ok", text: `Template "${tpl.name}" carregado no compositor.` });
  }

  async function handleGenerateAiEmail() {
    setGeneratingAi(true);
    setNotice(null);
    try {
      const res = await fetch("/api/email-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_ai_email", goal: aiGoal }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.aiRequired) onOpenAiSettings();
        setNotice({ type: "err", text: json.error || "Falha ao gerar e-mail com IA." });
        return;
      }
      if (json.generated?.subject) setSubject(json.generated.subject);
      if (json.generated?.html_content) setHtmlBody(json.generated.html_content);
      setNotice({ type: "ok", text: "E-mail HTML responsivo gerado via OpenAI." });
    } finally {
      setGeneratingAi(false);
    }
  }

  async function handleSendEmail() {
    setSending(true);
    setNotice(null);
    try {
      if (sendMode === "single") {
        const res = await fetch("/api/email-marketing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send_email",
            from: composerFrom || fromEmail,
            to: toInput,
            cc: ccInput,
            bcc: bccInput,
            replyTo: replyToInput,
            scheduledAt: scheduledAtInput ? new Date(scheduledAtInput).toISOString() : undefined,
            var_nome: varNome,
            var_empresa: varEmpresa,
            subject,
            html: htmlBody,
            template_id: selectedTemplateId,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setNotice({ type: "err", text: json.error || "Falha no envio Resend." });
          await loadData();
          return;
        }
        setNotice({ type: "ok", text: `E-mail aceito pela Resend (ID: ${json.id}).` });
        await loadData();
      } else {
        const recipients = crmContacts
          .filter((c) => selectedBatchEmails.includes(c.primary_email))
          .map((c) => ({ email: c.primary_email, name: c.name, company: c.org_name || "sua empresa" }));
        const res = await fetch("/api/email-marketing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send_batch",
            from: composerFrom || fromEmail,
            recipients,
            subject,
            html: htmlBody,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setNotice({ type: "err", text: json.error || "Falha no disparo em lote." });
          return;
        }
        setNotice({ type: "ok", text: `Lote enviado via Resend: ${json.count} e-mail(s).` });
        await loadData();
      }
    } finally {
      setSending(false);
    }
  }

  async function handleCreateBroadcast() {
    setBusyBcast(true);
    setNotice(null);
    try {
      const res = await fetch("/api/email-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_broadcast",
          audienceId: bcastAudienceId,
          name: bcastName || bcastSubject,
          from: composerFrom || fromEmail,
          subject: bcastSubject || subject,
          html: bcastHtml || liveRenderedHtml,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json.error });
        return;
      }
      setNotice({ type: "ok", text: "Broadcast criado na Resend (rascunho pronto para envio)." });
      setBcastName("");
      await loadData();
    } finally {
      setBusyBcast(false);
    }
  }

  async function handleBroadcastAction(action: "send_broadcast" | "delete_broadcast", broadcastId: string) {
    setNotice(null);
    const res = await fetch("/api/email-marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, broadcastId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice({ type: "err", text: json.error });
      return;
    }
    setNotice({
      type: "ok",
      text: action === "send_broadcast" ? "Broadcast disparado pela Resend!" : "Broadcast removido.",
    });
    await loadData();
  }

  async function handleCreateAudience() {
    if (!newAudienceName.trim()) return;
    const res = await fetch("/api/email-marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_audience", name: newAudienceName }),
    });
    const json = await res.json();
    if (!res.ok) return setNotice({ type: "err", text: json.error });
    setNewAudienceName("");
    setNotice({ type: "ok", text: "Audiência criada na Resend." });
    await loadData();
  }

  async function handleAddContact() {
    if (!activeAudienceId || !contactEmail.trim()) return;
    const res = await fetch("/api/email-marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_contact",
        audienceId: activeAudienceId,
        email: contactEmail,
        firstName: contactFirst,
        lastName: contactLast,
      }),
    });
    const json = await res.json();
    if (!res.ok) return setNotice({ type: "err", text: json.error });
    setContactEmail("");
    setContactFirst("");
    setContactLast("");
    setNotice({ type: "ok", text: "Contato adicionado à audiência." });
    await loadAudienceContacts(activeAudienceId);
  }

  async function handleSyncCrmToAudience() {
    if (!activeAudienceId) return;
    setSyncingCrm(true);
    try {
      const res = await fetch("/api/email-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_crm_contacts", audienceId: activeAudienceId, limit: 25 }),
      });
      const json = await res.json();
      if (!res.ok) return setNotice({ type: "err", text: json.error });
      setNotice({ type: "ok", text: `${json.synced} contato(s) do CRM sincronizado(s) com a audiência Resend.` });
      await loadAudienceContacts(activeAudienceId);
    } finally {
      setSyncingCrm(false);
    }
  }

  async function handleSaveTemplate() {
    setSavingTpl(true);
    try {
      const res = await fetch("/api/email-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_template",
          name: tplName,
          category: tplCategory,
          subject: tplSubject,
          html_content: tplHtml,
        }),
      });
      const json = await res.json();
      if (!res.ok) return setNotice({ type: "err", text: json.error });
      setTplName("");
      setTplSubject("");
      setTplHtml("");
      setNotice({ type: "ok", text: "Template HTML salvo no Supabase." });
      await loadData();
    } finally {
      setSavingTpl(false);
    }
  }

  async function handleDomainAction(action: "add_domain" | "verify_domain" | "delete_domain", domainId?: string) {
    setNotice(null);
    const res = await fetch("/api/email-marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        domainId,
        name: newDomainName,
        region: newDomainRegion,
      }),
    });
    const json = await res.json();
    if (!res.ok) return setNotice({ type: "err", text: json.error });
    if (action === "add_domain") setNewDomainName("");
    setNotice({ type: "ok", text: "Operação de domínio concluída na Resend." });
    await loadData();
  }

  async function handleSaveSettings() {
    setSavingCfg(true);
    try {
      const res = await fetch("/api/email-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_settings", apiKey: cfgApiKey, fromEmail: cfgFromEmail }),
      });
      const json = await res.json();
      if (!res.ok) return setNotice({ type: "err", text: json.error });
      setCfgApiKey("");
      setNotice({ type: "ok", text: "Configurações do Resend atualizadas no workspace." });
      await loadData();
    } finally {
      setSavingCfg(false);
    }
  }

  async function handleRefreshEmail(emailId: string) {
    const res = await fetch("/api/email-marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh_email", emailId }),
    });
    if (res.ok) await loadData();
  }

  async function handleCancelEmail(emailId: string) {
    const res = await fetch("/api/email-marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel_email", emailId }),
    });
    if (res.ok) await loadData();
  }

  const webhookUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/resend` : "/api/webhooks/resend";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="size-6 text-foreground" />
            E-mail Marketing &amp; Disparos (Resend)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Envios individuais/lote, Broadcasts, Audiências sincronizadas com o CRM, Templates HTML, DNS SPF/DKIM e Webhook de aberturas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={
              loading && !configured
                ? "border-border bg-muted text-muted-foreground"
                : configured
                  ? "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300"
                  : "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-300"
            }
          >
            {loading && !configured
              ? "Conectando Resend..."
              : configured
                ? `Resend Ativa (${maskedKey})`
                : "Resend Não Configurada"}
          </Badge>
          {isSandbox && (
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-100 text-amber-950 font-mono text-[11px] dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300"
            >
              Sandbox: onboarding@resend.dev
            </Badge>
          )}
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs cursor-pointer" onClick={loadData}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {isSandbox && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 flex items-start gap-2.5 text-xs text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="size-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>Modo de Desenvolvimento Resend Ativo:</strong> usando remetente{" "}
            <code className="font-mono">{fromEmail}</code>. Para liberar disparos para qualquer e-mail de cliente no CRM,
            verifique seu domínio na aba <strong>Domínios &amp; Config</strong> (em sandbox a Resend permite testar com seu
            e-mail da conta Resend ou <code className="font-mono">delivered@resend.dev</code>).
          </div>
        </div>
      )}

      {resendError && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs text-rose-900 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-300">
          Aviso API Resend: {resendError}
        </div>
      )}

      {notice && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-xs flex items-center gap-2 ${
            notice.type === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-300"
          }`}
        >
          {notice.type === "ok" ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertTriangle className="size-4 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3.5">
            <div className="text-[11px] text-muted-foreground font-medium">E-mails Disparados</div>
            <div className="mt-1 text-2xl font-bold font-mono">{stats.totalSent}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Dashboard, Lote &amp; MCP</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5">
            <div className="text-[11px] text-emerald-800 dark:text-emerald-400 font-medium">Entregues</div>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-400">{stats.delivered}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Confirmados via Resend</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5">
            <div className="text-[11px] text-sky-800 dark:text-sky-400 font-medium">Aberturas</div>
            <div className="mt-1 text-2xl font-bold font-mono text-sky-800 dark:text-sky-400">{stats.opened}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Rastreio webhook</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5">
            <div className="text-[11px] text-amber-800 dark:text-amber-400 font-medium">Cliques em Link</div>
            <div className="mt-1 text-2xl font-bold font-mono text-amber-800 dark:text-amber-400">{stats.clicked}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">CTAs &amp; links</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5">
            <div className="text-[11px] text-muted-foreground font-medium">Audiências / Templates</div>
            <div className="mt-1 text-2xl font-bold font-mono">
              {audiences.length} / {templates.length}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{crmContacts.length} contatos CRM c/ e-mail</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="compose" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="compose">Disparar E-mail</TabsTrigger>
          <TabsTrigger value="broadcasts">Broadcasts ({broadcasts.length})</TabsTrigger>
          <TabsTrigger value="audiences">Audiências &amp; Contatos ({audiences.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates HTML ({templates.length})</TabsTrigger>
          <TabsTrigger value="domains">Domínios &amp; Config ({domains.length})</TabsTrigger>
          <TabsTrigger value="logs">Logs &amp; Entregabilidade ({logs.length})</TabsTrigger>
        </TabsList>

        {/* TAB 1: COMPOSITOR + PREVIEW HTML + IA + BATCH */}
        <TabsContent value="compose" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-12">
            <Card className="xl:col-span-7">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Compositor Resend &amp; Gerador IA</CardTitle>
                    <CardDescription className="text-xs">
                      Suporta variáveis {"{{nome}}"} / {"{{empresa}}"}, envio agendado e disparo em lote (Batch)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/30">
                    <Button
                      size="sm"
                      variant={sendMode === "single" ? "default" : "ghost"}
                      className="h-7 text-xs cursor-pointer"
                      onClick={() => setSendMode("single")}
                    >
                      Individual
                    </Button>
                    <Button
                      size="sm"
                      variant={sendMode === "batch" ? "default" : "ghost"}
                      className="h-7 text-xs cursor-pointer"
                      onClick={() => setSendMode("batch")}
                    >
                      Lote CRM
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 text-xs">
                {/* Quick template + OpenAI generator row */}
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      onValueChange={(slug) => {
                        const found = templates.find((t) => t.slug === slug);
                        if (found) applyTemplateToComposer(found);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[240px] text-xs">
                        <SelectValue placeholder="Carregar Template Pronto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.slug}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex flex-1 min-w-[220px] gap-1.5">
                      <Input
                        value={aiGoal}
                        onChange={(e) => setAiGoal(e.target.value)}
                        placeholder="Objetivo p/ OpenAI criar o e-mail HTML..."
                        className="h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={generatingAi}
                        onClick={handleGenerateAiEmail}
                        className="h-8 text-xs gap-1.5 shrink-0 cursor-pointer"
                      >
                        {generatingAi ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
                        Gerar HTML IA
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Remetente (From)</Label>
                    <Input
                      value={composerFrom}
                      onChange={(e) => setComposerFrom(e.target.value)}
                      placeholder="Target Relocation <onboarding@resend.dev>"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Responder Para (Reply-To)</Label>
                    <Input
                      value={replyToInput}
                      onChange={(e) => setReplyToInput(e.target.value)}
                      placeholder="klaus@targetrelocation.com.br"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {sendMode === "single" ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Destinatário(s) (To)</Label>
                      <Input
                        value={toInput}
                        onChange={(e) => setToInput(e.target.value)}
                        placeholder="delivered@resend.dev ou contatos separados por vírgula"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">CC</Label>
                        <Input value={ccInput} onChange={(e) => setCcInput(e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">BCC</Label>
                        <Input value={bccInput} onChange={(e) => setBccInput(e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Agendar (opcional)</Label>
                        <Input
                          type="datetime-local"
                          value={scheduledAtInput}
                          onChange={(e) => setScheduledAtInput(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-border p-3 space-y-2 max-h-48 overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">
                        Contatos CRM selecionados ({selectedBatchEmails.length})
                      </Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[11px]"
                        onClick={() =>
                          setSelectedBatchEmails(
                            selectedBatchEmails.length > 0
                              ? []
                              : crmContacts.slice(0, 20).map((c) => c.primary_email)
                          )
                        }
                      >
                        {selectedBatchEmails.length > 0 ? "Limpar" : "Selecionar primeiros 20"}
                      </Button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-1.5">
                      {crmContacts.slice(0, 40).map((c) => {
                        const checked = selectedBatchEmails.includes(c.primary_email);
                        return (
                          <label
                            key={c.id}
                            className="flex items-center gap-2 rounded border border-border/60 px-2 py-1 text-[11px] cursor-pointer hover:bg-accent/40"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setSelectedBatchEmails((p) =>
                                  checked ? p.filter((e) => e !== c.primary_email) : [...p, c.primary_email]
                                )
                              }
                            />
                            <span className="truncate font-medium">{c.name}</span>
                            <span className="truncate text-muted-foreground font-mono text-[10px]">{c.primary_email}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Variável {"{{nome}}"}</Label>
                    <Input value={varNome} onChange={(e) => setVarNome(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Variável {"{{empresa}}"}</Label>
                    <Input value={varEmpresa} onChange={(e) => setVarEmpresa(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Assunto (Subject)</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-8 text-xs" />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Corpo HTML</Label>
                  <Textarea
                    rows={8}
                    value={htmlBody}
                    onChange={(e) => setHtmlBody(e.target.value)}
                    className="font-mono text-[11px]"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    disabled={sending}
                    onClick={handleSendEmail}
                    className="h-9 gap-1.5 text-xs cursor-pointer"
                  >
                    {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    {sendMode === "single" ? "Enviar via Resend" : `Disparar Lote (${selectedBatchEmails.length})`}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Live HTML Preview */}
            <Card className="xl:col-span-5 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pré-visualização em Tempo Real</CardTitle>
                <CardDescription className="text-xs truncate">
                  Assunto: {applyTemplateVariables(subject, { nome: varNome, empresa: varEmpresa })}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="rounded-xl border border-border bg-zinc-100 p-3 dark:bg-zinc-900">
                  <iframe
                    title="Preview do E-mail HTML"
                    srcDoc={liveRenderedHtml}
                    className="h-[460px] w-full rounded-lg bg-white border border-zinc-200"
                    sandbox=""
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: BROADCASTS */}
        <TabsContent value="broadcasts" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Criar Novo Broadcast (Resend)</CardTitle>
                <CardDescription className="text-xs">
                  Campanhas em massa para uma Audiência Resend com tracking automático
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs">Audiência Alvo</Label>
                  <Select value={bcastAudienceId} onValueChange={(v) => setBcastAudienceId(v || "")}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione uma audiência..." />
                    </SelectTrigger>
                    <SelectContent>
                      {audiences.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nome da Campanha</Label>
                  <Input
                    value={bcastName}
                    onChange={(e) => setBcastName(e.target.value)}
                    placeholder="Newsletter Novembro — RH ICP"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Assunto (deixe vazio para usar o do compositor)</Label>
                  <Input value={bcastSubject} onChange={(e) => setBcastSubject(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">HTML Custom (deixe vazio para reaproveitar o compositor)</Label>
                  <Textarea rows={5} value={bcastHtml} onChange={(e) => setBcastHtml(e.target.value)} className="font-mono text-[11px]" />
                </div>
                <Button size="sm" disabled={busyBcast || !bcastAudienceId} onClick={handleCreateBroadcast} className="gap-1.5 text-xs cursor-pointer">
                  {busyBcast ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  Criar Broadcast na Resend
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-7">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Campanhas Broadcast na Resend ({broadcasts.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                {broadcasts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                    Nenhum Broadcast criado ainda nesta conta Resend.
                  </div>
                ) : (
                  broadcasts.map((b) => {
                    const st = getEmailStatusBadge(b.status);
                    return (
                      <div key={b.id} className="rounded-lg border border-border p-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-semibold flex items-center gap-2">
                            <span>{b.name || b.id}</span>
                            <Badge variant="outline" className={`text-[10px] ${st.className}`}>
                              {st.label}
                            </Badge>
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            ID: {b.id} • Audiência: {b.audience_id}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {b.status === "draft" && (
                            <Button size="sm" className="h-7 text-xs gap-1 cursor-pointer" onClick={() => handleBroadcastAction("send_broadcast", b.id)}>
                              <Send className="size-3" /> Enviar Agora
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-700 dark:text-rose-400" onClick={() => handleBroadcastAction("delete_broadcast", b.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: AUDIÊNCIAS & CONTATOS */}
        <TabsContent value="audiences" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="size-4" />
                  Audiências Resend
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex gap-1.5">
                  <Input
                    value={newAudienceName}
                    onChange={(e) => setNewAudienceName(e.target.value)}
                    placeholder="Nova audiência (ex: RH Multinacionais)"
                    className="h-8 text-xs"
                  />
                  <Button size="sm" onClick={handleCreateAudience} className="h-8 shrink-0 cursor-pointer">
                    <Plus className="size-3.5" />
                  </Button>
                </div>

                <div className="space-y-1.5">
                  {audiences.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => setActiveAudienceId(a.id)}
                      className={`rounded-lg border p-2.5 cursor-pointer flex items-center justify-between gap-2 ${
                        activeAudienceId === a.id ? "border-foreground bg-accent/50 font-medium" : "border-border hover:bg-accent/30"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate">{a.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground truncate">{a.id}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-8">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Contatos da Audiência ({audienceContacts.length})</CardTitle>
                    <CardDescription className="text-xs">Sincronize leads e decisores reais de public.persons</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" disabled={syncingCrm || !activeAudienceId} onClick={handleSyncCrmToAudience} className="h-8 text-xs gap-1.5 cursor-pointer">
                    {syncingCrm ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    Sincronizar 25 do CRM → Resend
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid sm:grid-cols-4 gap-2">
                  <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="E-mail *" className="h-8 text-xs sm:col-span-2" />
                  <Input value={contactFirst} onChange={(e) => setContactFirst(e.target.value)} placeholder="Nome" className="h-8 text-xs" />
                  <div className="flex gap-1.5">
                    <Input value={contactLast} onChange={(e) => setContactLast(e.target.value)} placeholder="Sobrenome" className="h-8 text-xs" />
                    <Button size="sm" onClick={handleAddContact} className="h-8 px-2.5 shrink-0 cursor-pointer">
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {loadingContacts ? (
                  <div className="py-8 text-center text-muted-foreground">Carregando contatos da Resend...</div>
                ) : (
                  <div className="divide-y divide-border rounded-lg border border-border">
                    {audienceContacts.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">Audiência vazia no momento.</div>
                    ) : (
                      audienceContacts.map((c) => (
                        <div key={c.id} className="p-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email}
                            </div>
                            <div className="font-mono text-[11px] text-muted-foreground truncate">{c.email}</div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              c.unsubscribed
                                ? "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-300"
                                : "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300"
                            }`}
                          >
                            {c.unsubscribed ? "Descadastrado" : "Ativo"}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: TEMPLATES HTML */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Novo Template HTML Reutilizável</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Nome do Template" className="h-8 text-xs" />
                <Input value={tplCategory} onChange={(e) => setTplCategory(e.target.value)} placeholder="Categoria (Outbound DOU, Newsletter...)" className="h-8 text-xs" />
                <Input value={tplSubject} onChange={(e) => setTplSubject(e.target.value)} placeholder="Assunto (aceita {{empresa}})" className="h-8 text-xs" />
                <Textarea rows={7} value={tplHtml} onChange={(e) => setTplHtml(e.target.value)} placeholder="<div>HTML...</div>" className="font-mono text-[11px]" />
                <Button size="sm" disabled={savingTpl} onClick={handleSaveTemplate} className="gap-1.5 text-xs cursor-pointer">
                  {savingTpl ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  Salvar Template
                </Button>
              </CardContent>
            </Card>

            <div className="lg:col-span-7 grid gap-3 sm:grid-cols-2">
              {templates.map((t) => (
                <Card key={t.id} className="flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {t.category}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-foreground">#{t.id}</span>
                    </div>
                    <CardTitle className="text-sm pt-1">{t.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-1">{t.subject}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Vars: {(t.variables_json || []).join(", ") || "nenhuma"}
                    </span>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] cursor-pointer" onClick={() => applyTemplateToComposer(t)}>
                      Usar no Compositor
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 5: DOMÍNIOS DNS & CONFIG */}
        <TabsContent value="domains" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="size-4" />
                  Domínios Verificados na Resend (SPF / DKIM)
                </CardTitle>
                <CardDescription className="text-xs">
                  Para sair do sandbox <code className="font-mono">onboarding@resend.dev</code>, cadastre e verifique seu domínio corporativo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex gap-2">
                  <Input
                    value={newDomainName}
                    onChange={(e) => setNewDomainName(e.target.value)}
                    placeholder="targetrelocation.com.br"
                    className="h-8 text-xs"
                  />
                  <Select value={newDomainRegion} onValueChange={(v) => setNewDomainRegion(v || "sa-east-1")}>
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sa-east-1">São Paulo (sa-east-1)</SelectItem>
                      <SelectItem value="us-east-1">Virginia (us-east-1)</SelectItem>
                      <SelectItem value="eu-west-1">Irlanda (eu-west-1)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-8 shrink-0 cursor-pointer" onClick={() => handleDomainAction("add_domain")}>
                    Adicionar
                  </Button>
                </div>

                {domains.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
                    Nenhum domínio próprio cadastrado ainda (usando <code className="font-mono">onboarding@resend.dev</code>).
                  </div>
                ) : (
                  domains.map((d) => {
                    const st = getEmailStatusBadge(d.status);
                    return (
                      <div key={d.id} className="rounded-lg border border-border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold flex items-center gap-2">
                            <span>{d.name}</span>
                            <Badge variant="outline" className={`text-[10px] ${st.className}`}>
                              {st.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleDomainAction("verify_domain", d.id)}>
                              Verificar DNS
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-700 dark:text-rose-400" onClick={() => handleDomainAction("delete_domain", d.id)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                        {Array.isArray(d.records) && d.records.length > 0 && (
                          <div className="space-y-1 text-[10px] font-mono bg-muted/40 p-2 rounded">
                            {d.records.map((r, i) => (
                              <div key={i} className="truncate">
                                [{r.type}] {r.name} → {r.value} ({r.status})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="size-4" />
                  Webhook de Entregabilidade &amp; Chaves Resend
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs">Endpoint de Webhook para configurar no painel Resend</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={webhookUrl} className="h-8 font-mono text-[11px] bg-muted/40" />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 shrink-0 cursor-pointer"
                      onClick={() => {
                        navigator.clipboard.writeText(webhookUrl);
                        setCopiedWebhook(true);
                        setTimeout(() => setCopiedWebhook(false), 1800);
                      }}
                    >
                      {copiedWebhook ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Eventos suportados automaticamente: <code className="font-mono">email.delivered</code>,{" "}
                    <code className="font-mono">email.opened</code>, <code className="font-mono">email.clicked</code>,{" "}
                    <code className="font-mono">email.bounced</code> e <code className="font-mono">email.complained</code>.
                  </p>
                </div>

                {isAdmin && (
                  <div className="space-y-2.5 pt-2 border-t border-border">
                    <div className="space-y-1">
                      <Label className="text-xs">Remetente Padrão (From)</Label>
                      <Input value={cfgFromEmail} onChange={(e) => setCfgFromEmail(e.target.value)} className="h-8 text-xs font-mono" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Substituir RESEND_API_KEY (opcional)</Label>
                      <Input
                        type="password"
                        value={cfgApiKey}
                        onChange={(e) => setCfgApiKey(e.target.value)}
                        placeholder={maskedKey ? `Atual: ${maskedKey}` : "re_..."}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <Button size="sm" disabled={savingCfg} onClick={handleSaveSettings} className="h-8 text-xs cursor-pointer">
                      {savingCfg ? "Salvando..." : "Salvar Preferências Resend"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 6: LOGS */}
        <TabsContent value="logs" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {[
                { id: "all", label: "Todos" },
                { id: "dashboard", label: "Dashboard" },
                { id: "batch", label: "Lote" },
                { id: "mcp", label: "MCP Cloud" },
              ].map((f) => (
                <Button
                  key={f.id}
                  size="sm"
                  variant={logSourceFilter === f.id ? "default" : "outline"}
                  className="h-7 text-xs cursor-pointer"
                  onClick={() => setLogSourceFilter(f.id)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border text-xs">
                {filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum disparo registrado ainda neste filtro.
                  </div>
                ) : (
                  filteredLogs.map((l) => {
                    const st = getEmailStatusBadge(l.status);
                    return (
                      <div key={l.id} className="p-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] ${st.className}`}>
                              {st.label}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              {l.source}
                            </Badge>
                            <span className="font-semibold truncate">{l.subject}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate">
                            Para: {(l.to_emails || []).join(", ")} • De: {l.from_email}
                          </div>
                          {l.error_message && (
                            <div className="text-[11px] text-rose-700 dark:text-rose-400">{l.error_message}</div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-[11px]">
                          <span className="font-mono text-muted-foreground flex items-center gap-1">
                            <BarChart3 className="size-3" /> {l.opens_count} abr / {l.clicks_count} cli
                          </span>
                          <span className="font-mono text-muted-foreground">
                            {new Date(l.created_at).toLocaleString("pt-BR")}
                          </span>
                          {l.resend_email_id && !l.resend_email_id.startsWith("err-") && !l.resend_email_id.startsWith("mcp-err-") && (
                            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleRefreshEmail(l.resend_email_id!)}>
                              Status
                            </Button>
                          )}
                          {l.status === "scheduled" && l.resend_email_id && (
                            <Button size="sm" variant="ghost" className="h-7 text-[11px] text-rose-700 dark:text-rose-400" onClick={() => handleCancelEmail(l.resend_email_id!)}>
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
