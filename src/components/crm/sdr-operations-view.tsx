"use client";

import { useCrmFetch, useCrmRead } from "@/lib/crm-cache";

import { useCallback, useEffect, useState } from "react";
import {
  Award,
  CalendarClock,
  CheckCircle2,
  Eye,
  Loader2,
  Mic,
  PhoneCall,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface SdrDailyLog {
  id: number;
  log_date: string;
  sdr_name: string;
  calls_made: number;
  conversations: number;
  meetings_booked: number;
  linkedin_invites: number;
  linkedin_comments: number;
  emails_sent: number;
  profile_views_processed: number;
  notes: string | null;
}

interface CallAudit {
  id: number;
  sdr_name: string;
  lead_company: string | null;
  transcript_or_notes: string;
  score: number;
  strengths: string | null;
  improvements: string | null;
  recommended_next_step: string | null;
  objections_detected_json: string[];
  created_at: string;
}

interface WeeklyMeeting {
  id: number;
  meeting_date: string;
  participants: string;
  meetings_count_week: number;
  leads_by_origin_json: Record<string, number>;
  blockers: string | null;
  decisions: string | null;
  calendar_approved: boolean;
  ai_summary: string | null;
}

const ROUTINE_SCHEDULE = [
  { time: "09:00 – 09:30", task: "Abrir CRM: tarefas do dia, leads novos da Sara (Ads), site e visitas ao perfil do Klaus" },
  { time: "09:30 – 11:30", task: "Bloco de ligações 1 (Meta diária total: 40 ligações + 8 conversas/SDR)" },
  { time: "11:30 – 12:00", task: "LinkedIn manual: convites com nota + 10 min comentários com conteúdo nas contas do ICP (ZERO automação)" },
  { time: "14:00 – 16:00", task: "Bloco de ligações 2 e follow-ups" },
  { time: "16:00 – 17:00", task: "E-mails, preparação do dia seguinte e registro obrigatório 100% no CRM no mesmo dia" },
];

const LEAD_ROUTING = [
  { source: "Contas do ICP (109 multinacionais)", prep: "Claude e Boost (enriquecimento)", owner: "Áurea Azevedo" },
  { source: "DOU (Diário Oficial da União)", prep: "Otávio (Boost)", owner: "Áurea Azevedo" },
  { source: "Interação com LinkedIn Ads ABM", prep: "Boost", owner: "Áurea Azevedo" },
  { source: "Google Ads, site e WhatsApp que não agendaram", prep: "Sara (Boost • < 5 min)", owner: "Anderley Nino" },
  { source: "Quem viu o perfil do Klaus (LinkedIn Premium)", prep: "Klaus", owner: "Anderley Nino" },
  { source: "Portais de fornecedor e escolas internacionais", prep: "Anderley", owner: "Anderley Nino" },
];

export function SdrOperationsView({
  onOpenDeal,
  onOpenAiSettings,
}: {
  onOpenDeal: (dealId: number) => void;
  onOpenAiSettings: () => void;
}) {
  const crmFetch = useCrmFetch();
  const readCrm = useCrmRead();
  const [today, setToday] = useState("");
  const [logs, setLogs] = useState<SdrDailyLog[]>([]);
  const [audits, setAudits] = useState<CallAudit[]>([]);
  const [meetings, setMeetings] = useState<WeeklyMeeting[]>([]);
  const [douQueue, setDouQueue] = useState<Array<Record<string, unknown>>>([]);
  const [inboundQueue, setInboundQueue] = useState<Array<Record<string, unknown>>>([]);
  const [banner, setBanner] = useState<string | null>(null);

  // Profile view capture (Klaus Premium -> Anderley)
  const [visitorName, setVisitorName] = useState("");
  const [visitorCompany, setVisitorCompany] = useState("");
  const [visitorTitle, setVisitorTitle] = useState("RH / Global Mobility");
  const [capturing, setCapturing] = useState(false);

  // Call Auditor
  const [auditSdr, setAuditSdr] = useState("Aurea Azevedo");
  const [auditCompany, setAuditCompany] = useState("");
  const [auditTranscript, setAuditTranscript] = useState("");
  const [auditing, setAuditing] = useState(false);

  // Weekly meeting
  const [meetWeekCount, setMeetWeekCount] = useState("4");
  const [meetBlockers, setMeetBlockers] = useState("");
  const [meetDecisions, setMeetDecisions] = useState("");
  const [savingMeet, setSavingMeet] = useState(false);

  const loadData = useCallback(async () => {
    await readCrm("/api/sdr", json => {
      setToday(json.today || new Date().toISOString().slice(0, 10));
      setLogs(json.logs || []);
      setAudits(json.audits || []);
      setMeetings(json.meetings || []);
      setDouQueue(json.douQueue || []);
      setInboundQueue(json.inboundQueue || []);
    });
  }, [readCrm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function incrementScore(sdrName: string, field: string, delta = 1) {
    await crmFetch("/api/sdr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "increment_log", log_date: today, sdr_name: sdrName, field, delta }),
    });
    await loadData();
  }

  async function captureProfileView(e: React.FormEvent) {
    e.preventDefault();
    if (!visitorName.trim() || !visitorCompany.trim()) return;
    setCapturing(true);
    setBanner(null);
    try {
      const res = await crmFetch("/api/sdr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "capture_profile_view",
          visitor_name: visitorName.trim(),
          company: visitorCompany.trim(),
          job_title: visitorTitle.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setBanner(
        `Visita ao perfil do Klaus capturada! Tarefa #${json.activity?.id} atribuída ao Anderley Nino (${json.orgMatched ? "empresa localizada no ICP CRM" : "empresa registrada"}).`
      );
      setVisitorName("");
      setVisitorCompany("");
      await loadData();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Erro ao capturar visita");
    } finally {
      setCapturing(false);
    }
  }

  async function runCallAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!auditTranscript.trim()) return;
    setAuditing(true);
    setBanner(null);
    try {
      const res = await crmFetch("/api/sdr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "audit_call",
          sdr_name: auditSdr,
          lead_company: auditCompany.trim(),
          transcript_or_notes: auditTranscript.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.aiRequired) onOpenAiSettings();
        setBanner(json.error || "Erro na auditoria");
        return;
      }
      setBanner(`Auditoria IA concluída: Score ${json.audit?.score}/100 para ${auditSdr}.`);
      setAuditCompany("");
      setAuditTranscript("");
      await loadData();
    } finally {
      setAuditing(false);
    }
  }

  async function createWeeklyMeeting(e: React.FormEvent) {
    e.preventDefault();
    setSavingMeet(true);
    try {
      await crmFetch("/api/sdr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_meeting",
          meetings_count_week: Number(meetWeekCount || 0),
          blockers: meetBlockers.trim(),
          decisions: meetDecisions.trim(),
          calendar_approved: true,
        }),
      });
      setMeetBlockers("");
      setMeetDecisions("");
      setBanner("Ata da Reunião Semanal (Seg 9h) salva com resumo IA no Supabase!");
      await loadData();
    } finally {
      setSavingMeet(false);
    }
  }

  const getTodayLog = (name: string): SdrDailyLog =>
    logs.find((l) => l.log_date === today && l.sdr_name === name) || {
      id: 0,
      log_date: today,
      sdr_name: name,
      calls_made: 0,
      conversations: 0,
      meetings_booked: 0,
      linkedin_invites: 0,
      linkedin_comments: 0,
      emails_sent: 0,
      profile_views_processed: 0,
      notes: null,
    };

  const aureaLog = getTodayLog("Aurea Azevedo");
  const anderleyLog = getTodayLog("Anderley Nino");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <PhoneCall className="size-6 text-primary" />
            Placar Diário, Rotina SDR & Auditor de Ligações IA
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Divisão por origem (1 dono por lead) • Meta sugerida: 40 ligações e 8 conversas/dia por SDR • Reunião Semanal Seg 9h
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          Data Ativa: {today || "..."}
        </Badge>
      </div>

      {banner && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {banner}
        </div>
      )}

      {/* Placar Diário Áurea vs Anderley */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          {
            name: "Aurea Azevedo",
            role: "SDR Outbound • Contas ICP (109) + Lista DOU + LinkedIn Ads",
            log: aureaLog,
          },
          {
            name: "Anderley Nino",
            role: "SDR Inbound • Google Ads + Site/WA + Perfil Klaus + Portais/Escolas",
            log: anderleyLog,
          },
        ].map((sdr) => {
          const callsPct = Math.min(100, Math.round((sdr.log.calls_made / 40) * 100));
          const convPct = Math.min(100, Math.round((sdr.log.conversations / 8) * 100));
          return (
            <Card key={sdr.name}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{sdr.name}</CardTitle>
                    <CardDescription className="text-xs">{sdr.role}</CardDescription>
                  </div>
                  <Badge className="bg-emerald-600 text-white font-mono">
                    {sdr.log.meetings_booked} reuniões hoje
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Ligações Hoje (Meta: 40)</span>
                    <span className="font-mono font-semibold">{sdr.log.calls_made} / 40 ({callsPct}%)</span>
                  </div>
                  <Progress value={callsPct} className="h-2" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Conversas Úteis (Meta: 8)</span>
                    <span className="font-mono font-semibold">{sdr.log.conversations} / 8 ({convPct}%)</span>
                  </div>
                  <Progress value={convPct} className="h-2" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <Button size="sm" variant="outline" className="h-8 text-xs justify-between" onClick={() => incrementScore(sdr.name, "calls_made")}>
                    <span>+1 Ligação</span>
                    <Plus className="size-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs justify-between" onClick={() => incrementScore(sdr.name, "conversations")}>
                    <span>+1 Conversa</span>
                    <Plus className="size-3" />
                  </Button>
                  <Button size="sm" variant="secondary" className="h-8 text-xs justify-between" onClick={() => incrementScore(sdr.name, "meetings_booked")}>
                    <span>+1 Reunião</span>
                    <Award className="size-3 text-emerald-500" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs justify-between border border-border" onClick={() => incrementScore(sdr.name, "linkedin_invites")}>
                    <span>+1 Convite LI</span>
                    <span className="font-mono text-[10px]">{sdr.log.linkedin_invites}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="ops" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ops">Rotina, Perfil Klaus & Filas</TabsTrigger>
          <TabsTrigger value="auditor">Auditor de Ligações IA ({audits.length})</TabsTrigger>
          <TabsTrigger value="weekly">Reunião Semanal 30 min (Seg 9h)</TabsTrigger>
        </TabsList>

        <TabsContent value="ops" className="space-y-4">
          {/* Quick capture "Quem viu o perfil do Klaus" */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="size-4 text-amber-500" />
                LinkedIn Premium: Captura Matinal &ldquo;Quem Viu o Perfil do Klaus&rdquo; → Tarefa Anderley
              </CardTitle>
              <CardDescription className="text-xs">
                Regra do Plano: toda manhã às 09h, visitantes vindos de empresas do ICP viram tarefa imediata no CRM para o Anderley Nino (sem robô de LinkedIn).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={captureProfileView} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <Input
                  placeholder="Nome do visitante (ex: Ana Souza)"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Empresa (ex: Michelin Brasil)"
                  value={visitorCompany}
                  onChange={(e) => setVisitorCompany(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Cargo (ex: Gerente Global Mobility)"
                  value={visitorTitle}
                  onChange={(e) => setVisitorTitle(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button size="sm" type="submit" disabled={capturing || !visitorName.trim() || !visitorCompany.trim()} className="h-8 text-xs">
                  {capturing ? "Criando..." : "Criar Tarefa Anderley"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Rotina Diária */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarClock className="size-4 text-primary" />
                  Agenda Fixa dos SDRs (Ligação é o trabalho principal)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {ROUTINE_SCHEDULE.map((r) => (
                  <div key={r.time} className="flex items-start gap-3 p-2.5 rounded-lg border border-border/70 bg-muted/20">
                    <Badge variant="outline" className="font-mono text-[10px] shrink-0">{r.time}</Badge>
                    <span>{r.task}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Matriz Origem x Dono */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  De Onde Vem Cada Lead (1 Dono Só • Zero Duplicidade)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {LEAD_ROUTING.map((r) => (
                  <div key={r.source} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border/70 bg-muted/20">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.source}</div>
                      <div className="text-[11px] text-muted-foreground">Prepara: {r.prep}</div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">{r.owner}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Filas ao Vivo do Supabase */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Fila Prioritária Áurea (DOU & Score Alto em Aberto)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs">
                {douQueue.slice(0, 6).map((d) => (
                  <div
                    key={String(d.id)}
                    onClick={() => onOpenDeal(Number(d.id))}
                    className="p-2 rounded-lg border border-border/60 hover:bg-accent/50 cursor-pointer flex items-center justify-between gap-2"
                  >
                    <span className="truncate font-medium">{String(d.org_name || d.title)}</span>
                    <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                      Score {String(d.score ?? "—")}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Fila Prioritária Anderley (Inbound Recente em Aberto)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs">
                {inboundQueue.slice(0, 6).map((d) => (
                  <div
                    key={String(d.id)}
                    onClick={() => onOpenDeal(Number(d.id))}
                    className="p-2 rounded-lg border border-border/60 hover:bg-accent/50 cursor-pointer flex items-center justify-between gap-2"
                  >
                    <span className="truncate font-medium">{String(d.title)}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{String(d.stage_name)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="auditor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Mic className="size-4 text-amber-500" />
                Auditor de Ligações IA (Feedback OpenAI • Objetivo: Agendar Reunião com RH)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={runCallAudit} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">SDR</Label>
                    <Select value={auditSdr} onValueChange={(v) => setAuditSdr(v || "Aurea Azevedo")}>
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue>{auditSdr}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aurea Azevedo">Áurea Azevedo (Outbound)</SelectItem>
                        <SelectItem value="Anderley Nino">Anderley Nino (Inbound)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Empresa / Lead Contatado</Label>
                    <Input
                      value={auditCompany}
                      onChange={(e) => setAuditCompany(e.target.value)}
                      placeholder="Ex: JSL S.A — DOU RN 02"
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Transcrição ou Notas da Ligação *</Label>
                  <Textarea
                    rows={4}
                    value={auditTranscript}
                    onChange={(e) => setAuditTranscript(e.target.value)}
                    placeholder="Cole a transcrição da chamada ou resumo detalhado de como foi a abordagem e resposta do RH..."
                    className="mt-1 text-xs"
                  />
                </div>
                <Button size="sm" type="submit" disabled={auditing || !auditTranscript.trim()} className="gap-1.5 text-xs">
                  {auditing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5 text-amber-500" />}
                  {auditing ? "Auditando com OpenAI..." : "Auditar Ligação com IA"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-3">
            {audits.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">
                      {a.sdr_name} {a.lead_company ? `• ${a.lead_company}` : ""}
                    </div>
                    <Badge variant={a.score >= 75 ? "default" : "outline"} className="font-mono">
                      Score {a.score}/100
                    </Badge>
                  </div>
                  {a.strengths && <div><strong className="text-emerald-700 dark:text-emerald-400">Pontos fortes:</strong> {a.strengths}</div>}
                  {a.improvements && <div><strong className="text-amber-700 dark:text-amber-400">Ajustes recomendados:</strong> {a.improvements}</div>}
                  {a.recommended_next_step && (
                    <div className="p-2 rounded bg-muted/40"><strong>Próximo passo CRM:</strong> {a.recommended_next_step}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                Reunião Semanal de 30 Minutos (Segunda-feira, 09:00)
              </CardTitle>
              <CardDescription className="text-xs">
                Pauta fixa: (1) Reuniões qualificadas da semana • (2) Leads por origem • (3) O que travou • (4) Calendário da semana.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createWeeklyMeeting} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Reuniões Qualificadas na Semana</Label>
                    <Input type="number" value={meetWeekCount} onChange={(e) => setMeetWeekCount(e.target.value)} className="mt-1 h-8 text-xs" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Principais Travas Identificadas</Label>
                    <Input value={meetBlockers} onChange={(e) => setMeetBlockers(e.target.value)} placeholder="Ex: Taxa de atendimento manhã ou termos Ads..." className="mt-1 h-8 text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Decisões & Ajustes da Semana</Label>
                  <Textarea rows={2} value={meetDecisions} onChange={(e) => setMeetDecisions(e.target.value)} className="mt-1 text-xs" />
                </div>
                <Button size="sm" type="submit" disabled={savingMeet} className="text-xs">
                  {savingMeet ? "Salvando Ata..." : "Registrar Ata Semanal (+ Síntese IA)"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {meetings.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">Segunda {m.meeting_date} • {m.participants}</span>
                    <Badge className="bg-emerald-600 text-white font-mono">{m.meetings_count_week} reuniões</Badge>
                  </div>
                  {m.ai_summary && <p className="text-muted-foreground">{m.ai_summary}</p>}
                  {m.blockers && <div><strong>Travas:</strong> {m.blockers}</div>}
                  {m.decisions && <div><strong>Decisões:</strong> {m.decisions}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
