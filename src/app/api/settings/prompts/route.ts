import { requireWorkspaceUser } from "@/lib/supabase/server";
import { resolveOpenAiClient, TARGET_COMPLIANCE_SYSTEM_PROMPT } from "@/lib/openai";
import { isPromptKey, OTAVIO_SOURCE_RULES, PROMPTS, PROMPT_KEYS, PROMPT_LIMIT } from "@/lib/prompt-catalog";
import { withPromptInstructions, type PromptRow } from "@/lib/prompt-store";

async function savedPrompt(row: PromptRow) {
  if (row.key !== "anderley") return Response.json({ row });
  const url = process.env.ANDERLEY_PROMPT_SYNC_URL;
  const secret = process.env.ANDERLEY_PROMPT_SYNC_SECRET;
  if (url && secret) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: secret },
        body: JSON.stringify({ text: row.text, revision: row.revision }),
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) return Response.json({ row });
    } catch {
      // Supabase keeps the revision even if the worker cannot receive it.
    }
  }
  return Response.json({ row, syncPending: true });
}

export async function GET() {
  const auth = await requireWorkspaceUser();
  if (auth.errorResponse) return auth.errorResponse;

  const { data, error } = await auth.supabase.from("ai_prompt_settings").select("*").in("key", PROMPT_KEYS);
  const storagePending = error?.code === "PGRST205" || error?.code === "42P01";
  if (error && !storagePending) return Response.json({ error: "Não foi possível carregar os prompts." }, { status: 500 });

  return Response.json({
    canEdit: auth.member.role === "admin" || auth.member.role === "ops",
    storagePending,
    rows: data ?? [],
  });
}

export async function POST(request: Request) {
  const auth = await requireWorkspaceUser();
  if (auth.errorResponse) return auth.errorResponse;
  if (auth.member.role !== "admin" && auth.member.role !== "ops") {
    return Response.json({ error: "O perfil atual pode consultar prompts. Alterações exigem Admin ou Ops." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as {
    action?: unknown;
    key?: unknown;
    text?: unknown;
    sample?: unknown;
    revision?: unknown;
  } | null;
  const key = body?.key;
  if (!isPromptKey(key) || typeof body?.text !== "string") {
    return Response.json({ error: "Selecione uma IA e informe o prompt." }, { status: 400 });
  }
  const text = body.text.trim();
  if (!text || text.length > PROMPT_LIMIT) {
    return Response.json({ error: `O prompt deve ter entre 1 e ${PROMPT_LIMIT} caracteres.` }, { status: 400 });
  }

  if (body.action === "preview") {
    const sample = typeof body.sample === "string" ? body.sample.trim() : "";
    if (!sample || sample.length > 3_000) {
      return Response.json({ error: "Informe um caso de teste com até 3.000 caracteres." }, { status: 400 });
    }
    const { client, model } = await resolveOpenAiClient(auth.supabase);
    if (!client) return Response.json({ error: "OpenAI indisponível neste ambiente." }, { status: 503 });
    try {
      const rules = key === "otavio" ? OTAVIO_SOURCE_RULES : TARGET_COMPLIANCE_SYSTEM_PROMPT;
      const result = await client.responses.create({
        model,
        store: false,
        max_output_tokens: 700,
        instructions: withPromptInstructions(
          `${rules}\nSimulação sem ferramentas. Use somente o cenário fornecido. Não afirme ter consultado dados reais nem executado ações.`,
          text,
        ),
        input: sample,
      }, { timeout: 35_000, maxRetries: 0, signal: request.signal });
      if (!result.output_text.trim()) throw new Error("empty_preview");
      return Response.json({ text: result.output_text, model: result.model });
    } catch {
      return Response.json({ error: "A OpenAI não retornou a prévia. Verifique o modelo ou tente novamente." }, { status: 424 });
    }
  }

  if (body.action !== "save" || typeof body.revision !== "number" || !Number.isInteger(body.revision) || body.revision < 0) {
    return Response.json({ error: "Informe a revisão atual para salvar." }, { status: 400 });
  }
  const { data, error } = await auth.supabase.from("ai_prompt_settings").select("*").eq("key", key).maybeSingle();
  if (error) return Response.json({ error: "O armazenamento de prompts está indisponível." }, { status: 503 });
  const previous = data as PromptRow | null;
  const conflict = () => Response.json({ error: "Este prompt mudou em outra sessão. Atualize a central antes de salvar." }, { status: 409 });
  if (body.revision !== (previous?.revision ?? 0)) return conflict();
  if (previous?.text === text) return savedPrompt(previous);

  const entry = {
    key,
    text,
    revision: body.revision + 1,
    updated_at: new Date().toISOString(),
    updated_by: auth.member.full_name,
    history: previous ? [
      { revision: previous.revision, text: previous.text, updatedAt: previous.updated_at, updatedBy: previous.updated_by },
      ...previous.history,
    ].slice(0, 10) : [],
  };
  const table = auth.supabase.from("ai_prompt_settings");
  const write = previous
    ? table.update(entry).eq("key", key).eq("revision", previous.revision)
    : table.insert(entry);
  const { data: saved, error: saveError } = await write.select("*").maybeSingle();
  if (saveError?.code === "23505" || (!saveError && !saved)) return conflict();
  if (saveError) return Response.json({ error: `Não foi possível salvar o prompt de ${PROMPTS[key].name}.` }, { status: 500 });
  return savedPrompt(saved as PromptRow);
}
