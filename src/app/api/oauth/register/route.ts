import { NextRequest, NextResponse } from "next/server";
import { buildMcpCorsHeaders, createStatelessSupabase, generateSecureToken, sha256Hex } from "@/lib/mcp-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      client_name?: string;
      redirect_uris?: string[];
      grant_types?: string[];
      response_types?: string[];
      token_endpoint_auth_method?: string;
      scope?: string;
    };

    const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter(Boolean) : [];
    const clientName = (body.client_name || "OpenAI Cloud Connector").trim();
    const clientId = `mcp_client_${generateSecureToken("").slice(0, 22)}`;
    const clientSecret = body.token_endpoint_auth_method === "none" ? undefined : generateSecureToken("mcp_sec_");

    const supabase = createStatelessSupabase();
    const { data, error } = await supabase.rpc("mcp_register_oauth_client", {
      p_client_id: clientId,
      p_client_name: clientName,
      p_redirect_uris: redirectUris,
      p_client_secret_hash: clientSecret ? sha256Hex(clientSecret) : null,
    });

    const res = data as Record<string, unknown> | null;
    if (error || !res?.ok) {
      return NextResponse.json(
        { error: "invalid_client_metadata", error_description: error?.message || String(res?.error || "Registration error") },
        { status: 400, headers: buildMcpCorsHeaders() }
      );
    }

    return NextResponse.json(
      {
        client_id: clientId,
        ...(clientSecret ? { client_secret: clientSecret } : {}),
        client_name: clientName,
        redirect_uris: redirectUris,
        grant_types: body.grant_types || ["authorization_code", "refresh_token"],
        response_types: body.response_types || ["code"],
        token_endpoint_auth_method: body.token_endpoint_auth_method || "none",
        scope: "mcp:read",
        client_id_issued_at: Math.floor(Date.now() / 1000),
      },
      { status: 201, headers: buildMcpCorsHeaders() }
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
