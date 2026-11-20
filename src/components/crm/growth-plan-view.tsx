"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Flag,
  Loader2,
  Megaphone,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface Milestone {
  id: number;
  phase: number;
  phase_title: string;
  title: string;
  description: string | null;
  owner: string;
  is_gate: boolean;
  status: string;
  due_day: number;
}

interface AdsCampaign {
  id: number;
  channel: string;
  name: string;
  match_types: string | null;
  monthly_budget_brl: number;
  budget_approved_by_klaus: boolean;
  conversion_tracking_active: boolean;
  status: string;
  target_audience: string | null;
  negative_keywords_json: string[];
  last_audit_notes: string | null;
}

interface GeoTest {
  id: number;
  question: string;
  target_slug: string | null;
  chatgpt_cited: boolean;
  gemini_cited: boolean;
  perplexity_cited: boolean;
  google_ai_cited: boolean;
  ai_response_summary: string | null;
  openai_audit_score: number | null;
  recommendations: string | null;
  tested_at: string | null;
}

interface KpiSnapshot {
  id: number;
  kpi_key: string;
  name: string;
  source: string;
  frequency: string;
  owner: string;
  current_value: string | null;
  target_value: string | null;
  notes: string | null;
}

export function GrowthPlanView({ onOpenAiSettings }: { onOpenAiSettings: () => void }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [campaigns, setCampaigns] = useState<AdsCampaign[]>([]);
  const [geoTests, setGeoTests] = useState<GeoTest[]>([]);
  const [kpis, setKpis] = useState<KpiSnapshot[]>([]);
  const [publishedPostsCount, setPublishedPostsCount] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);

  const [newNegative, setNewNegative] = useState<Record<number, string>>({});
  const [searchTermsAuditInput, setSearchTermsAuditInput] = useState("");
  const [adsAuditResult, setAdsAuditResult] = useState<Record<string, unknown> | null>(null);
  const [auditingAds, setAuditingAds] = useState(false);
  const [runningGeoId, setRunningGeoId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/growth");
    const json = await res.json();
    setMilestones(json.milestones || []);
    setCampaigns(json.campaigns || []);
    setGeoTests(json.geoTests || []);
    setKpis(json.kpis || []);
    setPublishedPostsCount(json.publishedPostsCount || 0);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function cycleMilestoneStatus(m: Milestone) {
    const next = m.status === "completed" ? "pending" : m.status === "in_progress" ? "completed" : "in_progress";
    await fetch("/api/growth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_milestone", id: m.id, status: next }),
    });
    await loadData();
  }

  async function toggleAdsField(action: "toggle_ads_approval" | "toggle_conversion", id: number) {
    await fetch("/api/growth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id }),
    });
    await loadData();
  }

  async function addNegative(id: number) {
    const kw = (newNegative[id] || "").trim();
    if (!kw) return;
    await fetch("/api/growth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_negative_keyword", id, keyword: kw }),
    });
    setNewNegative((p) => ({ ...p, [id]: "" }));
    await loadData();
  }

  async function auditAdsWithAi() {
    setAuditingAds(true);
    setBanner(null);
    try {
      const res = await fetch("/api/growth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "audit_ads_ai", search_terms: searchTermsAuditInput }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.aiRequired) onOpenAiSettings();
        setBanner(json.error);
        return;
      }
      setAdsAuditResult(json.audit || null);
    } finally {
      setAuditingAds(false);
    }
  }

  async function toggleGeoPlatform(id: number, field: string, currentVal: boolean) {
    await fetch("/api/growth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_geo_platforms", id, [field]: !currentVal }),
    });
    await loadData();
  }

  async function runGeoTestWithAi(id: number) {
    setRunningGeoId(id);
    setBanner(null);
    try {
      const res = await fetch("/api/growth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_geo_test", id }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.aiRequired) onOpenAiSettings();
        setBanner(json.error);
        return;
      }
      setBanner(`Auditoria GEO concluída via OpenAI (Score ${json.test?.openai_audit_score}/100)!`);
      await loadData();
    } finally {
      setRunningGeoId(null);
    }
  }

  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const progressPct = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;
  const gate1 = milestones.find((m) => m.is_gate && m.phase === 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Flag className="size-6 text-amber-500" />
            Plano 90 Dias, Google Ads/ABM, GEO (10 Perguntas) & 9 KPIs
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Base no lugar (Dias 1–30) → Máquina rodando (Dias 31–60) → Ajuste fino (Dias 61–90) • Regra: nada avança sem conversão medindo
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          Progresso 90d: {completedCount}/{milestones.length} ({progressPct}%)
        </Badge>
      </div>

      {banner && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs">
          {banner}
        </div>
      )}

      {gate1 && gate1.status !== "completed" && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 flex items-center gap-3 text-xs">
          <AlertTriangle className="size-4 text-amber-500 shrink-0" />
          <div>
            <strong>GATE 1 Pendente (Fase 1 → Fase 2):</strong> &ldquo;Nada avança para a Fase 2 sem a conversão do
            Google Ads (formulário, WhatsApp e ligação) medindo e validada.&rdquo;
          </div>
        </div>
      )}

      <Tabs defaultValue="roadmap" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roadmap">Cronograma 90 Dias ({milestones.length})</TabsTrigger>
          <TabsTrigger value="ads">Google Ads, LinkedIn ABM & Meta ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="geo">Teste GEO 10 Perguntas ({geoTests.length})</TabsTrigger>
          <TabsTrigger value="kpis">9 KPIs do Contrato ({kpis.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="roadmap" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Conclusão Global dos 90 Dias</span>
                <span className="font-mono font-semibold">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((phase) => {
              const list = milestones.filter((m) => m.phase === phase);
              const phaseTitle = list[0]?.phase_title || `Fase ${phase}`;
              return (
                <Card key={phase}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{phaseTitle}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    {list.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => cycleMilestoneStatus(m)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors space-y-1 ${
                          m.is_gate
                            ? "border-amber-500/50 bg-amber-500/5"
                            : "border-border/70 bg-muted/20 hover:bg-accent/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`font-semibold ${m.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                            {m.title}
                          </span>
                          <Badge
                            variant={m.status === "completed" ? "default" : "outline"}
                            className={`text-[10px] shrink-0 ${
                              m.status === "completed"
                                ? "bg-emerald-600 text-white"
                                : m.status === "in_progress"
                                  ? "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/20 dark:text-amber-300"
                                  : ""
                            }`}
                          >
                            {m.status === "completed" ? "Concluído" : m.status === "in_progress" ? "Em andamento" : `Dia ${m.due_day}`}
                          </Badge>
                        </div>
                        {m.description && <p className="text-[11px] text-muted-foreground">{m.description}</p>}
                        <div className="text-[10px] font-mono text-muted-foreground">Resp.: {m.owner}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="ads" className="space-y-4">
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Megaphone className="size-4 text-primary" />
                Auditoria Semanal de Termos de Busca & Negativas via OpenAI (Toda Segunda)
              </CardTitle>
              <CardDescription className="text-xs">
                Cole termos recentes do Google Ads ou rode a auditoria preventiva (fora do escopo obrigatório: H2A/H2B, visto turismo EUA, pets).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row gap-2">
                <Textarea
                  rows={2}
                  value={searchTermsAuditInput}
                  onChange={(e) => setSearchTermsAuditInput(e.target.value)}
                  placeholder="Cole termos de busca reais (opcional) ou clique direto para auditar as negativas atuais..."
                  className="text-xs flex-1"
                />
                <Button size="sm" onClick={auditAdsWithAi} disabled={auditingAds} className="gap-1.5 shrink-0 h-auto">
                  {auditingAds ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5 text-amber-500" />}
                  {auditingAds ? "Auditando..." : "Auditar Ads IA"}
                </Button>
              </div>
              {adsAuditResult && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <div><strong>Síntese Auditor:</strong> {String(adsAuditResult.audit_summary || "")}</div>
                  {Array.isArray(adsAuditResult.recommended_negatives) && (
                    <div className="flex flex-wrap gap-1.5">
                      {(adsAuditResult.recommended_negatives as string[]).map((neg) => (
                        <Badge key={neg} variant="destructive" className="text-[10px]">- {neg}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {campaigns.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px]">{c.channel}</Badge>
                    <Badge variant={c.budget_approved_by_klaus ? "default" : "secondary"} className="text-[10px]">
                      {c.budget_approved_by_klaus ? "Verba Aprovada (Klaus)" : "Aguardando Aprovação Verba"}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm">{c.name}</CardTitle>
                  <CardDescription className="text-xs">{c.target_audience}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/30">
                    <div>
                      <span className="text-muted-foreground">Orçamento Mensal: </span>
                      <strong className="font-mono">R$ {Number(c.monthly_budget_brl || 0).toLocaleString("pt-BR")}</strong>
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground">Match: {c.match_types}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant={c.conversion_tracking_active ? "default" : "outline"} className="h-7 text-xs gap-1" onClick={() => toggleAdsField("toggle_conversion", c.id)}>
                      <CheckCircle2 className="size-3" />
                      {c.conversion_tracking_active ? "Conversão Medindo ✓" : "Marcar Conversão Ativa"}
                    </Button>
                    <Button size="sm" variant={c.budget_approved_by_klaus ? "secondary" : "outline"} className="h-7 text-xs gap-1" onClick={() => toggleAdsField("toggle_ads_approval", c.id)}>
                      <ShieldCheck className="size-3" />
                      {c.budget_approved_by_klaus ? "Aprovado por Klaus ✓" : "Aprovar Orçamento (Klaus)"}
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-muted-foreground">Palavras Negativas:</div>
                    <div className="flex flex-wrap gap-1">
                      {(c.negative_keywords_json || []).map((kw) => (
                        <Badge
                          key={kw}
                          variant="outline"
                          className="text-[10px] border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-300"
                        >
                          - {kw}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <Input
                        placeholder="Adicionar negativa (ex: visto turista)"
                        value={newNegative[c.id] || ""}
                        onChange={(e) => setNewNegative((p) => ({ ...p, [c.id]: e.target.value }))}
                        className="h-7 text-xs"
                      />
                      <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => addNegative(c.id)}>
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="geo" className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <strong>Teste Mensal de GEO (Otimização para IAs):</strong> 10 perguntas-chave que diretores de RH fazem no ChatGPT, Gemini, Perplexity e Google AI Overviews. Acervo atual publicado no Blog GEO: <strong>{publishedPostsCount} artigos</strong>.
            </div>
          </div>

          <div className="grid gap-3">
            {geoTests.map((t, idx) => (
              <Card key={t.id}>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">Q{idx + 1}</Badge>
                        {t.openai_audit_score !== null && (
                          <Badge variant={t.openai_audit_score >= 70 ? "default" : "secondary"} className="font-mono text-[10px]">
                            Cobertura GEO: {t.openai_audit_score}/100
                          </Badge>
                        )}
                      </div>
                      <div className="font-semibold text-sm">{t.question}</div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 shrink-0"
                      disabled={runningGeoId === t.id}
                      onClick={() => runGeoTestWithAi(t.id)}
                    >
                      {runningGeoId === t.id ? <Loader2 className="size-3.5 animate-spin" /> : <Bot className="size-3.5 text-amber-500" />}
                      {runningGeoId === t.id ? "Testando..." : "Auditar com OpenAI"}
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-1">
                    {[
                      { key: "chatgpt_cited", label: "ChatGPT", val: t.chatgpt_cited },
                      { key: "gemini_cited", label: "Gemini", val: t.gemini_cited },
                      { key: "perplexity_cited", label: "Perplexity", val: t.perplexity_cited },
                      { key: "google_ai_cited", label: "Google AI Overview", val: t.google_ai_cited },
                    ].map((plat) => (
                      <label key={plat.key} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={plat.val}
                          onCheckedChange={() => toggleGeoPlatform(t.id, plat.key, plat.val)}
                        />
                        <span>{plat.label}</span>
                      </label>
                    ))}
                  </div>

                  {t.ai_response_summary && (
                    <div className="p-2.5 rounded-md bg-muted/30 text-muted-foreground">
                      <strong>Diagnóstico:</strong> {t.ai_response_summary}
                      {t.recommendations && <div className="mt-1 text-foreground"><strong>Ação recomendada:</strong> {t.recommendations}</div>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="kpis" className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {kpis.map((k) => (
              <Card key={k.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px]">{k.frequency}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{k.owner}</Badge>
                  </div>
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <BarChart3 className="size-4 text-primary shrink-0" />
                    {k.name}
                  </CardTitle>
                  <CardDescription className="text-[11px]">Fonte: {k.source}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Atual:</span>
                    <span className="font-mono font-semibold">{k.current_value || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Meta:</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">{k.target_value || "—"}</span>
                  </div>
                  {k.notes && <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">{k.notes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
