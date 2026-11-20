"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Columns3,
  FileText,
  List,
  Plus,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { DealRecord, Pipeline, Stage } from "./types";
import {
  formatDate,
  formatMoney,
  getLabelColorClass,
  getScoreColorClass,
  getStatusBadgeVariant,
} from "./utils";

interface PipelinesViewProps {
  onOpenDeal: (dealId: number) => void;
}

interface KanbanColumn extends Stage {
  total_count: number;
  total_value: number;
  deals: DealRecord[];
}

export function PipelinesView({ onOpenDeal }: PipelinesViewProps) {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [pipelineId, setPipelineId] = useState<string>("1");
  const [status, setStatus] = useState<string>("open");
  const [owner, setOwner] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [onlyValued, setOnlyValued] = useState(false);
  const [sort, setSort] = useState("update_desc");
  const [page, setPage] = useState(1);

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Create Deal Dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newOrg, setNewOrg] = useState("");
  const [newPerson, setNewPerson] = useState("");
  const [newValue, setNewValue] = useState("0");
  const [newOwner, setNewOwner] = useState("Klaus");

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        view: viewMode,
        pipeline_id: pipelineId,
        status,
        owner,
        sort,
        page: String(page),
        limit: "30",
        column_limit: "25",
      });
      if (search.trim()) qs.set("search", search.trim());
      if (onlyValued) qs.set("only_valued", "true");

      const res = await fetch(`/api/deals?${qs.toString()}`);
      const json = await res.json();
      setPipelines(json.pipelines || []);
      setStages(json.stages || []);
      if (viewMode === "kanban") {
        setColumns(json.columns || []);
      } else {
        setDeals(json.deals || []);
        setTotal(json.total || 0);
        setTotalPages(json.totalPages || 1);
      }
    } finally {
      setLoading(false);
    }
  }, [viewMode, pipelineId, status, owner, search, onlyValued, sort, page]);

  useEffect(() => {
    const t = setTimeout(fetchDeals, 150);
    return () => clearTimeout(t);
  }, [fetchDeals]);

  async function moveDealToStage(dealId: number, stageId: number) {
    await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "move_stage", deal_id: dealId, stage_id: stageId }),
    });
    fetchDeals();
  }

  async function handleCreateDeal() {
    if (!newTitle.trim()) return;
    await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        org_name: newOrg,
        person_name: newPerson,
        value: Number(newValue || 0),
        owner_name: newOwner,
        pipeline_id: Number(pipelineId),
      }),
    });
    setCreateOpen(false);
    setNewTitle("");
    setNewOrg("");
    setNewPerson("");
    setNewValue("0");
    fetchDeals();
  }

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-card">
            {(pipelines.length > 0
              ? pipelines
              : [
                  { id: 1, name: "CRM - SDR" },
                  { id: 2, name: "Outbound" },
                ]
            ).map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={pipelineId === String(p.id) ? "default" : "ghost"}
                className="h-8 text-xs"
                onClick={() => {
                  setPipelineId(String(p.id));
                  setPage(1);
                }}
              >
                {p.name}
              </Button>
            ))}
          </div>

          <div className="inline-flex rounded-lg border border-border p-0.5 bg-card">
            <Button
              size="sm"
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              className="h-8 text-xs gap-1.5"
              onClick={() => setViewMode("kanban")}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Kanban
            </Button>
            <Button
              size="sm"
              variant={viewMode === "table" ? "secondary" : "ghost"}
              className="h-8 text-xs gap-1.5"
              onClick={() => setViewMode("table")}
            >
              <List className="h-3.5 w-3.5" />
              Lista
            </Button>
          </div>
        </div>

        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Novo Negócio
        </Button>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar título, empresa, pessoa, CNPJ ou processo DOU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v ?? "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[135px] text-xs">
              <SelectValue>
                {status === "all"
                  ? "Todos Status"
                  : status === "open"
                    ? "Abertos"
                    : status === "won"
                      ? "Ganhos"
                      : "Perdidos"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="open">Abertos</SelectItem>
              <SelectItem value="won">Ganhos</SelectItem>
              <SelectItem value="lost">Perdidos</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={owner}
            onValueChange={(v) => {
              setOwner(v ?? "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue>{owner === "all" ? "Todos Usuários" : owner}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Usuários</SelectItem>
              <SelectItem value="Klaus">Klaus</SelectItem>
              <SelectItem value="Anderley Nino">Anderley Nino</SelectItem>
              <SelectItem value="Aurea Azevedo">Aurea Azevedo</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => setSort(v ?? "update_desc")}>
            <SelectTrigger className="h-8 w-[165px] text-xs">
              <SelectValue>
                {sort === "update_desc"
                  ? "Mais recentes"
                  : sort === "value_desc"
                    ? "Maior valor"
                    : sort === "score_desc"
                      ? "Maior Score"
                      : "Data de criação"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="update_desc">Mais recentes</SelectItem>
              <SelectItem value="value_desc">Maior valor</SelectItem>
              <SelectItem value="score_desc">Maior Score</SelectItem>
              <SelectItem value="add_desc">Data de criação</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 pl-1">
            <Switch
              id="only-valued"
              checked={onlyValued}
              onCheckedChange={(v) => {
                setOnlyValued(v);
                setPage(1);
              }}
            />
            <Label htmlFor="only-valued" className="text-xs cursor-pointer">
              Com valor &gt; 0
            </Label>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[420px] w-full" />
          ))}
        </div>
      ) : viewMode === "kanban" ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {columns.map((col, colIdx) => {
              const nextStage = columns[colIdx + 1];
              return (
                <div
                  key={col.id}
                  className="w-[300px] shrink-0 rounded-xl border border-border bg-card/40 flex flex-col max-h-[calc(100vh-270px)]"
                >
                  <div className="p-3 border-b border-border bg-card/80 rounded-t-xl">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs truncate">{col.name}</span>
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {col.total_count.toLocaleString("pt-BR")}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                      {col.total_value > 0 ? formatMoney(col.total_value) : "Sem valor atribuído"}
                    </div>
                  </div>

                  <div className="p-2 space-y-2 overflow-y-auto flex-1">
                    {col.deals.length === 0 ? (
                      <div className="text-center py-8 text-xs text-muted-foreground">
                        Nenhum negócio nesta etapa
                      </div>
                    ) : (
                      col.deals.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => onOpenDeal(d.id)}
                          className="p-2.5 rounded-lg border border-border bg-background hover:border-primary/60 cursor-pointer transition-all space-y-1.5 group"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                              {d.title}
                            </span>
                            {d.score !== null && d.score !== undefined && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] shrink-0 px-1.5 py-0 ${getScoreColorClass(d.score)}`}
                              >
                                {d.score}
                              </Badge>
                            )}
                          </div>

                          {(d.org_name || d.person_name) && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                              <Building2 className="h-3 w-3 shrink-0" />
                              <span className="truncate">{d.org_name || d.person_name}</span>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {d.value > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40"
                              >
                                {formatMoney(d.value, d.currency)}
                              </Badge>
                            )}
                            {d.label_name && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${getLabelColorClass(d.label_color)}`}
                              >
                                {d.label_name}
                              </Badge>
                            )}
                            {d.is_dou === 1 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/40"
                              >
                                <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                                DOU
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1 truncate">
                              <User className="h-2.5 w-2.5" />
                              {d.owner_name}
                            </span>
                            <div className="flex items-center gap-2">
                              {d.notes_count > 0 && (
                                <span className="inline-flex items-center gap-0.5">
                                  <FileText className="h-2.5 w-2.5" />
                                  {d.notes_count}
                                </span>
                              )}
                              {nextStage && (
                                <button
                                  type="button"
                                  title={`Mover para ${nextStage.name}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveDealToStage(d.id, nextStage.id);
                                  }}
                                  className="p-0.5 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary"
                                >
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    {col.total_count > col.deals.length && (
                      <div className="text-center py-2 text-[11px] text-muted-foreground">
                        Mostrando {col.deals.length} de {col.total_count.toLocaleString("pt-BR")} (use a busca ou Visão Lista)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">ID</TableHead>
                  <TableHead>Título / Organização</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Etiqueta</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Proprietário</TableHead>
                  <TableHead className="text-right">Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((d) => {
                  const st = getStatusBadgeVariant(d.status);
                  return (
                    <TableRow
                      key={d.id}
                      onClick={() => onOpenDeal(d.id)}
                      className="cursor-pointer hover:bg-accent/40"
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">#{d.id}</TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="font-medium text-xs truncate">{d.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {d.org_name || d.person_name || "—"} {d.cnpj ? `• ${d.cnpj}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{d.stage_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${st.className}`}>
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {d.label_name ? (
                          <Badge variant="outline" className={`text-[10px] ${getLabelColorClass(d.label_color)}`}>
                            {d.label_name}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {d.score !== null && d.score !== undefined ? (
                          <Badge variant="outline" className={`text-[10px] ${getScoreColorClass(d.score)}`}>
                            {d.score}/100
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        {d.value > 0 ? formatMoney(d.value, d.currency) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{d.owner_name}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDate(d.update_time)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Total: {total.toLocaleString("pt-BR")} negócios • Página {page} de {totalPages}
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
        </Card>
      )}

      {/* New Deal Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Negócio</DialogTitle>
            <DialogDescription>
              Criar oportunidade diretamente no funil {pipelineId === "2" ? "Outbound" : "CRM - SDR"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Título do Negócio *</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Empresa XPTO — Visto Trabalho RN02"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Organização</Label>
                <Input value={newOrg} onChange={(e) => setNewOrg(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Contato</Label>
                <Input value={newPerson} onChange={(e) => setNewPerson(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Valor (BRL)</Label>
                <Input type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Proprietário</Label>
                <Select value={newOwner} onValueChange={(v) => setNewOwner(v ?? "Klaus")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue>{newOwner}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Klaus">Klaus</SelectItem>
                    <SelectItem value="Anderley Nino">Anderley Nino</SelectItem>
                    <SelectItem value="Aurea Azevedo">Aurea Azevedo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateDeal} disabled={!newTitle.trim()}>
              Criar Negócio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
