import { NextRequest, NextResponse } from "next/server";
import { createStatelessSupabase, generateSecureToken, sha256Hex } from "@/lib/mcp-auth";

export const dynamic = "force-dynamic";

function isSafeRedirectUri(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:" || parsed.protocol === "cursor:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      client_id?: string;
      redirect_uri?: string;
      state?: string;
      code_challenge?: string;
      code_challenge_method?: string;
      scope?: string;
    };

    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const redirectUri = (body.redirect_uri || "").trim();
    const clientId = (body.client_id || "openai-mcp").trim();

    if (!email || !password) {
      return NextResponse.json({ error: "E-mail e senha do CRM são obrigatórios." }, { status: 400 });
    }
    if (!redirectUri || !isSafeRedirectUri(redirectUri)) {
      return NextResponse.json({ error: "redirect_uri ausente ou inválido." }, { status: 400 });
    }

    const supabase = createStatelessSupabase();
    const { data: authData, error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signErr || !authData.user) {
      return NextResponse.json(
        { error: "E-mail ou senha inválidos. Utilize sua senha cadastrada no Target CRM." },
        { status: 401 }
      );
    }

    const code = generateSecureToken("mcp_code_");
    const { data: rpcData, error: rpcErr } = await supabase.rpc("mcp_create_oauth_code", {
      p_code_hash: sha256Hex(code),
      p_client_id: clientId,
      p_redirect_uri: redirectUri,
      p_code_challenge: (body.code_challenge || "").trim(),
      p_code_challenge_method: (body.code_challenge_method || "S256").trim(),
      p_scope: "mcp:read",
    });

    const res = rpcData as Record<string, unknown> | null;
    if (rpcErr || !res?.ok) {
      return NextResponse.json(
        { error: rpcErr?.message || String(res?.error || "Usuário não autorizado no workspace.") },
        { status: 403 }
      );
    }

    const targetUrl = new URL(redirectUri);
    targetUrl.searchParams.set("code", code);
    if (body.state) targetUrl.searchParams.set("state", body.state);

    return NextResponse.json({
      success: true,
      redirectTo: targetUrl.toString(),
      member: {
        email: res.member_email,
        name: res.member_name,
        role: res.member_role,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
