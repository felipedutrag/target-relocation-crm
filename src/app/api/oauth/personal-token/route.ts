import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceUser } from "@/lib/supabase/server";
import { createStatelessSupabase, generateSecureToken, sha256Hex } from "@/lib/mcp-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;

    const body = (await req.json()) as { password?: string; label?: string };
    const password = body.password || "";
    if (!password) {
      return NextResponse.json({ error: "Informe sua senha do CRM para emitir o token MCP." }, { status: 400 });
    }

    const email = (auth.user?.email || auth.member.email || "").toLowerCase();
    const stateless = createStatelessSupabase();
    const { data: verified, error: signErr } = await stateless.auth.signInWithPassword({ email, password });

    if (signErr || !verified.user) {
      return NextResponse.json({ error: "Senha incorreta para o usuário conectado." }, { status: 401 });
    }

    const rawToken = generateSecureToken("mcp_ro_");
    const label = (body.label || "OpenAI Cloud MCP Read-Only").trim();

    const { data, error } = await stateless.rpc("mcp_issue_personal_token", {
      p_access_hash: sha256Hex(rawToken),
      p_label: label,
    });

    const res = data as Record<string, unknown> | null;
    if (error || !res?.ok) {
      return NextResponse.json({ error: error?.message || String(res?.error || "Erro ao emitir token.") }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      token: rawToken,
      scope: "mcp:read",
      expiresInDays: res.expires_in_days || 365,
      memberEmail: email,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
