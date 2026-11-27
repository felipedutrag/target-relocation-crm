"use client";

import { useCrmFetch, useCrmRead } from "@/lib/crm-cache";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  History,
  KeyRound,
  Loader2,
  MessageSquare,
  Plus,
  Radio,
  SlidersHorizontal,
  TrendingUp,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

interface ToolCallBadge {
  name: string;
  args: Record<string, unknown>;
  resultSummary: string;
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  tool_calls_json?: ToolCallBadge[];
  created_at: string;
}

const PROMPT_SUGGESTIONS = [
  {
    short: "Briefing do dia & Plano 30d",
    prompt: "Faça um briefing executivo de hoje: negócios no CRM, Radar DOU, placar SDR e etapas do plano de 30 dias.",
    icon: TrendingUp,
  },
  {
    short: "Top 5 Radar DOU para Áurea",
    prompt: "Busque os 5 leads do Radar DOU com maior score em aberto para a Áurea ligar hoje.",
    icon: Radio,
  },
  {
    short: "Criar pauta News MTE",
    prompt: "Crie uma pauta News sobre exigência no MTE na quinta-feira para revisão e aprovação do Klaus.",
    icon: FileText,
  },
  {
    short: "Negativar termo no Google Ads",
    prompt: "Adicione a palavra-chave negativa 'visto H2B agrícola' nas campanhas do Google Ads.",
    icon: SlidersHorizontal,
  },
];

function renderInlineSpans(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} className="rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-[11.5px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

/** Renders structured Markdown blocks (headings, bullet/numbered lists, bold, inline code) inside chat responses. */
function renderChatMarkdown(text: string) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2 break-words">
      {lines.map((rawLine, idx) => {
        const trimmed = rawLine.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="pt-1 text-[13px] font-semibold tracking-tight">
              {renderInlineSpans(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
          const clean = trimmed.replace(/^#{1,3}\s+/, "");
          return (
            <h3 key={idx} className="pt-2 text-sm font-semibold tracking-tight">
              {renderInlineSpans(clean)}
            </h3>
          );
        }
        const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-55" />
              <div className="min-w-0 flex-1">{renderInlineSpans(bulletMatch[1])}</div>
            </div>
          );
        }
        const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1">
              <span className="shrink-0 font-mono text-[11.5px] font-semibold opacity-70">
                {numMatch[1]}.
              </span>
              <div className="min-w-0 flex-1">{renderInlineSpans(numMatch[2])}</div>
            </div>
          );
        }
        return <p key={idx}>{renderInlineSpans(trimmed)}</p>;
      })}
    </div>
  );
}

function formatCompactSessionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AiChatView({ onOpenAiSettings }: { onOpenAiSettings: () => void }) {
  const crmFetch = useCrmFetch();
  const readCrm = useCrmRead();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [aiModel, setAiModel] = useState("gpt-4o-mini");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<number | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const loadChat = useCallback(async (sessionId?: string | null) => {
    setLoading(true);
    try {
      const qs = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
      await readCrm(`/api/ai/chat${qs}`, json => {
        setSessions(json.sessions || []);
        setActiveSessionId(json.activeSessionId || null);
        setMessages(json.messages || []);
        setAiConfigured(Boolean(json.aiConfigured));
        if (json.aiModel) setAiModel(json.aiModel);
      });
    } finally {
      setLoading(false);
    }
  }, [readCrm]);

  useEffect(() => {
    loadChat();
  }, [loadChat]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      scrollToBottom(messages.length <= 2 ? "auto" : "smooth");
    });
    return () => cancelAnimationFrame(id);
  }, [messages.length, sending, scrollToBottom]);

  // Keep composer textarea height fluid without breaking layout
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    const next = Math.min(Math.max(ta.scrollHeight, 44), 180);
    ta.style.height = `${next}px`;
  }, [input]);

  function handleMessagesScroll() {
    const el = messagesScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distanceFromBottom > 120);
  }

  async function createNewSession() {
    const res = await crmFetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "new_session" }),
    });
    const json = await res.json();
    if (json.session?.id) {
      await loadChat(json.session.id);
      setMobileSessionsOpen(false);
    }
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    if (!text) setInput("");
    setSending(true);

    const tempUser: ChatMessage = {
      id: Date.now(),
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUser]);

    try {
      const res = await crmFetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: activeSessionId, message: content }),
      });
      const json = await res.json();
      if (json.session_id) {
        await loadChat(json.session_id);
      } else if (json.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "assistant",
            content: `Erro: ${json.error}`,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setSending(false);
    }
  }

  function handleCopyMessage(msg: ChatMessage) {
    navigator.clipboard.writeText(msg.content);
    setCopiedMsgId(msg.id);
    setTimeout(() => setCopiedMsgId(null), 1800);
  }

  const SessionsList = (
    <>
      <div className="shrink-0 flex items-center justify-between px-3.5 py-3">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
          Conversas ({sessions.length})
        </span>
        <button
          type="button"
          onClick={() => setMobileSessionsOpen(false)}
          className="rounded-lg p-1 text-muted-foreground hover:bg-accent lg:hidden"
          aria-label="Fechar sessões"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="chat-scrollbar flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 pb-3 space-y-0.5">
        {sessions.map((s) => {
          const active = activeSessionId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                loadChat(s.id);
                setMobileSessionsOpen(false);
              }}
              className={`group flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                active
                  ? "bg-accent/90 text-foreground font-medium shadow-2xs"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <MessageSquare className="size-3.5 shrink-0 mt-0.5 opacity-60" />
              <div className="min-w-0 flex-1">
                <div className="truncate leading-snug">{s.title}</div>
                <div className="mt-0.5 font-mono text-[10px] opacity-60">
                  {formatCompactSessionDate(s.updated_at)}
                </div>
              </div>
            </button>
          );
        })}
        {sessions.length === 0 && !loading && (
          <div className="px-3 py-4 text-xs text-muted-foreground leading-relaxed">
            Inicie uma pergunta ao lado para salvar o histórico na sua conta.
          </div>
        )}
      </div>
    </>
  );

  const canSend = Boolean(input.trim()) && !sending;

  return (
    <div
      data-testid="ai-chat-root"
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background"
    >
      {/* Minimal Modern Chat Topbar */}
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-background/95 backdrop-blur-md px-4 py-2.5 lg:px-6">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold tracking-tight text-white dark:bg-zinc-100 dark:text-zinc-950">
            T
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
                Copilot Target
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium ${
                  loading && !aiConfigured
                    ? "border-border bg-muted text-muted-foreground"
                    : aiConfigured
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-300"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    loading && !aiConfigured
                      ? "bg-muted-foreground/60 animate-pulse"
                      : aiConfigured
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                  }`}
                />
                {loading && !aiConfigured ? "Conectando..." : aiConfigured ? aiModel : "API pendente"}
              </span>
            </div>
            <p className="hidden sm:block truncate text-[11px] text-muted-foreground">
              Conectado ao CRM (4.344 negócios), Radar DOU, Blog GEO, Placar SDR e Google Ads
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 rounded-full gap-1.5 text-xs lg:hidden cursor-pointer"
            onClick={() => setMobileSessionsOpen((v) => !v)}
          >
            <History className="size-3.5" />
            <span>Sessões ({sessions.length})</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 rounded-full gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={onOpenAiSettings}
          >
            <KeyRound className="size-3.5" />
            <span className="hidden sm:inline">Configurar</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-full gap-1.5 px-3.5 text-xs font-medium cursor-pointer"
            onClick={createNewSession}
          >
            <Plus className="size-3.5" />
            Nova conversa
          </Button>
        </div>
      </header>

      {!loading && !aiConfigured && (
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 lg:px-6">
          <span>
            Adicione sua <strong>OPENAI_API_KEY</strong> em Configurar para habilitar respostas com GPT em tempo real.
          </span>
          <Button size="sm" onClick={onOpenAiSettings} className="h-7 rounded-full text-xs cursor-pointer">
            Conectar OpenAI
          </Button>
        </div>
      )}

      {/* Full-Height Split Workspace */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop Sessions Rail */}
        <aside className="hidden w-64 shrink-0 flex-col min-h-0 border-r border-border/60 bg-muted/20 dark:bg-zinc-950/50 lg:flex">
          {SessionsList}
        </aside>

        {/* Mobile Sessions Overlay */}
        {mobileSessionsOpen && (
          <div className="absolute inset-y-0 left-0 z-30 flex w-64 flex-col min-h-0 border-r border-border bg-background shadow-2xl lg:hidden">
            {SessionsList}
          </div>
        )}

        {/* Main Thread + Floating Composer Dock */}
        <section className="relative flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden">
          <div
            ref={messagesScrollRef}
            data-testid="ai-chat-messages-scroll"
            onScroll={handleMessagesScroll}
            className="chat-scrollbar flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-6 lg:px-10"
          >
            <div className="mx-auto max-w-3xl space-y-6 pb-4">
              {loading && messages.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-16 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Carregando histórico do Copilot...</span>
                </div>
              )}

              {messages.length === 0 && !loading && (
                <div className="pt-8 pb-4 space-y-7">
                  <div className="text-center space-y-2.5">
                    <div className="mx-auto flex size-11 items-center justify-center rounded-2xl border border-border/80 bg-card shadow-sm text-sm font-semibold text-foreground">
                      T
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      Como posso ajudar na operação hoje?
                    </h2>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                      Consulte o banco em tempo real, delegue tarefas para os SDRs, gere pautas do blog ou ajuste campanhas sem sair do chat.
                    </p>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {PROMPT_SUGGESTIONS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.short}
                          type="button"
                          onClick={() => sendMessage(item.prompt)}
                          className="group flex flex-col gap-1.5 rounded-2xl border border-border/80 bg-card/70 hover:bg-accent/50 hover:border-foreground/20 p-3.5 text-left transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                            <Icon className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                            <span>{item.short}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                            {item.prompt}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} data-testid="ai-chat-message" className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-zinc-900 px-4 py-2.5 text-[13px] leading-relaxed text-zinc-50 shadow-xs dark:bg-zinc-100 dark:text-zinc-950">
                      {renderChatMarkdown(m.content)}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} data-testid="ai-chat-message" className="group flex items-start gap-3">
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold text-foreground shadow-2xs">
                      T
                    </div>
                    <div className="min-w-0 flex-1 space-y-2.5 pt-0.5 text-[13px] leading-[1.65] text-foreground">
                      {Array.isArray(m.tool_calls_json) && m.tool_calls_json.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {m.tool_calls_json.map((tc, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/60 px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                            >
                              <Wrench className="size-2.5 text-emerald-600 dark:text-emerald-400" />
                              {tc.name}
                              <CheckCircle2 className="size-2.5 text-emerald-600 dark:text-emerald-400" />
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="text-foreground/95">{renderChatMarkdown(m.content)}</div>

                      <div className="flex items-center gap-2 pt-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(m)}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                        >
                          {copiedMsgId === m.id ? (
                            <>
                              <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}

              {sending && (
                <div className="flex items-center gap-3 pl-10 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Consultando Supabase e executando ferramentas OpenAI...</span>
                </div>
              )}
            </div>
          </div>

          {/* Floating Circular Scroll-to-Bottom Button */}
          {showScrollBottom && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[146px] z-10 flex justify-center">
              <button
                type="button"
                onClick={() => scrollToBottom("smooth")}
                aria-label="Ir para o final da conversa"
                className="pointer-events-auto flex size-8 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-md backdrop-blur-md hover:bg-accent transition-all cursor-pointer"
              >
                <ArrowDown className="size-3.5" />
              </button>
            </div>
          )}

          {/* Modern Pill-Shaped Floating Composer */}
          <div className="shrink-0 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pt-2 pb-4 lg:px-10">
            <div className="mx-auto max-w-3xl space-y-2.5">
              {messages.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {PROMPT_SUGGESTIONS.slice(0, 3).map((item) => (
                    <button
                      key={item.short}
                      type="button"
                      onClick={() => sendMessage(item.prompt)}
                      className="rounded-full border border-border/80 bg-card/80 px-3 py-1 text-[11px] font-medium text-muted-foreground hover:border-foreground/30 hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer"
                    >
                      {item.short}
                    </button>
                  ))}
                </div>
              )}

              <div className="rounded-[24px] border border-border/90 bg-card shadow-sm transition-all focus-within:border-zinc-400 focus-within:ring-4 focus-within:ring-foreground/[0.04] dark:bg-zinc-900/90 dark:focus-within:border-zinc-600">
                <div className="px-4 pt-3 pb-1.5">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Pergunte sobre leads, Radar DOU, agenda dos SDRs ou peça para criar pautas..."
                    className="chat-scrollbar w-full resize-none border-0 bg-transparent text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[44px] max-h-[180px]"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 px-3.5 pb-2.5 pt-1">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                    <span>{aiModel}</span>
                    <span className="opacity-40">•</span>
                    <span className="hidden sm:inline">Enter para enviar · Shift+Enter quebra linha</span>
                  </div>

                  <button
                    type="button"
                    aria-label="Enviar mensagem"
                    onClick={() => sendMessage()}
                    disabled={!canSend}
                    className={`flex size-8 items-center justify-center rounded-full transition-all ${
                      canSend
                        ? "bg-zinc-900 text-white hover:bg-zinc-700 shadow-xs dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer"
                        : "bg-muted text-muted-foreground/50 cursor-not-allowed"
                    }`}
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowUp className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
