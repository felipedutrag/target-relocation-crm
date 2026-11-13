"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  PhoneCall,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ParsedNoteMeta, Stage } from "./types";
import { getScoreColorClass } from "./utils";

interface DouItem {
  id: number;
  title: string;
  stage_id: number;
  stage_name: string;
  status: string;
  owner_name: string;
  org_name: string | null;
  cnpj: string | null;
  score: number | null;
  segment: string | null;
  website: string | null;
  expat_count: number;
  dou_act_type: string | null;
  dou_process: string | null;
  custom_email_tag: string | null;
  last_email_sent: string | null;
  dou_meta: ParsedNoteMeta | null;
  rf_meta: ParsedNoteMeta | null;
  has_email_sequence: boolean;
  has_call_script: boolean;
}

interface DouRadarViewProps {
  onOpenDeal: (dealId: number) => void;
}

export function DouRadarView({ onOpenDeal }: DouRadarViewProps) {
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState("all");
  const [stageId, setStageId] = useState("all");
  const [rn, setRn] = useState("all");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DouItem[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [stats, setStats] = useState({
    total_dou: 0,
    qualified_count: 0,
    high_score_count: 0,
    total_expats: 0,
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadDou = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: "18",
      });
      if (search.trim()) qs.set("search", search.trim());
      if (minScore !== "all") qs.set("min_score", minScore);
      if (stageId !== "all") qs.set("stage_id", stageId);
      if (rn !== "all") qs.set("rn", rn);

      const res = await fetch(`/api/dou?${qs.toString()}`);
      const json = await res.json();
      setItems(json.items || []);
      setStages(json.stages || []);
      if (json.stats) setStats(json.stats);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } finally {
      setLoading(false);
    }
  }, [search, minScore, stageId, rn, page]);

  useEffect(() => {
    const t = setTimeout(loadDou, 160);
    return () => clearTimeout(t);
  }, [loadDou]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-400" />
            Radar DOU & Inteligência Outbound
          </h1>
          <p className="text-sm text-muted-foreground">
            Publicações do Diário Oficial da União cruzadas com Receita Federal (BrasilAPI), sócios decisores, passaportes e scripts IA
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground">Empresas no Radar DOU</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.total_dou.toLocaleString("pt-BR")}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground">Expatriados Mapeados</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-indigo-400">
            {stats.total_expats.toLocaleString("pt-BR")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground">Qualificados (Score ≥ 40)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-400">
            {stats.qualified_count.toLocaleString("pt-BR")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground">Alta Prioridade (Score ≥ 60)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-400">
            {stats.high_score_count.toLocaleString("pt-BR")}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa, colaborador estrangeiro, passaporte, CNPJ ou nº do processo..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Select
            value={minScore}
            onValueChange={(v) => {
              setMinScore(v ?? "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[165px] text-xs">
              <SelectValue placeholder="Score mínimo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer Score</SelectItem>
              <SelectItem value="40">Score ≥ 40 (Qualificado)</SelectItem>
              <SelectItem value="60">Score ≥ 60 (Alto Fit)</SelectItem>
              <SelectItem value="75">Score ≥ 75 (ICP Ouro)</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={stageId}
            onValueChange={(v) => {
              setStageId(v ?? "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[170px] text-xs">
              <SelectValue placeholder="Etapa Outbound" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Etapas</SelectItem>
              {stages.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={rn}
            onValueChange={(v) => {
              setRn(v ?? "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Resolução Normativa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas RNs</SelectItem>
              <SelectItem value="02/2017">RN 02/2017 (Trabalho)</SelectItem>
              <SelectItem value="03/2017">RN 03/2017 (Técnico)</SelectItem>
              <SelectItem value="04/2017">RN 04/2017 (Transferência)</SelectItem>
              <SelectItem value="11/2017">RN 11/2017 (Diretor)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => {
            const expats = item.dou_meta?.expats || [];
            const partners = item.rf_meta?.partners || [];
            return (
              <Card
                key={item.id}
                onClick={() => onOpenDeal(item.id)}
                className="cursor-pointer hover:border-primary/60 transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="text-[11px]">
                      {item.stage_name}
                    </Badge>
                    {item.score !== null && item.score !== undefined ? (
                      <Badge variant="outline" className={`text-[11px] ${getScoreColorClass(item.score)}`}>
                        Score {item.score}/100
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px]">
                        Sem score
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm leading-snug line-clamp-2 flex items-start gap-1.5">
                    <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{item.org_name || item.title}</span>
                  </CardTitle>
                  {item.score !== null && item.score !== undefined && (
                    <Progress value={item.score} className="h-1.5" />
                  )}
                </CardHeader>

                <CardContent className="space-y-3 text-xs flex-1">
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="p-1.5 rounded bg-muted/40 truncate">
                      <span className="text-muted-foreground">CNPJ: </span>
                      <span className="font-mono">{item.cnpj || item.rf_meta?.cnpj || "—"}</span>
                    </div>
                    <div className="p-1.5 rounded bg-muted/40 truncate">
                      <span className="text-muted-foreground">Resp.: </span>
                      <span>{item.owner_name}</span>
                    </div>
                  </div>

                  {/* Expatriate box */}
                  <div className="p-2.5 rounded-md border border-indigo-500/20 bg-indigo-500/5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-300">
                      <span className="inline-flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5" />
                        Expatriados ({item.expat_count || expats.length || 1})
                      </span>
                      {item.dou_meta?.term && <span>Prazo: {item.dou_meta.term}</span>}
                    </div>
                    {item.dou_act_type && (
                      <div className="text-[10px] text-muted-foreground truncate">{item.dou_act_type}</div>
                    )}
                    {item.dou_process && (
                      <div className="text-[10px] font-mono text-muted-foreground">Proc: {item.dou_process}</div>
                    )}
                    {expats.slice(0, 2).map((ex, i) => (
                      <div key={i} className="text-[11px] text-foreground truncate pt-0.5">
                        • {ex.name} ({ex.country})
                      </div>
                    ))}
                  </div>

                  {partners.length > 0 && (
                    <div className="text-[11px] text-muted-foreground truncate">
                      <strong className="text-foreground">Decisor RF:</strong> {partners[0]}
                    </div>
                  )}

                  {/* AI Assets Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-border/60">
                    <div className="flex flex-wrap gap-1">
                      {item.has_call_script && (
                        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300 gap-1">
                          <PhoneCall className="h-2.5 w-2.5" />
                          Script Call
                        </Badge>
                      )}
                      {item.has_email_sequence && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-300 gap-1">
                          <Mail className="h-2.5 w-2.5" />
                          4 E-mails
                        </Badge>
                      )}
                      {item.custom_email_tag && (
                        <Badge variant="secondary" className="text-[10px]">
                          {item.custom_email_tag}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-primary inline-flex items-center gap-0.5 font-medium">
                      <Sparkles className="h-3 w-3" />
                      Abrir <ExternalLink className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Total: {total.toLocaleString("pt-BR")} processos DOU • Página {page} de {totalPages}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
