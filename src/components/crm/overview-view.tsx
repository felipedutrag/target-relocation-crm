"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Briefcase,
  Building2,
  FileSpreadsheet,
  FileText,
  FolderSync,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { CrmTab, DealRecord, Pipeline, Stage } from "./types";
import { formatDate, formatMoney, getStatusBadgeVariant } from "./utils";

interface OverviewData {
  kpis: {
    deals: {
      total: number;
      open_count: number;
      won_count: number;
      lost_count: number;
      open_value: number;
      won_value: number;
      total_value: number;
      dou_count: number;
      qualified_dou_count: number;
    };
    organizations: number;
    persons: number;
    notes: number;
    activities: { total: number; pending: number; completed: number };
    files: { total: number; local_count: number };
    auditedFiles: number;
    proposals: { total: number; sum_value: number };
  };
  pipelines: Pipeline[];
  stages: Stage[];
  byLabel: Array<{ label_name: string; label_color: string; count: number }>;
  byLostReason: Array<{ reason: string; count: number }>;
  byOwner: Array<{ owner_name: string; deals_count: number; open_count: number; won_count: number; total_value: number }>;
  topValuedDeals: DealRecord[];
  noteCategories: Array<{ category: string; count: number }>;
  pendingActivities: Array<{
    id: number;
    subject: string;
    type_name: string;
    due_date: string;
    cadence_period: string;
    deal_id: number | null;
    deal_title: string | null;
    owner_name: string | null;
  }>;
  lastSyncAt: string | null;
}

interface OverviewViewProps {
  onOpenDeal: (dealId: number) => void;
  onNavigate: (tab: CrmTab) => void;
}

export function OverviewView({ onOpenDeal, onNavigate }: OverviewViewProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/overview")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const { kpis } = data;
  const sdrStages = data.stages.filter((s) => s.pipeline_id === 1);
  const outboundStages = data.stages.filter((s) => s.pipeline_id === 2);
  const maxSdr = Math.max(1, ...sdrStages.map((s) => Number(s.deal_count || 0)));
  const maxOut = Math.max(1, ...outboundStages.map((s) => Number(s.deal_count || 0)));

  return (
    <div className="space-y-5">
      {/* Linear Workspace Title Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-[-0.025em]">
              Visão Geral — Workspace Target3
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Supabase PG17
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Base unificada do backup Pipedrive • {kpis.auditedFiles} arquivos auditados e migrados no Postgres 17
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("dou")}
            className="h-8 rounded-lg text-xs gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
            <span>Radar DOU</span>
            <span className="font-mono text-[11px] text-muted-foreground">({kpis.deals.dou_count})</span>
          </Button>
          <Button
            size="sm"
            onClick={() => onNavigate("pipelines")}
            className="h-8 rounded-lg text-xs gap-1.5 cursor-pointer"
          >
            Abrir Funis
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <Card
          className="cursor-pointer border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-foreground/25 transition-colors"
          onClick={() => onNavigate("pipelines")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1.5">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Negócios Totais
            </CardTitle>
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
              {kpis.deals.total.toLocaleString("pt-BR")}
            </div>
            <div className="flex flex-wrap items-center gap-2.5 mt-2.5 text-[11px] font-mono text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-sky-500" />
                {kpis.deals.open_count} abertos
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {kpis.deals.won_count} ganhos
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-rose-500" />
                {kpis.deals.lost_count} perdidos
              </span>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-foreground/25 transition-colors"
          onClick={() => onNavigate("proposals")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1.5">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Pipeline & Propostas
            </CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-semibold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatMoney(kpis.deals.total_value, "BRL")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2.5 font-mono tabular-nums">
              Ganhos: <strong className="text-foreground">{formatMoney(kpis.deals.won_value)}</strong> • Propostas:{" "}
              <strong className="text-foreground">{formatMoney(kpis.proposals.sum_value)}</strong>
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-foreground/25 transition-colors"
          onClick={() => onNavigate("organizations")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1.5">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Organizações & Pessoas
            </CardTitle>
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
              {kpis.organizations.toLocaleString("pt-BR")}{" "}
              <span className="font-sans text-xs font-normal text-muted-foreground">empresas</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2.5 flex items-center gap-1.5 font-mono tabular-nums">
              <Users className="h-3 w-3" />
              {kpis.persons.toLocaleString("pt-BR")} contatos vinculados
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-foreground/25 transition-colors"
          onClick={() => onNavigate("import")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1.5">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Notas, Cadência & Arquivos
            </CardTitle>
            <FolderSync className="h-3.5 w-3.5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
              {kpis.notes.toLocaleString("pt-BR")}{" "}
              <span className="font-sans text-xs font-normal text-muted-foreground">notas</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2.5 font-mono tabular-nums">
              {kpis.activities.pending} pendentes • {kpis.files.local_count} locais ({kpis.files.total} refs)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funis side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Funil 1 · CRM - SDR</CardTitle>
                <CardDescription className="text-xs">
                  Inbound, Formulários, WhatsApp, B2B/B2C & Snov
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono text-[11px] tabular-nums">
                {sdrStages.reduce((a, b) => a + Number(b.deal_count || 0), 0).toLocaleString("pt-BR")} deals
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {sdrStages.map((st) => {
              const cnt = Number(st.deal_count || 0);
              const pct = Math.round((cnt / maxSdr) * 100);
              return (
                <div key={st.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      <span className="font-mono text-muted-foreground mr-1.5">
                        0{st.order_nr + 1}
                      </span>
                      {st.name}
                    </span>
                    <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                      {cnt.toLocaleString("pt-BR")}{" "}
                      {Number(st.total_value || 0) > 0 ? `• ${formatMoney(st.total_value)}` : ""}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Funil 2 · Outbound (DOU & Cadência IA)
                </CardTitle>
                <CardDescription className="text-xs">
                  Prospecção automática Diário Oficial da União + BrasilAPI
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-[11px] tabular-nums">
                {outboundStages.reduce((a, b) => a + Number(b.deal_count || 0), 0).toLocaleString("pt-BR")} deals
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {outboundStages.map((st) => {
              const cnt = Number(st.deal_count || 0);
              const pct = Math.round((cnt / maxOut) * 100);
              return (
                <div key={st.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      <span className="font-mono text-muted-foreground mr-1.5">
                        0{st.order_nr}
                      </span>
                      {st.name}
                    </span>
                    <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                      {cnt.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Top Valued Deals + Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                Negócios Precificados & Propostas de Alto Valor
              </CardTitle>
              <CardDescription className="text-xs">
                Clique em qualquer linha para abrir o Dossiê 360° completo
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("pipelines")} className="h-7 text-xs">
              Ver todos →
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-border/60 p-0">
            {data.topValuedDeals.map((d) => {
              const stBadge = getStatusBadgeVariant(d.status);
              return (
                <div
                  key={d.id}
                  onClick={() => onOpenDeal(d.id)}
                  className="px-4 py-2.5 hover:bg-muted/40 cursor-pointer transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                        #{d.id}
                      </span>
                      <span className="font-medium text-xs sm:text-[13px] truncate">{d.title}</span>
                      <Badge variant="outline" className={`text-[10px] ${stBadge.className}`}>
                        {stBadge.label}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {d.stage_name} • {d.owner_name} {d.org_name ? `• ${d.org_name}` : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-semibold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatMoney(d.value, d.currency)}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {formatDate(d.update_time)}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Equipe */}
          <Card className="border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Distribuição por Proprietário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {data.byOwner.map((o) => (
                <div
                  key={o.owner_name}
                  className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20"
                >
                  <div>
                    <div className="font-medium">{o.owner_name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {o.open_count} abertos • {o.won_count} ganhos
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold tabular-nums">
                      {o.deals_count.toLocaleString("pt-BR")}
                    </div>
                    {o.total_value > 0 && (
                      <div className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                        {formatMoney(o.total_value)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Etiquetas */}
          <Card className="border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Etiquetas & Origem
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {data.byLabel.map((l) => (
                <Badge key={l.label_name} variant="secondary" className="font-mono text-[10px]">
                  {l.label_name}: {l.count.toLocaleString("pt-BR")}
                </Badge>
              ))}
            </CardContent>
          </Card>

          {/* Motivos de perda */}
          <Card className="border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Principais Motivos de Perda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs">
              {data.byLostReason.slice(0, 6).map((r) => (
                <div key={r.reason} className="flex items-center justify-between">
                  <span className="text-muted-foreground truncate pr-2">{r.reason}</span>
                  <span className="font-mono text-[11px] font-medium tabular-nums">
                    {r.count}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pending Activities & Note Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <CardHeader className="pb-2.5 border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-amber-500" />
              Próximas Atividades ({kpis.activities.pending})
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNavigate("activities")}>
              Ir para fila →
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-border/50 p-0">
            {data.pendingActivities.map((a) => (
              <div
                key={a.id}
                onClick={() => a.deal_id && onOpenDeal(a.deal_id)}
                className="px-4 py-2.5 hover:bg-muted/40 cursor-pointer flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{a.subject}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {a.type_name} • {a.cadence_period} • {a.deal_title || "Sem negócio"}
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                  {a.due_date || "Sem data"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <CardHeader className="pb-2.5 border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Inteligência Extraída das Notas ({kpis.notes.toLocaleString("pt-BR")})
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNavigate("proposals")}>
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
              Propostas
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pt-3 text-xs">
            {data.noteCategories.map((nc) => {
              const labels: Record<string, string> = {
                enrichment_score: "Enriquecimento Receita Federal & Score",
                dou_authorization: "Autorizações Publicadas no DOU (Expatriados)",
                call_script: "Scripts de Ligação Outbound Gerados por IA",
                email_sequence: "Sequências de 4 E-mails Outbound IA",
                inbound_form: "Formulários Inbound (PF/B2C/B2B)",
                general: "Observações Gerais & Histórico de Atendimento",
              };
              return (
                <div
                  key={nc.category}
                  className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/20"
                >
                  <span>{labels[nc.category] || nc.category}</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {nc.count.toLocaleString("pt-BR")}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
