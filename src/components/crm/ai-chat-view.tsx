"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  KeyRound,
  Loader2,
  MessageSquarePlus,
  Send,
  Sparkles,
  User,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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

/** Renders lightweight inline bold (**text**) and inline code (`code`) spans inside chat bubbles. */
function renderChatText(text: string) {
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
    return <span key={idx}>{part}</span>;
  });
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
  const endRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  async function createNewSession() {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "new_session" }),
    });
    const json = await res.json();
    if (json.session?.id) {
      await loadChat(json.session.id);
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
          { id: Date.now() + 1, role: "assistant", content: `Erro: ${json.error}`, created_at: new Date().toISOString() },
        ]);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="size-6 text-amber-500" />
            Copilot IA Target Relocation
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Opera em tempo real sobre CRM (4.344 deals), Radar DOU, Blog GEO, Placar SDR e Campanhas Ads via OpenAI Function Calling
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={aiConfigured ? "default" : "outline"} className={aiConfigured ? "bg-emerald-600 text-white" : ""}>
            {aiConfigured ? `OpenAI Ativa • ${aiModel}` : "Chave OpenAI Pendente"}
          </Badge>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onOpenAiSettings}>
            <KeyRound className="size-3.5" />
            Configurar IA
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={createNewSession}>
            <MessageSquarePlus className="size-3.5" />
            Nova Conversa
          </Button>
        </div>
      </div>

      {!aiConfigured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span>
            Insira sua <strong>OPENAI_API_KEY</strong> em Configurações IA para ativar o Copilot conversacional e a
            geração de artigos/auditorias com GPT.
          </span>
          <Button size="sm" onClick={onOpenAiSettings} className="h-7 text-xs">
            Conectar OpenAI Agora
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-295px)] min-h-[450px]">
        {/* Sessions sidebar */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="pb-2 border-b border-border/60">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Histórico de Sessões ({sessions.length})
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => loadChat(s.id)}
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                    activeSessionId === s.id
                      ? "bg-accent text-accent-foreground font-medium"
                      : "hover:bg-accent/50 text-muted-foreground"
                  }`}
                >
                  <div className="truncate">{s.title}</div>
                  <div className="text-[10px] font-mono opacity-70 mt-0.5">
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
          </ScrollArea>
        </Card>

        {/* Main Chat Area */}
        <Card className="lg:col-span-3 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && !loading && (
                <div className="py-8 space-y-5 max-w-2xl mx-auto">
                  <div className="text-center space-y-1.5">
                    <Bot className="size-8 mx-auto text-amber-500" />
                    <h2 className="text-base font-semibold">Central de Comando IA • Plano de Ação Target</h2>
                    <p className="text-xs text-muted-foreground">
                      Posso consultar leads do Supabase, criar tarefas para Áurea/Anderley, gerar pautas do calendário e
                      registrar negativas no Google Ads. Experimente:
                    </p>
                  </div>
                  <div className="grid gap-2">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => sendMessage(q)}
                        className="rounded-lg border border-border bg-muted/30 hover:bg-accent/50 p-3 text-left text-xs transition-colors cursor-pointer"
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
                    <div className="whitespace-pre-wrap">{renderChatText(m.content)}</div>
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
              <div ref={endRef} />
            </div>
          </ScrollArea>

          <CardContent className="p-3 border-t border-border bg-muted/20">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_PROMPTS.slice(0, 3).map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground/30 truncate max-w-[260px] cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
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
                className="text-xs resize-none min-h-[56px]"
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
