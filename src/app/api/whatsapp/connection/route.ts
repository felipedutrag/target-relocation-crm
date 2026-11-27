import { isWhatsAppAgent } from "@/lib/whatsapp-agents";
import { requireWorkspaceUser } from "@/lib/supabase/server";

async function connection(request: Request) {
  const auth = await requireWorkspaceUser();
  if (auth.errorResponse) return auth.errorResponse;
  if (auth.member.role !== "admin") {
    return Response.json({ error: "Somente administradores podem parear o WhatsApp." }, { status: 403 });
  }
  if (request.method === "POST" && request.headers.get("x-target-action") !== "pair-whatsapp") {
    return Response.json({ error: "Solicitação de pareamento inválida." }, { status: 403 });
  }

  const agent = new URL(request.url).searchParams.get("agent") ?? "anderley";
  if (!isWhatsAppAgent(agent)) return Response.json({ error: "Agente inválido." }, { status: 400 });
  const syncUrl = process.env.ANDERLEY_PROMPT_SYNC_URL;
  const secret = process.env.ANDERLEY_PROMPT_SYNC_SECRET;
  const unavailable = () => Response.json({ error: "A conexão do WhatsApp está indisponível. Tente novamente." }, { status: 503 });
  if (!syncUrl || !secret) return unavailable();

  try {
    const url = new URL("/internal/connection", syncUrl);
    url.searchParams.set("agent", agent);
    const response = await fetch(url, {
      method: request.method,
      headers: { Authorization: secret },
      cache: "no-store",
      signal: AbortSignal.timeout(26000),
    });
    if (!response.ok) return unavailable();
    return Response.json(await response.json(), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return unavailable();
  }
}

export const GET = connection;
export const POST = connection;
