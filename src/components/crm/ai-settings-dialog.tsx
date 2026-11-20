"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  Database,
  KeyRound,
  Link2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AiSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function AiSettingsDialog({ open, onOpenChange, onSaved }: AiSettingsDialogProps) {
  const [configured, setConfigured] = useState(false);
  const [source, setSource] = useState("none");
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [monthlyGoal, setMonthlyGoal] = useState("16");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // MCP Connector tab state
  const [mcpEndpoint, setMcpEndpoint] = useState("https://target-relocation-crm-production.up.railway.app/api/mcp");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [mcpPassword, setMcpPassword] = useState("");
  const [issuingToken, setIssuingToken] = useState(false);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [mcpFeedback, setMcpFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMcpEndpoint(`${window.location.origin}/api/mcp`);
    }
    if (!open) return;
    setFeedback(null);
    setMcpFeedback(null);
    setMcpPassword("");
    setIssuedToken(null);
    fetch("/api/settings/ai")
      .then((r) => r.json())
      .then((d) => {
        setConfigured(Boolean(d.configured));
        setSource(d.source || "none");
        setMaskedKey(d.maskedKey || null);
        setIsAdmin(d.isAdmin !== false);
        if (d.model) setModel(d.model);
        if (d.monthlyMeetingGoal) setMonthlyGoal(String(d.monthlyMeetingGoal));
      })
      .catch(() => {});
  }, [open]);

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          model,
          monthlyMeetingGoal: monthlyGoal,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar");
      setConfigured(Boolean(json.configured));
      setSource(json.source || "none");
      setMaskedKey(json.maskedKey || null);
      setApiKey("");
      setFeedback({ type: "ok", text: "Configuração salva no Supabase com segurança!" });
      onSaved?.();
    } catch (err) {
      setFeedback({ type: "err", text: err instanceof Error ? err.message : "Falha ao salvar" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", apiKey: apiKey.trim() || undefined, model }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Falha no teste");
      setFeedback({ type: "ok", text: `Conexão OpenAI verificada (${json.model}): ${json.reply}` });
    } catch (err) {
      setFeedback({ type: "err", text: err instanceof Error ? err.message : "Erro ao testar chave OpenAI" });
    } finally {
      setTesting(false);
    }
  }

  async function handleIssueMcpToken() {
    if (!mcpPassword) {
      setMcpFeedback({ type: "err", text: "Digite sua senha do CRM para gerar o token Bearer." });
      return;
    }
    setIssuingToken(true);
    setMcpFeedback(null);
    try {
      const res = await fetch("/api/oauth/personal-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: mcpPassword, label: "OpenAI Cloud / API Playground Read-Only" }),
      });
      const json = await res.json();
      if (!res.ok || !json.token) {
        throw new Error(json.error || "Não foi possível gerar token MCP.");
      }
      setIssuedToken(json.token);
      setMcpPassword("");
      setMcpFeedback({
        type: "ok",
        text: `Token somente leitura gerado para ${json.memberEmail} (válido por ${json.expiresInDays} dias).`,
      });
    } catch (err) {
      setMcpFeedback({ type: "err", text: err instanceof Error ? err.message : "Erro ao gerar token" });
    } finally {
      setIssuingToken(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            Configurações de IA & Conector MCP OpenAI Cloud
          </DialogTitle>
          <DialogDescription className="text-xs">
            Gerencie a API Key OpenAI do workspace e o servidor MCP remoto somente leitura com autenticação por senha.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="openai" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="openai" className="text-xs gap-1.5">
              <KeyRound className="size-3.5" />
              OpenAI API Key
            </TabsTrigger>
            <TabsTrigger value="mcp" className="text-xs gap-1.5">
              <Link2 className="size-3.5 text-emerald-500" />
              Conector MCP (OpenAI Cloud)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="openai" className="space-y-4 text-xs">
            <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-medium flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-muted-foreground" />
                  Status da Chave OpenAI
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {configured ? `${maskedKey || "Configurada"} (${source})` : "Aguardando OPENAI_API_KEY"}
                </div>
              </div>
              <Badge variant={configured ? "default" : "outline"} className={configured ? "bg-emerald-600 text-white" : ""}>
                {configured ? "Conectada" : "Não configurada"}
              </Badge>
            </div>

            {!isAdmin && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-start gap-2 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                <span>Apenas Klaus (Admin) ou Felipe (Ops) podem alterar a API Key do workspace.</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Nova OpenAI API Key (armazenada em workspace_settings com RLS Admin)</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={!isAdmin}
                placeholder={configured ? "Deixe em branco para manter a chave atual" : "sk-proj-..."}
                className="h-9 font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Modelo OpenAI</Label>
                <Select value={model} onValueChange={(v) => setModel(v || "gpt-4o-mini")} disabled={!isAdmin}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue>{model}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">gpt-4o-mini (Rápido / Econômico)</SelectItem>
                    <SelectItem value="gpt-4o">gpt-4o (Máxima Qualidade)</SelectItem>
                    <SelectItem value="gpt-4.1-mini">gpt-4.1-mini</SelectItem>
                    <SelectItem value="gpt-4.1">gpt-4.1</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Meta Mensal de Reuniões Qualificadas</Label>
                <Input
                  type="number"
                  value={monthlyGoal}
                  onChange={(e) => setMonthlyGoal(e.target.value)}
                  disabled={!isAdmin}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {feedback && (
              <div
                className={`rounded-lg border p-2.5 text-xs flex items-center gap-2 ${
                  feedback.type === "ok"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                }`}
              >
                {feedback.type === "ok" && <CheckCircle2 className="size-4 shrink-0" />}
                <span>{feedback.text}</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testing || (!configured && !apiKey.trim())}
                className="text-xs cursor-pointer"
              >
                {testing ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
                Testar Conexão OpenAI
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
                  Fechar
                </Button>
                {isAdmin && (
                  <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="text-xs cursor-pointer">
                    {saving ? "Salvando..." : "Salvar Configuração"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="mcp" className="space-y-4 text-xs">
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 flex items-start gap-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <ShieldCheck className="size-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold text-emerald-900 dark:text-emerald-300">
                  MCP 100% Somente Leitura • 30 Tabelas Postgres Liberadas
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Dá acesso completo de leitura (CRM, Radar DOU, Blog SEO, Placar SDR, Ads, Plano 30d e SQL SELECT) com
                  proteção contra mutações no Postgres e bloqueio da tabela de credenciais (<code className="font-mono">workspace_settings</code>).
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Database className="size-3.5 text-amber-500" />
                URL do Servidor MCP (Cole no Conector da OpenAI / ChatGPT Cloud)
              </Label>
              <div className="flex gap-2">
                <Input readOnly value={mcpEndpoint} className="h-9 font-mono text-[11px] bg-muted/40" />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 shrink-0 cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(mcpEndpoint);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                >
                  {copiedUrl ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5 text-[11px] text-muted-foreground">
              <div className="font-semibold text-foreground">Como conectar no OpenAI Cloud / ChatGPT:</div>
              <p>
                1. <strong>ChatGPT Conectores (OAuth 2.1):</strong> escolha autenticação <strong>OAuth</strong> e cole a URL acima — na tela de autorização que abrir, entre com seu e-mail e senha do CRM.
              </p>
              <p>
                2. <strong>OpenAI Playground / Responses API (Token):</strong> caso prefira conectar por Bearer Token, confirme sua senha abaixo para gerar um token pessoal permanente de leitura:
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-border p-3">
              <Label className="text-xs">Gerar Token Bearer Somente Leitura (confirme sua senha do CRM)</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={mcpPassword}
                  onChange={(e) => setMcpPassword(e.target.value)}
                  placeholder="Digite sua senha atual do CRM (ex: Target@2026!)"
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={issuingToken}
                  onClick={handleIssueMcpToken}
                  className="h-8 text-xs shrink-0 cursor-pointer"
                >
                  {issuingToken ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                  Gerar Token
                </Button>
              </div>

              {issuedToken && (
                <div className="flex gap-2 pt-1">
                  <Input readOnly value={issuedToken} className="h-8 font-mono text-[11px] bg-emerald-500/5 border-emerald-500/40" />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 shrink-0 cursor-pointer"
                    onClick={() => {
                      navigator.clipboard.writeText(issuedToken);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                  >
                    {copiedToken ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  </Button>
                </div>
              )}

              {mcpFeedback && (
                <div
                  className={`rounded-md border p-2 text-[11px] ${
                    mcpFeedback.type === "ok"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                  }`}
                >
                  {mcpFeedback.text}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
                Fechar
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
