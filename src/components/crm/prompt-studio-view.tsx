"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Bot, Check, Clock3, FlaskConical, LoaderCircle, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PROMPTS, PROMPT_KEYS, PROMPT_LIMIT, type PromptKey } from "@/lib/prompt-catalog";
import type { PromptRow } from "@/lib/prompt-store";
import { cn } from "@/lib/utils";

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export function PromptStudioView() {
  const [selected, select] = useState<PromptKey>("copilot");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Partial<Record<PromptKey, PromptRow>>>({});
  const [drafts, setDrafts] = useState<Partial<Record<PromptKey, string>>>({});
  const [samples, setSamples] = useState<Partial<Record<PromptKey, string>>>({});
  const [responses, setResponses] = useState<Partial<Record<PromptKey, { text: string; model: string }>>>({});
  const [panel, setPanel] = useState<"test" | "history">("test");
  const [canEdit, setCanEdit] = useState(false);
  const [storagePending, setStoragePending] = useState(false);
  const [busy, setBusy] = useState<"load" | "save" | "preview" | null>("load");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/settings/prompts", { signal: abort.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Não foi possível carregar os prompts.");
        setRows(Object.fromEntries((result.rows as PromptRow[]).map(row => [row.key, row])));
        setCanEdit(result.canEdit);
        setStoragePending(result.storagePending);
      } catch (err) {
        if (!abort.signal.aborted) setError(err instanceof Error ? err.message : "Não foi possível carregar os prompts.");
      } finally {
        if (!abort.signal.aborted) setBusy(null);
      }
    }
    void load();
    return () => abort.abort();
  }, []);

  const prompt = PROMPTS[selected];
  const saved = rows[selected];
  const activeText = saved?.text ?? prompt.text;
  const draft = drafts[selected] ?? activeText;
  const sample = samples[selected] ?? prompt.sample;
  const preview = responses[selected];
  const dirty = draft.trim() !== activeText.trim();
  const filtered = PROMPT_KEYS.filter(key =>
    `${PROMPTS[key].name} ${PROMPTS[key].area}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")),
  );

  function edit(text: string) {
    setDrafts(previous => ({ ...previous, [selected]: text }));
    setResponses(previous => ({ ...previous, [selected]: undefined }));
    setNotice("");
  }

  async function run(action: "preview" | "save") {
    setBusy(action);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/settings/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, key: selected, text: draft, sample, revision: saved?.revision ?? 0 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível concluir a ação.");
      if (action === "preview") {
        setResponses(previous => ({ ...previous, [selected]: result }));
      } else {
        setRows(previous => ({ ...previous, [selected]: result.row }));
        setDrafts(previous => ({ ...previous, [selected]: undefined }));
        setNotice(prompt.connected ? "Nova versão ativada no fluxo." : "Rascunho salvo na central.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mx-auto max-w-[1500px] space-y-6 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Central de prompts</h1>
          <p className="text-sm text-muted-foreground">Edite instruções, simule respostas e acompanhe as versões de cada IA.</p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Bot className="size-4" /> {PROMPT_KEYS.length} fluxos
        </span>
      </header>

      {(error || notice || storagePending) && (
        <div className={cn("rounded-lg border px-4 py-3 text-sm", error ? "border-destructive/30 text-destructive" : "border-border text-muted-foreground")}
          role={error ? "alert" : "status"}>
          {error || notice || "O banco ainda precisa da migração para salvar versões. A simulação continua disponível."}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[235px_minmax(0,1fr)] xl:grid-cols-[235px_minmax(0,1fr)_340px]">
        <aside className="self-start rounded-xl border bg-card p-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Buscar IA" className="pl-9" placeholder="Buscar IA…" value={query} onChange={event => setQuery(event.target.value)} />
          </label>
          <nav aria-label="Prompts disponíveis" className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {filtered.map(key => (
              <button key={key} type="button" aria-current={selected === key}
                disabled={busy === "save" || busy === "preview"}
                onClick={() => { select(key); setError(""); setNotice(""); }}
                className={cn("flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted", selected === key && "bg-muted ring-1 ring-border")}>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{PROMPTS[key].name}</span>
                  <span className="block text-xs text-muted-foreground">{PROMPTS[key].area}</span>
                </span>
                {selected === key && <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />}
              </button>
            ))}
            {!filtered.length && <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma IA encontrada.</p>}
          </nav>
        </aside>

        <section aria-label="Editor de prompt" className="flex min-w-0 flex-col rounded-xl border bg-card">
          <div className="border-b p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{prompt.name}</h2>
              <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                {prompt.connected ? "Integrado" : "Integração pendente"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{prompt.purpose}</p>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="prompt-draft" className="text-sm font-medium">Instruções personalizadas</label>
              <span className="text-xs text-muted-foreground">{saved ? `Versão ${saved.revision}` : "Prompt padrão"}</span>
            </div>
            <Textarea id="prompt-draft" className="min-h-72 flex-1 resize-y font-mono text-sm leading-6"
              value={draft} onChange={event => edit(event.target.value)} maxLength={PROMPT_LIMIT}
              readOnly={!canEdit || busy !== null} spellCheck={false} />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{dirty ? "Alterações no rascunho" : saved ? `Atualizado por ${saved.updated_by} em ${dateFormat.format(new Date(saved.updated_at))}` : "Instruções padrão do sistema"}</span>
              <span>{draft.length.toLocaleString("pt-BR")} / {PROMPT_LIMIT.toLocaleString("pt-BR")}</span>
            </div>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-4">
            <Button size="sm" variant="ghost" disabled={!canEdit || !!busy || draft === prompt.text} onClick={() => edit(prompt.text)}>
              <RotateCcw className="size-4" /> Carregar padrão
            </Button>
            <Button size="sm" disabled={!canEdit || !!busy || storagePending || !dirty || !draft.trim()} onClick={() => void run("save")}>
              {busy === "save" ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
              {prompt.connected ? "Salvar e ativar" : "Salvar rascunho"}
            </Button>
          </footer>
        </section>

        <section className="min-w-0 rounded-xl border bg-card lg:col-start-2 xl:col-start-3">
          <div className="flex gap-2 border-b p-3" aria-label="Ferramentas do editor">
            <Button size="sm" variant={panel === "test" ? "secondary" : "ghost"} aria-pressed={panel === "test"} onClick={() => setPanel("test")}>
              <FlaskConical className="size-4" /> Simulação
            </Button>
            <Button size="sm" variant={panel === "history" ? "secondary" : "ghost"} aria-pressed={panel === "history"} onClick={() => setPanel("history")}>
              <Clock3 className="size-4" /> Versões
            </Button>
          </div>
          {panel === "test" ? (
            <div className="space-y-3 p-4">
              <p className="text-xs leading-relaxed text-muted-foreground">Teste com um cenário fictício. A simulação usa o rascunho e não executa ações nem consulta dados reais.</p>
              <label htmlFor="prompt-sample" className="text-sm font-medium">Caso de teste</label>
              <Textarea id="prompt-sample" value={sample} maxLength={3000} className="min-h-28" readOnly={!canEdit || !!busy}
                onChange={event => { setSamples(previous => ({ ...previous, [selected]: event.target.value })); setResponses(previous => ({ ...previous, [selected]: undefined })); }} />
              <Button className="w-full" variant="outline" disabled={!canEdit || !!busy || !sample.trim() || !draft.trim()} onClick={() => void run("preview")}>
                {busy === "preview" ? <LoaderCircle className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
                {busy === "preview" ? "Simulando…" : "Executar simulação"}
              </Button>
              {preview && (
                <div className="space-y-2 rounded-lg border bg-muted/40 p-3" aria-live="polite">
                  <span className="text-xs text-muted-foreground">{preview.model}</span>
                  <p className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed">{preview.text}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {saved?.history.length ? saved.history.map(version => (
                <div key={version.revision} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Versão {version.revision}</p>
                    <p className="text-xs text-muted-foreground">{version.updatedBy} · {dateFormat.format(new Date(version.updatedAt))}</p>
                  </div>
                  <Button size="sm" variant="ghost" disabled={!canEdit || !!busy} onClick={() => edit(version.text)}>Carregar</Button>
                </div>
              )) : <p className="text-sm text-muted-foreground">Versões anteriores aparecem aqui após a primeira revisão.</p>}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
