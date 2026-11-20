"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  Bot,
  CheckCircle2,
  History,
  KeyRound,
  Loader2,
  MessageSquarePlus,
  Send,
  Sparkles,
  User,
  Wrench,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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

const QUICK_PROMPTS = [
  "Faça um briefing executivo de hoje: negócios no CRM, Radar DOU, placar SDR e travas do plano de 90 dias.",
  "Busque os 5 leads do Radar DOU com maior score em aberto para a Áurea ligar hoje.",
  "Crie uma pauta News sobre exigência no MTE na quinta-feira para revisão e aprovação do Klaus.",
  "Registre que Ana Souza (RH da Nestlé) visitou o perfil do Klaus no LinkedIn Premium e crie tarefa matinal para o Anderley.",
  "Adicione a palavra-chave negativa 'visto H2B agrícola' nas campanhas do Google Ads.",
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
        <code key={idx} className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

/** Renders structured Markdown blocks (headings, bullet/numbered lists, bold, inline code) inside chat bubbles. */
function renderChatMarkdown(text: string) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 break-words">
      {lines.map((rawLine, idx) => {
        const trimmed = rawLine.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="pt-1 text-xs font-semibold tracking-tight">
              {renderInlineSpans(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
          const clean = trimmed.replace(/^#{1,3}\s+/, "");
          return (
            <h3 key={idx} className="pt-1.5 text-sm font-semibold tracking-tight">
              {renderInlineSpans(clean)}
            </h3>
          );
        }
        const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current opacity-65" />
              <div className="min-w-0 flex-1">{renderInlineSpans(bulletMatch[1])}</div>
            </div>
          );
        }
        const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="shrink-0 font-mono text-[11px] font-semibold opacity-75">
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

export function AiChatView({ onOpenAiSettings }: { onOpenAiSettings: () => void }) {
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
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  const loadChat = useCallback(async (sessionId?: string | null) => {
    setLoading(true);
    try {
      const qs = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
      const res = await fetch(`/api/ai/chat${qs}`);
      const json = await res.json();
      setSessions(json.sessions || []);
      setActiveSessionId(json.activeSessionId || null);
      setMessages(json.messages || []);
      setAiConfigured(Boolean(json.aiConfigured));
      if (json.aiModel) setAiModel(json.aiModel);
    } finally {
      setLoading(false);
    }
  }, []);

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

  function handleMessagesScroll() {
    const el = messagesScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distanceFromBottom > 120);
  }

  async function createNewSession() {
    const res = await fetch("/api/ai/chat", {
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
      const res = await fetch("/api/ai/chat", {
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

  const SessionsList = (
    <>
      <div className="shrink-0 flex items-center justify-between border-b border-border/60 px-3 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Histórico de Sessões ({sessions.length})
        </span>
        <button
          type="button"
          onClick={() => setMobileSessionsOpen(false)}
          className="rounded p-1 text-muted-foreground hover:bg-accent lg:hidden"
          aria-label="Fechar sessões"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1">
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              loadChat(s.id);
              setMobileSessionsOpen(false);
            }}
            className={`w-full rounded-lg px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
              activeSessionId === s.id
                ? "bg-accent text-accent-foreground font-medium"
                : "hover:bg-accent/50 text-muted-foreground"
            }`}
          >
            <div className="truncate">{s.title}</div>
            <div className="mt-0.5 font-mono text-[10px] opacity-70">
              {new Date(s.updated_at).toLocaleString("pt-BR")}
            </div>
          </button>
        ))}
        {sessions.length === 0 && !loading && (
          <div className="p-3 text-xs text-muted-foreground">
            Envie uma mensagem para iniciar sua primeira sessão no Supabase.
          </div>
        )}
      </div>
    </>
  );

  return (
    <div
      data-testid="ai-chat-root"
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background"
    >
      {/* Compact Edge-to-Edge Chat Topbar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background/95 px-4 py-2.5 lg:px-6">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-sm sm:text-base font-semibold tracking-tight">
            <Sparkles className="size-4 text-amber-500 shrink-0" />
            <span className="truncate">Copilot IA Target Relocation</span>
          </h1>
          <p className="hidden sm:block truncate text-[11px] text-muted-foreground">
            Opera ao vivo via OpenAI Function Calling sobre CRM (4.344 deals), Radar DOU, Blog GEO, Placar SDR e Google Ads
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs lg:hidden cursor-pointer"
            onClick={() => setMobileSessionsOpen((v) => !v)}
          >
            <History className="size-3.5" />
            Sessões ({sessions.length})
          </Button>
          <Badge
            variant={aiConfigured ? "default" : "outline"}
            className={aiConfigured ? "bg-emerald-600 text-white" : ""}
          >
            {aiConfigured ? `OpenAI Ativa • ${aiModel}` : "Chave OpenAI Pendente"}
          </Badge>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs cursor-pointer" onClick={onOpenAiSettings}>
            <KeyRound className="size-3.5" />
            <span className="hidden sm:inline">Configurar IA</span>
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs cursor-pointer" onClick={createNewSession}>
            <MessageSquarePlus className="size-3.5" />
            Nova Conversa
          </Button>
        </div>
      </div>

      {!aiConfigured && (
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs lg:px-6">
          <span>
            Insira sua <strong>OPENAI_API_KEY</strong> em Configurações IA para ativar o Copilot conversacional e a
            geração de artigos/auditorias com GPT.
          </span>
          <Button size="sm" onClick={onOpenAiSettings} className="h-7 text-xs cursor-pointer">
            Conectar OpenAI Agora
          </Button>
        </div>
      )}

      {/* Full-Height Split Body */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop Sessions Rail */}
        <aside className="hidden w-72 shrink-0 flex-col min-h-0 border-r border-border bg-muted/15 lg:flex">
          {SessionsList}
        </aside>

        {/* Mobile Sessions Overlay */}
        {mobileSessionsOpen && (
          <div className="absolute inset-y-0 left-0 z-30 flex w-72 flex-col min-h-0 border-r border-border bg-background shadow-xl lg:hidden">
            {SessionsList}
          </div>
        )}

        {/* Right Messages + Composer Column */}
        <section className="relative flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden">
          {/* Native Scrollable Messages Viewport */}
          <div
            ref={messagesScrollRef}
            data-testid="ai-chat-messages-scroll"
            onScroll={handleMessagesScroll}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-5 lg:px-8"
          >
            <div className="mx-auto max-w-4xl space-y-5 pb-2">
              {messages.length === 0 && !loading && (
                <div className="py-6 space-y-5">
                  <div className="text-center space-y-1.5">
                    <Bot className="size-8 mx-auto text-amber-500" />
                    <h2 className="text-base font-semibold">Central de Comando IA • Plano de Ação Target</h2>
                    <p className="text-xs text-muted-foreground max-w-xl mx-auto">
                      Consulte negócios e DOUs em tempo real no Supabase, crie tarefas para Áurea/Anderley, gere pautas do calendário e adicione negativas no Google Ads:
                    </p>
                  </div>
                  <div className="grid gap-2">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => sendMessage(q)}
                        className="rounded-xl border border-border bg-muted/30 hover:bg-accent/50 p-3 text-left text-xs transition-colors cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  data-testid="ai-chat-message"
                  className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500 mt-0.5">
                      <Bot className="size-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed space-y-2 ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card"
                    }`}
                  >
                    {Array.isArray(m.tool_calls_json) && m.tool_calls_json.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pb-1.5 border-b border-border/50">
                        {m.tool_calls_json.map((tc, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] font-mono gap-1">
                            <Wrench className="size-2.5 text-emerald-500" />
                            {tc.name}
                            <CheckCircle2 className="size-2.5 text-emerald-500" />
                          </Badge>
                        ))}
                      </div>
                    )}
                    {renderChatMarkdown(m.content)}
                  </div>
                  {m.role === "user" && (
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground mt-0.5">
                      <User className="size-4" />
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pl-10">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Consultando Supabase e executando ferramentas OpenAI...</span>
                </div>
              )}
            </div>
          </div>

          {/* Floating Scroll-to-Bottom Button */}
          {showScrollBottom && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[132px] z-10 flex justify-center">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => scrollToBottom("smooth")}
                className="pointer-events-auto h-7 gap-1.5 rounded-full border border-border px-3 text-[11px] shadow-md cursor-pointer"
              >
                <ArrowDown className="size-3" />
                Ir para o final
              </Button>
            </div>
          )}

          {/* Pinned Bottom Composer Dock */}
          <div className="shrink-0 border-t border-border bg-background/95 px-4 py-3 lg:px-8">
            <div className="mx-auto max-w-4xl space-y-2">
              {messages.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.slice(0, 3).map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendMessage(q)}
                      className="rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground/30 truncate max-w-[260px] cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Digite um comando para o Copilot IA (ex: 'Crie tarefa para a Áurea ligar para os 3 maiores DOUs de hoje')..."
                  className="text-xs resize-none min-h-[54px]"
                />
                <Button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={sending || !input.trim()}
                  className="h-auto px-4 gap-1.5 text-xs shrink-0 cursor-pointer"
                >
                  <Send className="size-3.5" />
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
