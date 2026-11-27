"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft, ArrowUpRight, Bot, CalendarDays, CheckCheck, ChevronRight, CircleHelp,
  Inbox, MessageCircle, PanelRight, RotateCcw, Search, Send, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { accountInitials } from "@/lib/account-profile";
import { cn } from "@/lib/utils";
import { DEMO_AGENTS, DEMO_CONVERSATIONS, type DemoAgent, type DemoMessage, type DemoStage } from "./whatsapp-demo-data";

const stageStyles: Record<DemoStage, string> = {
  "Em atendimento": "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  "Qualificado": "bg-teal-500/10 text-teal-800 dark:text-teal-300",
  "Encaminhado": "bg-violet-500/10 text-violet-800 dark:text-violet-300",
  "Reunião marcada": "bg-blue-500/10 text-blue-800 dark:text-blue-300",
};
const agentKeys = Object.keys(DEMO_AGENTS) as DemoAgent[];
const clock = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const normalize = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function WhatsAppDemoView() {
  const [agent, setAgent] = useState<DemoAgent>("sara");
  const [selected, select] = useState<Record<DemoAgent, string>>({ sara: "marina", anderley: "helena" });
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  const [threads, setThreads] = useState<Record<string, DemoMessage[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [mobileChat, setMobileChat] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const timers = useRef<Record<string, number>>({});
  const timeline = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const agentInfo = DEMO_AGENTS[agent];
  const active = DEMO_CONVERSATIONS.find(item => item.id === selected[agent] && item.agent === agent);
  const messages = active ? threads[active.id] ?? active.messages : undefined;
  const draft = active ? drafts[active.id] ?? "" : "";
  const unread = (id: string, count: number) => read.includes(id) ? 0 : count;
  const directory = DEMO_CONVERSATIONS.filter(item => item.agent === agent);
  const filtered = directory.filter(item => {
    const text = normalize(`${item.name} ${item.organization} ${item.subject} ${item.stage}`);
    return text.includes(normalize(query.trim())) && (!unreadOnly || unread(item.id, item.unread) > 0);
  });

  useEffect(() => {
    const outstanding = timers.current;
    return () => Object.values(outstanding).forEach(window.clearTimeout);
  }, []);

  useEffect(() => {
    if (timeline.current) timeline.current.scrollTop = timeline.current.scrollHeight;
  }, [messages, pending, mobileChat]);

  function chooseAgent(next: DemoAgent) {
    setAgent(next);
    setQuery("");
    setUnreadOnly(false);
    setMobileChat(false);
    setShowDetails(false);
  }

  function openConversation(id: string) {
    select(previous => ({ ...previous, [agent]: id }));
    setRead(previous => previous.includes(id) ? previous : [...previous, id]);
    setMobileChat(true);
    setShowDetails(false);
  }

  function send(text: string) {
    if (!active || !text.trim() || pending[active.id]) return;
    const { id, messages: original, response, suggestion, nextStep } = active;
    const time = clock.format(new Date());
    const message: DemoMessage = { id: crypto.randomUUID(), from: "contact", text: text.trim(), time };
    setThreads(previous => ({ ...previous, [id]: [...(previous[id] ?? original), message] }));
    setDrafts(previous => ({ ...previous, [id]: "" }));
    setRead(previous => previous.includes(id) ? previous : [...previous, id]);
    setPending(previous => ({ ...previous, [id]: true }));
    timers.current[id] = window.setTimeout(() => {
      const reply: DemoMessage = {
        id: crypto.randomUUID(),
        from: "agent",
        text: normalize(text.trim()) === normalize(suggestion)
          ? response
          : `Entendi. Para este cenário, o próximo passo é: ${nextStep.charAt(0).toLowerCase()}${nextStep.slice(1)} Se quiser ver o roteiro completo, use a mensagem sugerida abaixo.`,
        time: clock.format(new Date()),
      };
      setThreads(previous => ({ ...previous, [id]: [...(previous[id] ?? original), reply] }));
      setPending(previous => ({ ...previous, [id]: false }));
      delete timers.current[id];
    }, 850);
  }

  function resetConversation() {
    if (!active) return;
    const id = active.id;
    window.clearTimeout(timers.current[id]);
    delete timers.current[id];
    setThreads(previous => ({ ...previous, [id]: active.messages }));
    setDrafts(previous => ({ ...previous, [id]: "" }));
    setPending(previous => ({ ...previous, [id]: false }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(draft);
  }

  return (
    <section className="mx-auto max-w-[1600px] space-y-4 pb-5">
      <header className="relative isolate overflow-hidden rounded-2xl bg-[#102c30] px-5 py-5 text-white sm:px-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-32 -z-10 size-96 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-teal-200"><MessageCircle className="size-5" /></div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Atendimento via WhatsApp</h1>
              <p className="mt-0.5 text-sm text-teal-100/75">Explore conversas de qualificação e continuidade da Target.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-100/20 bg-teal-100/10 px-3 py-1 text-xs text-teal-50"><Sparkles className="size-3" /> Demonstração · dados fictícios</span>
        </div>
      </header>

      <div className="grid min-h-[570px] overflow-hidden rounded-2xl border bg-card md:h-[clamp(590px,calc(100dvh-245px),800px)] md:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[290px_minmax(0,1fr)_270px]">
        <aside className={cn("min-w-0 flex-col border-border md:flex md:border-r", mobileChat ? "hidden" : "flex")} aria-label="Caixa de entrada">
          <div className="space-y-3 border-b p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Inbox className="size-4 text-muted-foreground" /> Caixa de entrada</h2>
              <span className="text-xs text-muted-foreground">{directory.length} conversas</span>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" aria-label="Agentes">
              {agentKeys.map(key => (
                <button key={key} type="button" aria-pressed={agent === key} onClick={() => chooseAgent(key)}
                  className={cn("rounded-md px-2 py-1.5 text-xs font-medium transition-colors", agent === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {DEMO_AGENTS[key].name}
                </button>
              ))}
            </div>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Buscar conversas" placeholder="Buscar conversas…" className="h-8 pl-8 text-xs" value={query} onChange={event => setQuery(event.target.value)} />
            </label>
            <Button size="sm" variant={unreadOnly ? "secondary" : "ghost"} className="h-7 px-2 text-xs" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(!unreadOnly)}>
              Não lidas · {directory.reduce((sum, item) => sum + unread(item.id, item.unread), 0)}
            </Button>
          </div>
          <nav className="min-h-0 flex-1 space-y-1 overflow-auto p-2" aria-label={`Conversas de ${agentInfo.name}`}>
            {filtered.map(item => {
              const last = (threads[item.id] ?? item.messages).at(-1);
              const count = unread(item.id, item.unread);
              return (
                <button key={item.id} type="button" aria-current={item.id === active?.id}
                  onClick={() => openConversation(item.id)}
                  className={cn("flex w-full min-w-0 items-start gap-2.5 rounded-xl p-2.5 text-left transition-colors hover:bg-muted", item.id === active?.id && "bg-teal-500/10 ring-1 ring-inset ring-teal-500/20")}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold">{accountInitials(item.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <strong className="truncate text-sm font-medium">{item.name}</strong>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{last?.time}</span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{item.organization}</span>
                    <span className="mt-1 flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">{pending[item.id] ? `${agentInfo.name} está digitando…` : last?.text}</span>
                      {count > 0 && <span aria-label={`${count} não lidas`} className="grid min-w-4 shrink-0 place-items-center rounded-full bg-teal-700 px-1 text-[10px] text-white">{count}</span>}
                    </span>
                  </span>
                </button>
              );
            })}
            {!filtered.length && <p className="p-3 text-sm text-muted-foreground">Nenhuma conversa neste filtro.</p>}
          </nav>
          <div className="flex items-center gap-2 border-t px-4 py-3">
            <span className="grid size-7 place-items-center rounded-lg bg-teal-500/12 text-xs font-semibold text-teal-800 dark:text-teal-300">{agentInfo.initials}</span>
            <div className="min-w-0"><p className="text-xs font-semibold">{agentInfo.name}</p><p className="truncate text-[11px] text-muted-foreground">{agentInfo.role}</p></div>
          </div>
        </aside>

        {active && (
          <article className={cn("relative min-h-0 min-w-0 flex-col md:flex", mobileChat ? "flex min-h-[530px]" : "hidden")} aria-label={`Conversa com ${active.name}`}>
            <header className="flex items-center gap-2 border-b bg-card p-3 sm:gap-3 sm:px-4">
              <Button type="button" variant="ghost" size="icon" className="size-8 md:hidden" aria-label="Voltar para conversas" onClick={() => setMobileChat(false)}><ArrowLeft className="size-4" /></Button>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-teal-500/12 text-xs font-semibold text-teal-800 dark:text-teal-200">{accountInitials(active.name)}</span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold">{active.name}</h2>
                <p className="truncate text-xs text-muted-foreground">{active.organization} · {active.subject}</p>
              </div>
              <Button type="button" size="icon" variant="ghost" className="size-8 2xl:hidden" aria-label="Detalhes da conversa" aria-expanded={showDetails} onClick={() => setShowDetails(!showDetails)}><PanelRight className="size-4" /></Button>
              <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Reiniciar este cenário" title="Reiniciar este cenário" onClick={resetConversation}><RotateCcw className="size-4" /></Button>
            </header>

            <div ref={timeline} className="min-h-0 flex-1 space-y-4 overflow-auto bg-muted/35 px-3 py-4 sm:px-5" role="log" aria-label="Histórico de mensagens">
              <div className="mx-auto flex w-fit items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground"><CalendarDays className="size-3" /> {active.date}</div>
              {messages?.map(message => (
                <div key={message.id} className={cn("flex gap-2", message.from === "agent" && "justify-end")}>
                  {message.from === "contact" && <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-lg bg-muted text-[9px] font-semibold">{accountInitials(active.name)}</span>}
                  <div className={cn("max-w-[86%] rounded-xl border px-3 py-2.5 sm:max-w-[76%]",
                    message.from === "agent" ? "rounded-tr-sm border-teal-500/20 bg-teal-500/10" : "rounded-tl-sm bg-card")}>
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold">
                      {message.from === "agent" && <Bot className="size-3 text-teal-700 dark:text-teal-300" />}
                      {message.from === "agent" ? agentInfo.name : active.name}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] tabular-nums text-muted-foreground">
                      {message.time}{message.from === "agent" && <CheckCheck className="size-3 text-teal-700 dark:text-teal-300" />}
                    </div>
                  </div>
                </div>
              ))}
              {pending[active.id] && <p className="text-right text-xs text-muted-foreground">{agentInfo.name} está digitando…</p>}
            </div>

            <footer className="space-y-2 border-t bg-card p-3 sm:px-4">
              <button type="button" onClick={() => { setDrafts(previous => ({ ...previous, [active.id]: active.suggestion })); input.current?.focus(); }}
                className="flex max-w-full items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted">
                <Sparkles className="size-3 shrink-0" /><span className="truncate">{active.suggestion}</span><ChevronRight className="size-3 shrink-0" />
              </button>
              <form onSubmit={submit} className="flex items-center gap-2">
                <Input ref={input} aria-label="Mensagem de demonstração" placeholder="Escreva como se fosse o contato…" maxLength={600}
                  value={draft} onChange={event => setDrafts(previous => ({ ...previous, [active.id]: event.target.value }))} />
                <Button type="submit" size="icon" aria-label="Enviar na simulação" title="Enviar na simulação" disabled={!draft.trim() || pending[active.id]}>
                  <Send className="size-4" />
                </Button>
              </form>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><CircleHelp className="size-3" /> Respostas roteirizadas. Nenhuma mensagem é enviada ao WhatsApp.</p>
            </footer>

            {showDetails && <div className="absolute inset-x-0 top-[60px] z-10 max-h-[70%] overflow-auto border-b bg-card shadow-xl 2xl:hidden"><ConversationDetails key={active.id} conversation={active} /></div>}
          </article>
        )}

        {active && <aside className="hidden overflow-auto border-l 2xl:block"><ConversationDetails conversation={active} /></aside>}
      </div>
    </section>
  );
}

function ConversationDetails({ conversation }: { conversation: (typeof DEMO_CONVERSATIONS)[number] }) {
  return (
    <div className="space-y-5 p-4">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Detalhes da conversa</h2>
        <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", stageStyles[conversation.stage])}>{conversation.stage}</span>
      </section>
      <dl className="grid gap-3 border-t pt-4">
        <div className="space-y-0.5"><dt className="text-xs text-muted-foreground">Origem</dt><dd className="text-sm">{conversation.origin}</dd></div>
        <div className="space-y-0.5"><dt className="text-xs text-muted-foreground">Agente</dt><dd className="text-sm">{DEMO_AGENTS[conversation.agent].name}</dd></div>
        {conversation.context.map(([label, value]) => (
          <div key={label} className="space-y-0.5"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm">{value}</dd></div>
        ))}
      </dl>
      <section className="space-y-1.5 rounded-xl border border-teal-500/20 bg-teal-500/8 p-3">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold"><ArrowUpRight className="size-3.5" /> Próximo passo</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">{conversation.nextStep}</p>
      </section>
    </div>
  );
}
