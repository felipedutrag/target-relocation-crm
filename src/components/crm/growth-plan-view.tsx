"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  CircleDashed,
  Clock,
  Flag,
  ListChecks,
  Loader2,
  Megaphone,
  Plus,
  ShieldCheck,
  Sparkles,
  XCircle,
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

interface ChecklistMetrics {
  dealsCount: number;
  douCount: number;
  editorialTotal: number;
  editorialPendingApproval: number;
  sdrAuditsCount: number;
  weeklyMeetingsCount: number;
}

interface PlanAuditEntry {
  area: string;
  title: string;
  detail: string;
  owner: string;
  state: "done" | "partial" | "missing";
}

function getMilestoneBadgeProps(status: string, dueDay: number) {
  if (status === "completed") {
    return {
      label: "Implementado",
      className:
        "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300",
    };
  }
  if (status === "in_progress") {
    return {
      label: `Em andamento · Dia ${dueDay}`,
      className:
        "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300",
    };
  }
  return {
    label: `Falta · Dia ${dueDay}`,
    className:
      "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  };
}

export function GrowthPlanView({ onOpenAiSettings }: { onOpenAiSettings: () => void }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [campaigns, setCampaigns] = useState<AdsCampaign[]>([]);
  const [geoTests, setGeoTests] = useState<GeoTest[]>([]);
  const [kpis, setKpis] = useState<KpiSnapshot[]>([]);
  const [publishedPostsCount, setPublishedPostsCount] = useState(0);
  const [metrics, setMetrics] = useState<ChecklistMetrics>({
    dealsCount: 0,
    douCount: 0,
    editorialTotal: 0,
    editorialPendingApproval: 0,
    sdrAuditsCount: 0,
    weeklyMeetingsCount: 0,
  });
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "in_progress" | "pending">("all");
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);

  const [newNegative, setNewNegative] = useState<Record<number, string>>({});
  const [searchTermsAuditInput, setSearchTermsAuditInput] = useState("");
  const [adsAuditResult, setAdsAuditResult] = useState<Record<string, unknown> | null>(null);
  const [auditingAds, setAuditingAds] = useState(false);
  const [runningGeoId, setRunningGeoId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/growth");
      const json = await res.json();
      setMilestones(json.milestones || []);
      setCampaigns(json.campaigns || []);
      setGeoTests(json.geoTests || []);
      setKpis(json.kpis || []);
      setPublishedPostsCount(json.publishedPostsCount || 0);
      if (json.checklistMetrics) setMetrics(json.checklistMetrics);
    } finally {
      setLoading(false);
    }
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
  const inProgressCount = milestones.filter((m) => m.status === "in_progress").length;
  const pendingCount = milestones.filter((m) => m.status === "pending").length;
  const progressPct = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;
  const gate1 = milestones.find((m) => m.is_gate && m.phase === 1);
  const gate2 = milestones.find((m) => m.is_gate && m.phase === 2);

  const adsConvActive = campaigns.filter((c) => c.conversion_tracking_active).length;
  const geoTestedCount = geoTests.filter((g) => g.tested_at !== null).length;

  const planAudit = useMemo<PlanAuditEntry[]>(
    () => [
      // Já implementado
      {
        area: "Centralização & CRM",
        title: `CRM único no Supabase com origem, dono e Dossiê 360° (${metrics.dealsCount.toLocaleString("pt-BR")} negócios)`,
        detail:
          "Leads separados entre Áurea (Outbound/ICP/DOU) e Anderley (Inbound/Ads/Site/WA) sem sobreposição, filtros salvos e captura pública.",
        owner: "Sistema / Boost",
        state: "done",
      },
      {
        area: "Radar DOU & Receita",
        title: `Radar DOU indexado e cruzado com Receita Federal (${metrics.douCount.toLocaleString("pt-BR")} leads DOU)`,
        detail: "Score automático, dados de expatriados, passaportes e geração de script de call + 4 e-mails por empresa.",
        owner: "Sistema / Otávio",
        state: "done",
      },
      {
        area: "Blog GEO & SEO",
        title: `Acervo completo migrado (${publishedPostsCount} artigos publicados) + Yoast SEO + Sitemap XML`,
        detail:
          "Slugs PT/EN/ES preservados, imagens no Supabase Storage (0 faltando), FAQ Schema, /en/casv-center publicada e painel Yoast SEO.",
        owner: "Sistema / Klaus",
        state: "done",
      },
      {
        area: "Fábrica Editorial 1→4",
        title: `Calendário Nov/26–Fev/27 (${metrics.editorialTotal} pautas) + Fluxo de Aprovação Humana`,
        detail:
          "Geração OpenAI de post LinkedIn (link 1º comentário), carrossel, roteiro HeyGen e argumento SDR com trava de aprovação pelo Klaus.",
        owner: "Sistema / Klaus",
        state: "done",
      },
      {
        area: "Rotina & Auditoria SDR",
        title: "Placar diário Áurea x Anderley (40/8), captura 'Quem viu perfil Klaus', ata semanal & Auditor IA",
        detail: "Estrutura completa de registro no CRM e auditoria de transcrições via OpenAI.",
        owner: "Áurea, Anderley & Boost",
        state: "done",
      },
      {
        area: "Copilot IA & MCP Read-Only",
        title: "Copilot OpenAI no CRM + Servidor MCP Somente Leitura com OAuth 2.1 (OpenAI Cloud)",
        detail: "Copilot cria tarefas, pautas e negativas ao vivo; MCP libera leitura das 30 tabelas com travas no Postgres.",
        owner: "Sistema / Claude",
        state: "done",
      },

      // Parcial / Operação pendente
      {
        area: "Sara (Atendimento < 5 min)",
        title: "Integração viva da Sara empurrando leads instantâneos para /api/public/lead",
        detail:
          "Endpoint /api/public/lead já recebe origem + UTM e roteia no CRM; falta conectar o fluxo de atendimento em <5 min no WhatsApp/site.",
        owner: "Felipe (Boost)",
        state: "partial",
      },
      {
        area: "Auditor de Ligações & Reuniões",
        title: `Operação contínua do Auditor de Ligações (${metrics.sdrAuditsCount} auditoria(s)) e Ata Seg 9h (${metrics.weeklyMeetingsCount} ata)`,
        detail: "Módulo e IA já prontos no CRM; falta os SDRs subirem transcrições semanais reais das ligações.",
        owner: "Áurea, Anderley & Felipe",
        state: "partial",
      },
      {
        area: "Teste GEO (10 Perguntas)",
        title: `Benchmark mensal nas 4 IAs (${geoTestedCount}/${geoTests.length} perguntas testadas via IA)`,
        detail:
          "Matriz ChatGPT, Gemini, Perplexity e Google AI já pronta no CRM; falta executar a rodada completa e comparar evolução.",
        owner: "Claude & Felipe",
        state: "partial",
      },
      {
        area: "Atribuição & KPIs",
        title: `Painel dos ${kpis.length} KPIs do contrato & Rastreamento UTM fim-a-fim`,
        detail:
          "Estrutura e snapshot ativos; falta consolidar custos/cliques semanais reais do Google Ads e Search Console.",
        owner: "Felipe & Claude",
        state: "partial",
      },

      // Falta implementar / Pendência externa
      {
        area: "Google Ads (GATE 1)",
        title: `Configurar e validar conversão real no Google Ads (${adsConvActive}/${campaigns.length} campanhas medindo)`,
        detail:
          "Instalar tags reais de conversão (formulário, WhatsApp e clique ligação) nas 4 campanhas e validar em produção (exigência do Gate 1).",
        owner: "Felipe (Boost)",
        state: "missing",
      },
      {
        area: "LinkedIn Ads ABM & Orgânico",
        title: "Subir lista das 109 multinacionais no LinkedIn Ads ABM + definir verba + revisar perfis",
        detail:
          "Ação externa no LinkedIn Campaign Manager, revisão manual dos perfis (Klaus/SDRs) e rotina diária de 10 min de comentários no ICP.",
        owner: "Klaus, Felipe & SDRs",
        state: "missing",
      },
      {
        area: "Instagram, HeyGen & Agendador",
        title: "Conectar agendador social (mLabs/Buffer/Metricool) + gravação dos avatares HeyGen do Klaus",
        detail:
          "Os textos e roteiros já são gerados no CRM, mas o disparo automático no feed/Instagram/YouTube e embedding das URLs ainda dependem de integração externa.",
        owner: "Felipe & Klaus",
        state: "missing",
      },
      {
        area: "Autoridade Externa (GEO)",
        title: "Atualizar Google Meu Negócio, diretório EuRA e portais de terceiros + definir meta de reuniões no kickoff",
        detail: "Pendências externas de posicionamento de marca e alinhamento executivo de meta mensal de reuniões.",
        owner: "Klaus",
        state: "missing",
      },
    ],
    [adsConvActive, campaigns.length, geoTestedCount, geoTests.length, kpis.length, metrics, publishedPostsCount]
  );

  const auditDoneCount = planAudit.filter((i) => i.state === "done").length;
  const auditPartialCount = planAudit.filter((i) => i.state === "partial").length;
  const auditMissingCount = planAudit.filter((i) => i.state === "missing").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Flag className="size-6 text-amber-600 dark:text-amber-400" />
            Plano 30 Dias, Checklist, Google Ads/ABM &amp; GEO
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Base no lugar (Dias 1–10) → Máquina rodando (Dias 11–20) → Ajuste fino (Dias 21–30) • Regra: nada avança sem conversão medindo
          </p>
        </div>
        <Badge
          variant="outline"
          className="font-mono text-xs border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          Progresso 30d: {completedCount}/{milestones.length} ({progressPct}%)
        </Badge>
      </div>

      {banner && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {banner}
        </div>
      )}

      {gate1 && gate1.status !== "completed" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 flex items-center gap-3 text-xs text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="size-4 text-amber-700 dark:text-amber-400 shrink-0" />
          <div>
            <strong>GATE 1 Pendente (Dia 10 — Fase 1 → Fase 2):</strong> &ldquo;Nada avança para a Fase 2 sem a
            conversão do Google Ads (formulário, WhatsApp e ligação) medindo e validada.&rdquo;
          </div>
        </div>
      )}

      {gate1?.status === "completed" && gate2 && gate2.status !== "completed" && (
        <div className="rounded-xl border border-sky-300 bg-sky-50 p-3.5 flex items-center gap-3 text-xs text-sky-950 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200">
          <AlertTriangle className="size-4 text-sky-700 dark:text-sky-400 shrink-0" />
          <div>
            <strong>GATE 2 (Dia 20 — Fase 2 → Fase 3):</strong> Verificar se os KPIs estão no alvo antes de entrar na
            semana final de escala.
          </div>
        </div>
      )}

      <Tabs defaultValue="roadmap" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="roadmap">Cronograma 30 Dias ({milestones.length})</TabsTrigger>
          <TabsTrigger value="checklist" className="gap-1.5">
            <ListChecks className="size-3.5" />
            Checklist do Plano ({auditDoneCount}/{planAudit.length})
          </TabsTrigger>
          <TabsTrigger value="ads">Google Ads, LinkedIn ABM &amp; Meta ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="geo">Teste GEO 10 Perguntas ({geoTests.length})</TabsTrigger>
          <TabsTrigger value="kpis">9 KPIs do Contrato ({kpis.length})</TabsTrigger>
        </TabsList>

        {/* TAB 1: CRONOGRAMA 30 DIAS */}
        <TabsContent value="roadmap" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card
              className={`cursor-pointer transition-colors ${statusFilter === "all" ? "border-foreground/50 bg-accent/30" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              <CardContent className="p-3.5">
                <div className="text-[11px] font-medium text-muted-foreground">Total de Marcos (30d)</div>
                <div className="mt-1 text-2xl font-bold font-mono">{milestones.length}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Conclusão global: {progressPct}%</div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors ${statusFilter === "completed" ? "border-emerald-500/60 bg-emerald-500/5" : ""}`}
              onClick={() => setStatusFilter("completed")}
            >
              <CardContent className="p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  Já Implementados
                </div>
                <div className="mt-1 text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-400">
                  {completedCount}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Operando no sistema</div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors ${statusFilter === "in_progress" ? "border-amber-500/60 bg-amber-500/5" : ""}`}
              onClick={() => setStatusFilter("in_progress")}
            >
              <CardContent className="p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-400">
                  <Clock className="size-3.5" />
                  Parcial / Em Andamento
                </div>
                <div className="mt-1 text-2xl font-bold font-mono text-amber-800 dark:text-amber-400">
                  {inProgressCount}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Base pronta, falta operação</div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors ${statusFilter === "pending" ? "border-rose-500/60 bg-rose-500/5" : ""}`}
              onClick={() => setStatusFilter("pending")}
            >
              <CardContent className="p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-800 dark:text-rose-400">
                  <CircleDashed className="size-3.5" />
                  Falta Implementar
                </div>
                <div className="mt-1 text-2xl font-bold font-mono text-rose-800 dark:text-rose-400">
                  {pendingCount}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Contas Ads, HeyGen e ações externas</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Conclusão Global dos 30 Dias (clique nos cartões para alternar status)</span>
                <span className="font-mono font-semibold">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((phase) => {
              const phaseRows = milestones.filter((m) => m.phase === phase);
              const phaseTitle = phaseRows[0]?.phase_title || `Fase ${phase}`;
              const list = phaseRows.filter((m) => statusFilter === "all" || m.status === statusFilter);
              return (
                <Card key={phase}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{phaseTitle}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    {loading && phaseRows.length === 0 ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((sk) => (
                          <div key={sk} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
                        ))}
                      </div>
                    ) : list.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
                        Nenhum marco neste filtro nesta fase.
                      </div>
                    ) : (
                      list.map((m) => {
                        const badgeProps = getMilestoneBadgeProps(m.status, m.due_day);
                        return (
                          <div
                            key={m.id}
                            onClick={() => cycleMilestoneStatus(m)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors space-y-1.5 ${
                              m.is_gate
                                ? "border-amber-400/70 bg-amber-50/70 dark:border-amber-500/45 dark:bg-amber-500/5"
                                : "border-border/80 bg-muted/20 hover:bg-accent/40"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                {m.status === "completed" ? (
                                  <CheckCircle2 className="size-3.5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                                ) : m.status === "in_progress" ? (
                                  <Clock className="size-3.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                                ) : (
                                  <CircleDashed className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                )}
                                <span
                                  className={`font-semibold leading-snug ${
                                    m.status === "completed" ? "text-muted-foreground" : "text-foreground"
                                  }`}
                                >
                                  {m.title}
                                </span>
                              </div>
                              <Badge variant="outline" className={`text-[10px] shrink-0 ${badgeProps.className}`}>
                                {badgeProps.label}
                              </Badge>
                            </div>
                            {m.description && <p className="text-[11px] text-muted-foreground pl-5">{m.description}</p>}
                            <div className="text-[10px] font-mono text-muted-foreground pl-5">Resp.: {m.owner}</div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 2: CHECKLIST DE IMPLEMENTAÇÃO DO PLANO DE AÇÃO PDF */}
        <TabsContent value="checklist" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                key: "done" as const,
                title: `Já Implementado (${auditDoneCount})`,
                subtitle: "Estrutura rodando ao vivo no CRM + Banco + IA",
                icon: CheckCircle2,
                headerClass: "text-emerald-800 dark:text-emerald-400",
                badgeClass:
                  "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300",
                badgeLabel: "Pronto",
              },
              {
                key: "partial" as const,
                title: `Parcial / Base Pronta (${auditPartialCount})`,
                subtitle: "Ferramentas no CRM esperando uso contínuo ou ligação API",
                icon: Clock,
                headerClass: "text-amber-800 dark:text-amber-400",
                badgeClass:
                  "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300",
                badgeLabel: "Parcial",
              },
              {
                key: "missing" as const,
                title: `Falta Implementar (${auditMissingCount})`,
                subtitle: "Ações externas em contas de anúncios, redes sociais e marca",
                icon: XCircle,
                headerClass: "text-rose-800 dark:text-rose-400",
                badgeClass:
                  "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-300",
                badgeLabel: "Pendente",
              },
            ].map((group) => {
              const GroupIcon = group.icon;
              const items = planAudit.filter((item) => item.state === group.key);
              return (
                <Card key={group.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className={`text-sm flex items-center gap-2 ${group.headerClass}`}>
                      <GroupIcon className="size-4 shrink-0" />
                      {group.title}
                    </CardTitle>
                    <CardDescription className="text-[11px]">{group.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-xs">
                    {items.map((item) => (
                      <div key={item.title} className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {item.area}
                          </span>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${group.badgeClass}`}>
                            {group.badgeLabel}
                          </Badge>
                        </div>
                        <div className="font-semibold text-foreground leading-snug">{item.title}</div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{item.detail}</p>
                        <div className="text-[10px] font-mono text-muted-foreground">Resp.: {item.owner}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 3: ADS & NEGATIVAS */}
        <TabsContent value="ads" className="space-y-4">
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Megaphone className="size-4 text-primary" />
                Auditoria Semanal de Termos de Busca &amp; Negativas via OpenAI (Toda Segunda)
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
                    <Badge
                      variant={c.budget_approved_by_klaus ? "default" : "secondary"}
                      className={`text-[10px] ${
                        c.budget_approved_by_klaus ? "bg-emerald-600 text-white" : ""
                      }`}
                    >
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

        {/* TAB 4: GEO 10 PERGUNTAS */}
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
                      {runningGeoId === t.id ? <Loader2 className="size-3.5 animate-spin" /> : <Bot className="size-3.5 text-amber-600 dark:text-amber-400" />}
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

        {/* TAB 5: 9 KPIS */}
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
