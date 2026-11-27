import { isWhatsAppAgent } from "@/lib/whatsapp-agents";
import { requireWorkspaceUser } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const auth = await requireWorkspaceUser();
  if (auth.errorResponse) return auth.errorResponse;
  if (!["admin", "ops"].includes(auth.member.role)) {
    return Response.json({ error: "O histórico está disponível para os perfis Admin e Ops." }, { status: 403 });
  }
  const agent = new URL(request.url).searchParams.get("agent") ?? "anderley";
  if (!isWhatsAppAgent(agent)) return Response.json({ error: "Agente inválido." }, { status: 400 });
  const syncUrl = process.env.ANDERLEY_PROMPT_SYNC_URL;
  const secret = process.env.ANDERLEY_PROMPT_SYNC_SECRET;
  const unavailable = () => Response.json({ error: "Histórico do WhatsApp indisponível. Tente novamente." }, { status: 503 });
  if (!syncUrl || !secret) return unavailable();

  const conversation = new URL(request.url).searchParams.get("conversation");
  if (conversation !== null && !/^\d{1,32}@(s\.whatsapp\.net|lid)$/.test(conversation)) {
    return Response.json({ error: "Conversa inválida." }, { status: 400 });
  }
  try {
    const url = new URL("/internal/conversations", syncUrl);
    url.searchParams.set("agent", agent);
    if (conversation) url.searchParams.set("conversation", conversation);
    const response = await fetch(url, {
      headers: { Authorization: secret }, cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return unavailable();
    return Response.json(await response.json(), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return unavailable();
  }
}
