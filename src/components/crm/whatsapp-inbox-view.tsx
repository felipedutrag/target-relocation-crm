"use client";

import { ArrowLeft, Bot, MessageCircle, RefreshCw, Search } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isWhatsAppAgent, WHATSAPP_AGENTS, type WhatsAppAgent } from "@/lib/whatsapp-agents";
import { WhatsAppConnectionDialog } from "./whatsapp-connection-dialog";

type Conversation = { id: string; body: string; timestamp: number };
type Message = { id: string; role: "contact" | "anderley" | "agent"; body: string; timestamp: number };
type Feed<T> = { path: string | null; items: T[]; error: string };

const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });

function contactName(id: string) {
  const [number, domain] = id.split("@");
  return domain === "lid" ? "Contato · " + number.slice(-6) : "+" + number;
}

function useFeed<T>(path: string | null, refresh: number) {
  const [feed, setFeed] = useState<Feed<T>>({ path: null, items: [], error: "" });
  useEffect(() => {
    if (!path) return;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load(url: string) {
      try {
        const response = await fetch(url, { signal: abort.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!abort.signal.aborted) setFeed({ path: url, items: data, error: "" });
      } catch (error) {
        if (!abort.signal.aborted) {
          setFeed(previous => ({ path: url, items: previous.path === url ? previous.items : [],
            error: error instanceof Error ? error.message : "Não foi possível atualizar." }));
        }
      } finally {
        if (!abort.signal.aborted) timer = setTimeout(() => void load(url), 5000);
      }
    }
    void load(path);
    return () => { abort.abort(); clearTimeout(timer); };
  }, [path, refresh]);
  return feed.path === path ? { ...feed, loading: false } : { items: [], error: "", loading: true };
}

export function WhatsAppInboxView() {
  const [agent, setAgent] = useState<WhatsAppAgent>("anderley");
  const [selection, setSelection] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [refresh, setRefresh] = useState(0);
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const feedUrl = "/api/whatsapp/conversations?agent=" + agent;
  const list = useFeed<Conversation>(feedUrl, refresh);
  const detail = useFeed<Message>(selection ? feedUrl + "&conversation=" + encodeURIComponent(selection) : null, refresh);
  const lastMessage = detail.items.at(-1)?.id;
  const search = query.trim().toLowerCase();
  const filtered = list.items.filter(item => (contactName(item.id) + " " + item.body).toLowerCase().includes(search));

  useLayoutEffect(() => {
    if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [selection, lastMessage]);

  function openConversation(id: string | null) {
    follow.current = true;
    setSelection(id);
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
      <aside className={cn("min-h-0 w-full shrink-0 flex-col border-r border-border/60 bg-muted/20 lg:flex lg:w-72",
        selection ? "hidden" : "flex")}>
        <div className="shrink-0 space-y-3 border-b border-border/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Conversas</h2>
            <Button variant="ghost" size="icon" aria-label="Atualizar conversas" onClick={() => setRefresh(value => value + 1)}>
              <RefreshCw className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Canal de WhatsApp">
            {Object.entries(WHATSAPP_AGENTS).map(([key, label]) => (
              <button key={key} type="button" aria-pressed={agent === key}
                className={cn("rounded-md px-1 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground",
                  agent === key && "bg-background text-foreground shadow-sm")}
                onClick={() => {
                  if (!isWhatsAppAgent(key) || agent === key) return;
                  setAgent(key);
                  openConversation(null);
                  setQuery("");
                }}>
                {label}
              </button>
            ))}
          </div>
          <WhatsAppConnectionDialog key={agent} agent={agent} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" aria-label="Buscar conversas" placeholder="Buscar conversas" value={query} onChange={event => setQuery(event.target.value)} />
          </div>
        </div>
        <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {list.error && <p role="alert" className="p-3 text-sm text-destructive">{list.error}</p>}
          {list.loading && <p role="status" className="p-3 text-sm text-muted-foreground">Carregando conversas…</p>}
          {!list.loading && !list.error && !filtered.length && (
            <p className="p-3 text-sm text-muted-foreground">{search ? "Nenhuma conversa encontrada." : "Nenhuma conversa registrada."}</p>
          )}
          {filtered.map(item => (
            <button key={item.id} type="button" aria-pressed={selection === item.id} onClick={() => openConversation(item.id)}
              className={cn("block w-full rounded-lg px-3 py-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                selection === item.id && "bg-muted")}>
              <span className="flex items-center justify-between gap-2 text-sm font-medium">
                <span className="truncate">{contactName(item.id)}</span>
                <time className="shrink-0 text-[11px] font-normal text-muted-foreground">{time.format(item.timestamp)}</time>
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.body}</span>
            </button>
          ))}
        </div>
      </aside>
      <section className={cn("min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex", selection ? "flex" : "hidden")}>
        {selection ? (
          <>
            <header className="flex min-w-0 shrink-0 items-center gap-3 border-b border-border/60 px-4 py-3 lg:px-6">
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Voltar às conversas" onClick={() => openConversation(null)}>
                <ArrowLeft className="size-4" />
              </Button>
              <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
              <h2 className="truncate text-sm font-semibold">{contactName(selection)}</h2>
            </header>
            <div ref={scroll} className="chat-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 lg:px-10"
              onScroll={event => {
                const area = event.currentTarget;
                follow.current = area.scrollHeight - area.clientHeight - area.scrollTop < 96;
              }}>
              <div className="mx-auto max-w-3xl space-y-5">
                {detail.error && <p role="alert" className="text-sm text-destructive">{detail.error}</p>}
                {detail.loading && <p role="status" className="text-sm text-muted-foreground">Carregando histórico…</p>}
                {!detail.loading && !detail.error && !detail.items.length && <p className="text-sm text-muted-foreground">Nenhuma mensagem no histórico.</p>}
                {detail.items.map((message, index) => {
                  const fromAgent = message.role !== "contact";
                  const day = date.format(message.timestamp);
                  const previous = detail.items[index - 1];
                  return (
                    <div key={message.id}>
                      {(!previous || date.format(previous.timestamp) !== day) && (
                        <div className="mb-5 text-center text-xs text-muted-foreground">{day}</div>
                      )}
                      <div className={cn("flex items-start gap-2", !fromAgent && "justify-end")}>
                        {fromAgent && <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted"><Bot className="size-4" /></span>}
                        <div className={cn("min-w-0 max-w-[85%] rounded-2xl px-3.5 py-2.5", fromAgent ? "border border-border/60" : "bg-muted")}>
                          {fromAgent && <p className="mb-1 text-xs font-semibold">{WHATSAPP_AGENTS[agent]}</p>}
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
                          <time className="mt-1 block text-right text-[11px] text-muted-foreground">{time.format(message.timestamp)}</time>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-6 text-center text-sm text-muted-foreground">
            Selecione uma conversa para ver o histórico.
          </div>
        )}
      </section>
    </div>
  );
}
