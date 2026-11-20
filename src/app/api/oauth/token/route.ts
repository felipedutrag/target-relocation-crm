import { NextRequest, NextResponse } from "next/server";
import {
  buildMcpCorsHeaders,
  createStatelessSupabase,
  generateSecureToken,
  sha256Base64Url,
  sha256Hex,
} from "@/lib/mcp-auth";

export const dynamic = "force-dynamic";

async function parseTokenBody(req: NextRequest): Promise<Record<string, string>> {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    const j = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(j)) {
      if (v !== undefined && v !== null) out[k] = String(v);
    }
    return out;
  }
  const text = await req.text();
  const params = new URLSearchParams(text);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseTokenBody(req);
    const grantType = body.grant_type || "authorization_code";

    let clientId = body.client_id || "openai-mcp";
    const authHeader = req.headers.get("authorization") || "";
    if (!body.client_id && authHeader.toLowerCase().startsWith("basic ")) {
      const decoded = Buffer.from(authHeader.slice(6).trim(), "base64").toString("utf8");
      const idx = decoded.indexOf(":");
      if (idx > 0) clientId = decodeURIComponent(decoded.slice(0, idx));
    }

    const supabase = createStatelessSupabase();

    if (grantType === "authorization_code") {
      const code = (body.code || "").trim();
      const redirectUri = (body.redirect_uri || "").trim();
      const verifier = (body.code_verifier || "").trim();

      if (!code || !redirectUri) {
        return NextResponse.json(
          { error: "invalid_request", error_description: "code e redirect_uri são obrigatórios." },
          { status: 400, headers: buildMcpCorsHeaders() }
        );
      }

      const accessToken = generateSecureToken("mcp_ro_");
      const refreshToken = generateSecureToken("mcp_rf_");

      const { data, error } = await supabase.rpc("mcp_exchange_oauth_code", {
        p_code_hash: sha256Hex(code),
        p_client_id: clientId,
        p_redirect_uri: redirectUri,
        p_expected_s256_challenge: verifier ? sha256Base64Url(verifier) : "",
        p_plain_verifier: verifier,
        p_access_hash: sha256Hex(accessToken),
        p_refresh_hash: sha256Hex(refreshToken),
      });

      const res = data as Record<string, unknown> | null;
      if (error || !res?.ok) {
        return NextResponse.json(
          { error: "invalid_grant", error_description: error?.message || String(res?.error || "Código OAuth inválido.") },
          { status: 400, headers: buildMcpCorsHeaders() }
        );
      }

      return NextResponse.json(
        {
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: 2592000,
          refresh_token: refreshToken,
          scope: String(res.scope || "mcp:read"),
        },
        { status: 200, headers: buildMcpCorsHeaders() }
      );
    }

    if (grantType === "refresh_token") {
      const refresh = (body.refresh_token || "").trim();
      if (!refresh) {
        return NextResponse.json(
          { error: "invalid_request", error_description: "refresh_token obrigatório." },
          { status: 400, headers: buildMcpCorsHeaders() }
        );
      }

      const newAccess = generateSecureToken("mcp_ro_");
      const newRefresh = generateSecureToken("mcp_rf_");

      const { data, error } = await supabase.rpc("mcp_refresh_oauth_token", {
        p_refresh_hash: sha256Hex(refresh),
        p_new_access_hash: sha256Hex(newAccess),
        p_new_refresh_hash: sha256Hex(newRefresh),
      });

      const res = data as Record<string, unknown> | null;
      if (error || !res?.ok) {
        return NextResponse.json(
          { error: "invalid_grant", error_description: error?.message || String(res?.error || "Refresh token inválido.") },
          { status: 400, headers: buildMcpCorsHeaders() }
        );
      }

      return NextResponse.json(
        {
          access_token: newAccess,
          token_type: "Bearer",
          expires_in: 2592000,
          refresh_token: newRefresh,
          scope: String(res.scope || "mcp:read"),
        },
        { status: 200, headers: buildMcpCorsHeaders() }
      );
    }

    return NextResponse.json(
      { error: "unsupported_grant_type", error_description: `Unsupported grant_type: ${grantType}` },
      { status: 400, headers: buildMcpCorsHeaders() }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "server_error", error_description: String(error) },
      { status: 500, headers: buildMcpCorsHeaders() }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: buildMcpCorsHeaders() });
}
