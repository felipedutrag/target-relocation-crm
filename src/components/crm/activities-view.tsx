"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  ListChecks,
  PhoneCall,
  Plus,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActivityRecord } from "./types";

interface ActivitiesViewProps {
  onOpenDeal: (dealId: number) => void;
}

export function ActivitiesView({ onOpenDeal }: ActivitiesViewProps) {
  const [doneFilter, setDoneFilter] = useState("0");
  const [typeFilter, setTypeFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    auto_cadence: 0,
    manha: 0,
    tarde: 0,
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [actType, setActType] = useState("call");
  const [dueDate, setDueDate] = useState("2026-11-13");
  const [ownerName, setOwnerName] = useState("Klaus");
  const [note, setNote] = useState("");

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        done: doneFilter,
        type: typeFilter,
        period: periodFilter,
        owner: ownerFilter,
        page: String(page),
        limit: "35",
      });
      if (search.trim()) qs.set("search", search.trim());
      const res = await fetch(`/api/activities?${qs.toString()}`);
      const json = await res.json();
      setActivities(json.activities || []);
      if (json.summary) setSummary(json.summary);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } finally {
      setLoading(false);
    }
  }, [doneFilter, typeFilter, periodFilter, ownerFilter, search, page]);

  useEffect(() => {
    const t = setTimeout(loadActivities, 150);
    return () => clearTimeout(t);
  }, [loadActivities]);

  async function toggleDone(act: ActivityRecord) {
    await fetch("/api/activities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: act.id, done: !act.done }),
    });
    loadActivities();
  }

  async function handleCreate() {
    if (!subject.trim()) return;
    await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, type: actType, due_date: dueDate, owner_name: ownerName, note }),
    });
    setCreateOpen(false);
    setSubject("");
    setNote("");
    loadActivities();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            Atividades & Cadência Outbound
          </h1>
          <p className="text-sm text-muted-foreground">
            Fila operacional de tarefas, ligações e etapas automáticas [MANHÃ] / [TARDE]
          </p>
        </div>
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nova Atividade
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="cursor-pointer" onClick={() => { setDoneFilter("0"); setPage(1); }}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-400">{summary.pending}</CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => { setDoneFilter("1"); setPage(1); }}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-400">
            {summary.completed.toLocaleString("pt-BR")}
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => { setPeriodFilter("MANHÃ"); setPage(1); }}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Bloco [MANHÃ]</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.manha.toLocaleString("pt-BR")}</CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => { setPeriodFilter("TARDE"); setPage(1); }}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Bloco [TARDE]</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.tarde.toLocaleString("pt-BR")}</CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar assunto, empresa, negócio ou nota da cadência..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Select value={doneFilter} onValueChange={(v) => { setDoneFilter(v ?? "0"); setPage(1); }}>
            <SelectTrigger className="h-8 w-[135px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">A Fazer</SelectItem>
              <SelectItem value="1">Concluídas</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="h-8 w-[135px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Tipos</SelectItem>
              <SelectItem value="call">Chamada</SelectItem>
              <SelectItem value="task">Tarefa</SelectItem>
              <SelectItem value="meeting">Reunião</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={(v) => { setPeriodFilter(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Períodos</SelectItem>
              <SelectItem value="MANHÃ">[MANHÃ]</SelectItem>
              <SelectItem value="TARDE">[TARDE]</SelectItem>
              <SelectItem value="GERAL">Geral</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ownerFilter} onValueChange={(v) => { setOwnerFilter(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="h-8 w-[145px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Usuários</SelectItem>
              <SelectItem value="Klaus">Klaus</SelectItem>
              <SelectItem value="Anderley Nino">Anderley Nino</SelectItem>
              <SelectItem value="Aurea Azevedo">Aurea Azevedo</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardContent className="p-3 space-y-2">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Carregando atividades...</div>
          ) : activities.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Nenhuma atividade encontrada para os filtros.</div>
          ) : (
            activities.map((a) => (
              <div
                key={a.id}
                className="p-3 rounded-lg border border-border bg-card/40 hover:bg-accent/30 transition-colors flex items-start gap-3"
              >
                <Checkbox
                  checked={a.done === 1}
                  onCheckedChange={() => toggleDone(a)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`text-xs font-semibold ${a.done === 1 ? "line-through text-muted-foreground" : ""}`}>
                      {a.subject}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {a.type === "call" && <PhoneCall className="h-2.5 w-2.5 mr-1" />}
                        {a.type_name || a.type}
                      </Badge>
                      {a.cadence_period !== "GERAL" && (
                        <Badge variant="secondary" className="text-[10px]">
                          {a.cadence_period}
                        </Badge>
                      )}
                      {a.is_auto_cadence === 1 && (
                        <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-300">
                          Cadência Auto
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {a.due_date || "Sem data"} {a.due_time || ""}
                    </span>
                    <span>Resp.: {a.owner_name || "Klaus"}</span>
                    {a.deal_id && (
                      <button
                        type="button"
                        onClick={() => onOpenDeal(a.deal_id!)}
                        className="text-sky-400 hover:underline inline-flex items-center gap-1"
                      >
                        Negócio: {a.deal_title || `#${a.deal_id}`}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {a.note && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 whitespace-pre-wrap line-clamp-3">
                      {a.note}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>

        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Total: {total.toLocaleString("pt-BR")} atividades • Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="h-7 px-2" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Atividade</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Assunto *</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={actType} onValueChange={(v) => setActType(v ?? "call")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Chamada</SelectItem>
                    <SelectItem value="task">Tarefa</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Vencimento</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Responsável</Label>
                <Select value={ownerName} onValueChange={(v) => setOwnerName(v ?? "Klaus")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Klaus">Klaus</SelectItem>
                    <SelectItem value="Anderley Nino">Anderley Nino</SelectItem>
                    <SelectItem value="Aurea Azevedo">Aurea Azevedo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Nota / Instruções</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!subject.trim()}>
              Salvar Atividade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
