"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, ShieldAlert, Sparkles } from "lucide-react";
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

  useEffect(() => {
    if (!open) return;
    setFeedback(null);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            Configurações de Inteligência Artificial (OpenAI)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Conecte sua API Key OpenAI para ativar Chat Copilot, Fábrica de Conteúdo 1→4, Auditor de Ligações e Teste
            GEO diretamente neste workspace Supabase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
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
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2 text-amber-500">
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
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-500"
              }`}
            >
              {feedback.type === "ok" && <CheckCircle2 className="size-4 shrink-0" />}
              <span>{feedback.text}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testing || (!configured && !apiKey.trim())}
            className="text-xs"
          >
            {testing ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
            Testar Conexão OpenAI
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              Fechar
            </Button>
            {isAdmin && (
              <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="text-xs">
                {saving ? "Salvando..." : "Salvar Configuração"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
