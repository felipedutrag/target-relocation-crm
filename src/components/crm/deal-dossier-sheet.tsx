"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Globe,
  History,
  Image as ImageIcon,
  Mail,
  MessageSquarePlus,
  Paperclip,
  PhoneCall,
  Plus,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  ActivityRecord,
  DealRecord,
  FileRecord,
  NoteRecord,
  ProposalRecord,
  Stage,
} from "./types";
import {
  buildWhatsappUrl,
  formatBytes,
  formatDate,
  formatMoney,
  getLabelColorClass,
  getScoreColorClass,
  getStatusBadgeVariant,
} from "./utils";

interface DealDossierSheetProps {
  dealId: number | null;
  onClose: () => void;
  onUpdated?: () => void;
}

interface DealDetailPayload {
  deal: DealRecord;
  organization: Record<string, unknown> | null;
  person: Record<string, unknown> | null;
  notes: NoteRecord[];
  activities: ActivityRecord[];
  files: FileRecord[];
  flowEvents: Array<{
    id: number;
    timestamp: string;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    old_label: string | null;
    new_label: string | null;
    change_source: string | null;
  }>;
  proposals: ProposalRecord[];
  stages: Stage[];
  mailThreads: Array<{
    id: number;
    subject: string;
    snippet: string;
  }>;
}

export function DealDossierSheet({ dealId, onClose, onUpdated }: DealDossierSheetProps) {
  const [data, setData] = useState<DealDetailPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [editValue, setEditValue] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newActSubject, setNewActSubject] = useState("");
  const [newActType, setNewActType] = useState("call");

  async function loadDetail(id: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/deals/${id}`);
      if (res.ok) {
        const json = (await res.json()) as DealDetailPayload;
        setData(json);
        setEditValue(String(json.deal.value || 0));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (dealId) {
      loadDetail(dealId);
    } else {
      setData(null);
    }
  }, [dealId]);

  async function patchDeal(payload: Record<string, unknown>) {
    if (!dealId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await loadDetail(dealId);
        onUpdated?.();
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivity(act: ActivityRecord) {
    await fetch("/api/activities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: act.id, done: !act.done }),
    });
    if (dealId) await loadDetail(dealId);
    onUpdated?.();
  }

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  const deal = data?.deal;
  const currentStage = data?.stages.find((st) => st.id === deal?.stage_id);
  const douNotes = data?.notes.filter((n) => n.note_category === "dou_authorization") || [];
  const rfNotes = data?.notes.filter((n) => n.note_category === "enrichment_score") || [];
  const emailSeqNotes = data?.notes.filter((n) => n.note_category === "email_sequence") || [];
  const callScriptNotes = data?.notes.filter((n) => n.note_category === "call_script") || [];

  const personPhones = data?.person?.primary_phone ? String(data.person.primary_phone) : null;
  const waUrl = buildWhatsappUrl(personPhones);

  return (
    <Sheet open={dealId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl p-0 flex flex-col bg-background border-border overflow-hidden"
      >
        {loading && !data ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : deal ? (
          <>
            <SheetHeader className="p-5 pb-4 border-b border-border bg-card/50">
              <div className="flex flex-wrap items-start justify-between gap-3 pr-10">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      #{deal.id}
                    </Badge>
                    <Badge variant="outline" className={getStatusBadgeVariant(deal.status).className}>
                      {getStatusBadgeVariant(deal.status).label}
                    </Badge>
                    <Badge variant="secondary">{deal.pipeline_name}</Badge>
                    {deal.label_name && (
                      <Badge variant="outline" className={getLabelColorClass(deal.label_color)}>
                        {deal.label_name}
                      </Badge>
                    )}
                    {deal.score !== null && deal.score !== undefined && (
                      <Badge variant="outline" className={getScoreColorClass(deal.score)}>
                        Score {deal.score}/100
                      </Badge>
                    )}
                    {deal.is_dou === 1 && (
                      <Badge className="bg-indigo-100 text-indigo-900 border border-indigo-300 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/40 dark:hover:bg-indigo-500/30">
                        DOU • {deal.expat_count || 1} Expatriado(s)
                      </Badge>
                    )}
                  </div>
                  <SheetTitle className="text-xl leading-tight truncate">{deal.title}</SheetTitle>
                  <SheetDescription className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      Prop.: <strong className="text-foreground">{deal.owner_name || "Klaus"}</strong>
                    </span>
                    {deal.org_name && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {deal.org_name}
                      </span>
                    )}
                    {deal.person_name && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {deal.person_name}
                      </span>
                    )}
                    <span>Atualizado em {formatDate(deal.update_time)}</span>
                  </SheetDescription>
                </div>

                <div className="flex items-center gap-2">
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({
                        size: "sm",
                        variant: "outline",
                        className:
                          "h-8 gap-1.5 text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-transparent dark:text-emerald-300 dark:border-emerald-500/40",
                      })}
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  )}
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Valor do Negócio</div>
                    <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                      {formatMoney(deal.value, deal.currency)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick stage / status / value controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3">
                <div className="min-w-0">
                  <Label className="text-[11px] text-muted-foreground">Etapa do Funil</Label>
                  <Select
                    value={String(deal.stage_id)}
                    onValueChange={(v) => patchDeal({ stage_id: Number(v) })}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-8 w-full text-xs mt-1">
                      <SelectValue>
                        {currentStage ? `${currentStage.order_nr}. ${currentStage.name}` : "Selecionar etapa"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {data.stages.map((st) => (
                        <SelectItem key={st.id} value={String(st.id)}>
                          {st.order_nr}. {st.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0">
                  <Label className="text-[11px] text-muted-foreground">Status</Label>
                  <Select
                    value={deal.status}
                    onValueChange={(v) => patchDeal({ status: v })}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-8 w-full text-xs mt-1">
                      <SelectValue>
                        {deal.status === "won"
                          ? "Ganho (Won)"
                          : deal.status === "lost"
                            ? "Perdido (Lost)"
                            : "Aberto (Open)"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberto (Open)</SelectItem>
                      <SelectItem value="won">Ganho (Won)</SelectItem>
                      <SelectItem value="lost">Perdido (Lost)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0">
                  <Label className="text-[11px] text-muted-foreground">Proprietário</Label>
                  <Select
                    value={deal.owner_name || "Klaus"}
                    onValueChange={(v) => patchDeal({ owner_name: v })}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-8 w-full text-xs mt-1">
                      <SelectValue>{deal.owner_name || "Klaus"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Klaus">Klaus</SelectItem>
                      <SelectItem value="Anderley Nino">Anderley Nino</SelectItem>
                      <SelectItem value="Aurea Azevedo">Aurea Azevedo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0">
                  <Label className="text-[11px] text-muted-foreground">Valor ({deal.currency})</Label>
                  <div className="flex items-center gap-1.5 mt-1 min-w-0">
                    <Input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-8 text-xs font-mono flex-1 min-w-0"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 px-2.5 text-xs shrink-0"
                      disabled={saving}
                      onClick={() => patchDeal({ value: Number(editValue || 0) })}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              </div>
            </SheetHeader>

            <Tabs
              defaultValue={
                douNotes.length > 0 || rfNotes.length > 0 || callScriptNotes.length > 0
                  ? "intelligence"
                  : "notes"
              }
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="px-5 py-2.5 border-b border-border bg-muted/20">
                <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-muted/60 p-1 rounded-lg">
                  <TabsTrigger value="intelligence" className="text-xs gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Inteligência DOU & IA
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Notas ({data.notes.length})
                  </TabsTrigger>
                  <TabsTrigger value="activities" className="text-xs gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    Atividades ({data.activities.length})
                  </TabsTrigger>
                  <TabsTrigger value="files" className="text-xs gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" />
                    Arquivos ({data.files.length})
                  </TabsTrigger>
                  <TabsTrigger value="flow" className="text-xs gap-1.5">
                    <History className="h-3.5 w-3.5" />
                    Histórico ({data.flowEvents.length})
                  </TabsTrigger>
                  <TabsTrigger value="fields" className="text-xs gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Campos & UTM
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="p-5 space-y-4">
                {/* TAB 1: INTELIGÊNCIA DOU & IA */}
                <TabsContent value="intelligence" className="mt-0 space-y-4">
                  {/* Contato & Empresa Resumo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          Organização Vinculada
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1.5">
                        <div className="font-semibold text-sm">
                          {deal.org_name || String(data.organization?.name || "Não vinculada")}
                        </div>
                        {deal.cnpj && (
                          <div className="text-muted-foreground font-mono">CNPJ: {deal.cnpj}</div>
                        )}
                        {deal.segment && <div className="text-muted-foreground">Segmento/CNAE: {deal.segment}</div>}
                        {(deal.website || Boolean(data.organization?.website)) && (
                          <div className="text-sky-700 dark:text-sky-400 truncate">
                            {deal.website || String(data.organization?.website)}
                          </div>
                        )}
                        {Boolean(data.organization?.address) && (
                          <div className="text-muted-foreground">{String(data.organization?.address)}</div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          Pessoa de Contato
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1.5">
                        <div className="font-semibold text-sm">
                          {deal.person_name || String(data.person?.name || "Sem contato direto")}
                        </div>
                        {Boolean(data.person?.primary_email) && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {String(data.person?.primary_email)}
                          </div>
                        )}
                        {personPhones && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <PhoneCall className="h-3.5 w-3.5" />
                            {personPhones}
                          </div>
                        )}
                        {deal.lost_reason && (
                          <div className="mt-2 rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-900 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-300 break-words">
                            Motivo perda: {deal.lost_reason}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* DOU Extractions */}
                  {douNotes.map((n) => {
                    const meta = n.parsed_meta;
                    return (
                      <Card key={n.id} className="border-indigo-500/30 bg-indigo-500/5">
                        <CardHeader className="pb-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle className="text-sm flex items-center gap-2 text-indigo-600 dark:text-indigo-300">
                              <ShieldCheck className="h-4 w-4 shrink-0" />
                              <span>Autorização Publicada no DOU ({meta?.expat_count || 1} colaborador)</span>
                            </CardTitle>
                            <Badge variant="outline" className="font-mono text-[11px] shrink-0">
                              {meta?.process_number || deal.dou_process || "DOU"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                          <div className="flex flex-wrap gap-3 text-muted-foreground">
                            {meta?.normative_resolution && (
                              <span>
                                Ato: <strong className="text-foreground">{meta.normative_resolution}</strong>
                              </span>
                            )}
                            {meta?.term && (
                              <span>
                                Prazo: <strong className="text-foreground">{meta.term}</strong>
                              </span>
                            )}
                          </div>
                          {meta?.expats && meta.expats.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {meta.expats.map((ex, idx) => (
                                <div key={idx} className="p-2.5 rounded-md border border-border bg-background/80">
                                  <div className="font-semibold text-foreground">{ex.name}</div>
                                  <div className="text-muted-foreground mt-0.5">
                                    País: <span className="text-foreground">{ex.country}</span>
                                  </div>
                                  <div className="text-muted-foreground flex gap-3 mt-0.5 font-mono text-[11px]">
                                    {ex.birth_date && <span>Nasc: {ex.birth_date}</span>}
                                    {ex.passport && <span>Passaporte: {ex.passport}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* RF Enrichment & Score */}
                  {rfNotes.slice(0, 2).map((n) => {
                    const meta = n.parsed_meta;
                    return (
                      <Card key={n.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-sm">Enriquecimento Receita Federal & Score</CardTitle>
                            {meta?.score !== undefined && (
                              <Badge variant="outline" className={getScoreColorClass(meta.score)}>
                                Score {meta.score}/100 {meta.qualified ? "• QUALIFICADO" : "• Abaixo do limiar"}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                          {meta?.score !== undefined && <Progress value={meta.score} className="h-2" />}
                          {meta?.criteria && (
                            <div className="text-muted-foreground">
                              <strong>Critérios:</strong> {meta.criteria}
                            </div>
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                            {meta?.rf_status && (
                              <div className="p-2 rounded bg-muted/40">
                                <div className="text-[10px] text-muted-foreground">Situação RF</div>
                                <div className="font-medium">{meta.rf_status}</div>
                              </div>
                            )}
                            {meta?.cnpj && (
                              <div className="p-2 rounded bg-muted/40">
                                <div className="text-[10px] text-muted-foreground">CNPJ</div>
                                <div className="font-mono font-medium">{meta.cnpj}</div>
                              </div>
                            )}
                            {meta?.capital && (
                              <div className="p-2 rounded bg-muted/40">
                                <div className="text-[10px] text-muted-foreground">Capital Social</div>
                                <div className="font-medium">{meta.capital}</div>
                              </div>
                            )}
                            {meta?.foundation && (
                              <div className="p-2 rounded bg-muted/40">
                                <div className="text-[10px] text-muted-foreground">Fundação</div>
                                <div className="font-medium">{meta.foundation}</div>
                              </div>
                            )}
                            {meta?.city && (
                              <div className="p-2 rounded bg-muted/40">
                                <div className="text-[10px] text-muted-foreground">Cidade/UF</div>
                                <div className="font-medium">{meta.city}</div>
                              </div>
                            )}
                            {meta?.phone && (
                              <div className="p-2 rounded bg-muted/40">
                                <div className="text-[10px] text-muted-foreground">Telefone RF</div>
                                <div className="font-medium">{meta.phone}</div>
                              </div>
                            )}
                          </div>
                          {meta?.partners && meta.partners.length > 0 && (
                            <div>
                              <div className="font-semibold mb-1.5">Quadro Societário (Decisores):</div>
                              <div className="flex flex-wrap gap-1.5">
                                {meta.partners.map((p, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-[11px] font-normal">
                                    {p}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Call Script IA */}
                  {callScriptNotes.slice(0, 1).map((n) => (
                    <Card key={n.id} className="border-amber-500/30">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2 text-amber-800 dark:text-amber-300">
                            <PhoneCall className="h-4 w-4" />
                            Script de Ligação Outbound IA
                          </CardTitle>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => copyText(`script-${n.id}`, n.content.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))}
                          >
                            <Copy className="h-3 w-3" />
                            {copiedKey === `script-${n.id}` ? "Copiado!" : "Copiar Script"}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div
                          className="text-xs leading-relaxed whitespace-pre-wrap text-foreground/90 prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: n.content }}
                        />
                      </CardContent>
                    </Card>
                  ))}

                  {/* Email Sequence IA */}
                  {emailSeqNotes.slice(0, 1).map((n) => (
                    <Card key={n.id} className="border-emerald-500/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                          <Mail className="h-4 w-4" />
                          Sequência de E-mails Outbound (D+0 a D+17)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {n.parsed_meta?.emails && n.parsed_meta.emails.length > 0 ? (
                          n.parsed_meta.emails.map((em, idx) => (
                            <div key={idx} className="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <Badge variant="secondary" className="text-[11px]">
                                  {em.step}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => copyText(`em-${idx}`, `Assunto: ${em.subject}\n\n${em.body}`)}
                                >
                                  <Copy className="h-3 w-3" />
                                  {copiedKey === `em-${idx}` ? "Copiado!" : "Copiar"}
                                </Button>
                              </div>
                              <div className="text-xs font-semibold text-foreground">
                                Assunto: {em.subject}
                              </div>
                              <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                {em.body}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div
                            className="text-xs leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: n.content }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {/* Proposals linked */}
                  {data.proposals.length > 0 && (
                    <Card className="border-primary/40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Propostas Comerciais Vinculadas</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {data.proposals.map((p) => (
                          <div key={p.id} className="p-3 rounded-md border border-border flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-xs">{p.title}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {p.country_route} • {p.status}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                                {formatMoney(p.total_value, p.currency)}
                              </div>
                              {p.attachment_file_id && (
                                <a
                                  href={`/api/files/${p.attachment_file_id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-sky-700 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                                >
                                  Abrir documento <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {douNotes.length === 0 &&
                    rfNotes.length === 0 &&
                    callScriptNotes.length === 0 &&
                    emailSeqNotes.length === 0 && (
                      <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                          {deal.conversation_context ? (
                            <div className="text-left space-y-2">
                              <div className="font-semibold text-foreground">Contexto da Conversa / Inbound</div>
                              <pre className="whitespace-pre-wrap font-sans text-xs bg-muted/40 p-3 rounded-md">
                                {deal.conversation_context}
                              </pre>
                            </div>
                          ) : (
                            "Nenhuma nota automática DOU ou IA vinculada a este negócio. Consulte a aba Notas ou Campos."
                          )}
                        </CardContent>
                      </Card>
                    )}
                </TabsContent>

                {/* TAB 2: NOTAS */}
                <TabsContent value="notes" className="mt-0 space-y-4">
                  <Card>
                    <CardContent className="pt-4 space-y-2">
                      <Label className="text-xs">Adicionar Nova Observação</Label>
                      <Textarea
                        placeholder="Registre um retorno de contato, histórico de negociação ou observação..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={3}
                        className="text-xs"
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          disabled={saving || !newNote.trim()}
                          onClick={async () => {
                            await patchDeal({ action: "add_note", content: newNote });
                            setNewNote("");
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Salvar Nota
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {data.notes.map((note) => (
                    <Card key={note.id}>
                      <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between border-b border-border/60">
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="secondary" className="text-[10px]">
                            {note.note_category}
                          </Badge>
                          <span className="font-medium">{note.user_name || "Klaus"}</span>
                          {note.pinned_to_deal_flag === 1 && <Badge variant="outline">Fixada</Badge>}
                        </div>
                        <span className="text-[11px] text-muted-foreground">{formatDate(note.add_time)}</span>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div
                          className="text-xs leading-relaxed break-words [&_img]:max-w-full [&_img]:rounded-md [&_img]:border [&_img]:border-border [&_img]:my-2 [&_a]:text-sky-700 dark:[&_a]:text-sky-400 [&_a]:underline"
                          dangerouslySetInnerHTML={{ __html: note.content }}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                {/* TAB 3: ATIVIDADES */}
                <TabsContent value="activities" className="mt-0 space-y-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <Input
                          placeholder="Assunto da atividade (ex: Ligar para RH)..."
                          value={newActSubject}
                          onChange={(e) => setNewActSubject(e.target.value)}
                          className="sm:col-span-2 h-8 text-xs"
                        />
                        <Select value={newActType} onValueChange={(v) => setNewActType(v ?? "call")}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue>
                              {newActType === "call"
                                ? "Chamada"
                                : newActType === "task"
                                  ? "Tarefa"
                                  : newActType === "meeting"
                                    ? "Reunião"
                                    : "E-mail"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call">Chamada</SelectItem>
                            <SelectItem value="task">Tarefa</SelectItem>
                            <SelectItem value="meeting">Reunião</SelectItem>
                            <SelectItem value="email">E-mail</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          disabled={saving || !newActSubject.trim()}
                          onClick={async () => {
                            await patchDeal({
                              action: "add_activity",
                              subject: newActSubject,
                              type: newActType,
                              type_name: newActType === "call" ? "Chamada" : newActType === "meeting" ? "Reunião" : "Tarefa",
                            });
                            setNewActSubject("");
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Agendar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    {data.activities.length === 0 ? (
                      <div className="text-center py-8 text-xs text-muted-foreground">
                        Nenhuma atividade vinculada a este negócio.
                      </div>
                    ) : (
                      data.activities.map((act) => (
                        <div
                          key={act.id}
                          className="p-3 rounded-lg border border-border bg-card flex items-start gap-3"
                        >
                          <Checkbox
                            checked={act.done === 1}
                            onCheckedChange={() => toggleActivity(act)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-medium ${act.done === 1 ? "line-through text-muted-foreground" : ""}`}>
                              {act.subject}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-muted-foreground">
                              <Badge variant="outline" className="text-[10px]">
                                {act.type_name || act.type}
                              </Badge>
                              {act.cadence_period !== "GERAL" && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {act.cadence_period}
                                </Badge>
                              )}
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Venc.: {act.due_date || "—"} {act.due_time || ""}
                              </span>
                              <span>Resp.: {act.owner_name || "Klaus"}</span>
                            </div>
                            {act.note && (
                              <p className="text-[11px] text-muted-foreground mt-1.5 whitespace-pre-wrap">
                                {act.note}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* TAB 4: ARQUIVOS */}
                <TabsContent value="files" className="mt-0 space-y-3">
                  {data.files.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      Nenhum anexo vinculado a este negócio.
                    </div>
                  ) : (
                    data.files.map((f) => {
                      const isImg = (f.file_type || "").includes("image") || /\.(png|jpg|jpeg|webp)$/i.test(f.local_filename || f.name || "");
                      const isPdf = (f.file_type || "").includes("pdf") || /\.pdf$/i.test(f.local_filename || f.name || "");
                      return (
                        <Card key={f.id}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {isPdf ? (
                                  <FileText className="h-5 w-5 text-rose-400 shrink-0" />
                                ) : isImg ? (
                                  <ImageIcon className="h-5 w-5 text-sky-400 shrink-0" />
                                ) : (
                                  <FileSpreadsheet className="h-5 w-5 text-emerald-400 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold truncate">{f.name || f.file_name}</div>
                                  <div className="text-[11px] text-muted-foreground">
                                    ID #{f.id} • {formatBytes(f.file_size)} • {formatDate(f.add_time)}
                                  </div>
                                </div>
                              </div>
                              {f.has_local_file === 1 ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <a
                                    href={`/api/files/${f.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 text-xs" })}
                                  >
                                    Abrir
                                  </a>
                                  <a
                                    href={`/api/files/${f.id}?download=1`}
                                    className={buttonVariants({ size: "sm", variant: "secondary", className: "h-7 text-xs" })}
                                  >
                                    <Download className="h-3.5 w-3.5 mr-1" />
                                    Baixar
                                  </a>
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">
                                  Referência remota
                                </Badge>
                              )}
                            </div>
                            {f.has_local_file === 1 && isImg && (
                              <img
                                src={`/api/files/${f.id}`}
                                alt={f.name || "Anexo"}
                                className="max-h-72 rounded-md border border-border object-contain bg-black/20"
                              />
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>

                {/* TAB 5: HISTÓRICO */}
                <TabsContent value="flow" className="mt-0 space-y-2">
                  {data.flowEvents.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      Sem eventos de alteração registrados no deals_flow.json.
                    </div>
                  ) : (
                    data.flowEvents.map((ev) => (
                      <div key={ev.id} className="p-3 rounded-lg border border-border bg-card/50 flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="font-medium flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            <span>{ev.field_name}</span>
                            {ev.change_source && (
                              <Badge variant="outline" className="text-[10px]">
                                {ev.change_source}
                              </Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground">
                            De <span className="text-foreground">{ev.old_label || ev.old_value || "—"}</span> → Para{" "}
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">{ev.new_label || ev.new_value || "—"}</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">{formatDate(ev.timestamp)}</span>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* TAB 6: CAMPOS CUSTOMIZADOS & UTM */}
                <TabsContent value="fields" className="mt-0 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                      ["Serviço de Interesse", deal.service_interest],
                      ["País de Origem", deal.origin_country],
                      ["Segmento", deal.segment],
                      ["CNPJ", deal.cnpj],
                      ["Site", deal.website],
                      ["Data Reunião", deal.meeting_date],
                      ["Link Reunião", deal.meeting_link],
                      ["Lembrete Reunião", deal.meeting_reminder],
                      ["Tag de Cadência E-mail", deal.custom_email_tag],
                      ["Último Envio E-mail", deal.last_email_sent],
                      ["Formulário Preenchido", deal.form_filled],
                      ["URL do Formulário", deal.form_page_url],
                      ["utm_source", deal.utm_source],
                      ["utm_medium", deal.utm_medium],
                      ["utm_campaign", deal.utm_campaign],
                      ["utm_term", deal.utm_term],
                      ["utm_content", deal.utm_content],
                      ["gclid", deal.gclid],
                      ["IP do Lead", deal.lead_ip],
                      ["Dispositivo", deal.device_info],
                    ].map(([label, val]) => (
                      <div key={String(label)} className="p-2.5 rounded-md border border-border bg-card/40">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
                        <div className="mt-0.5 font-medium break-all">{val || "—"}</div>
                      </div>
                    ))}
                  </div>
                  {deal.conversation_context && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-xs font-semibold mb-1.5">Contexto da Conversa</div>
                        <pre className="text-xs whitespace-pre-wrap font-sans p-3 rounded-md border border-border bg-muted/30">
                          {deal.conversation_context}
                        </pre>
                      </div>
                    </>
                  )}
                </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
