import crypto from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { WorkspaceMember } from "@/lib/supabase/server";

export interface McpCallerContext {
  ok: true;
  member: WorkspaceMember;
  accessHash: string | null;
  supabase: SupabaseClient;
  authMode: "mcp_bearer" | "supabase_jwt" | "basic_password" | "header_password";
}

export interface McpAuthFailure {
  ok: false;
  status: 401 | 403;
  error: string;
  wwwAuthenticate: string;
}

export function getPublicOrigin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) {
    return `${proto}://${host}`;
  }
  return req.nextUrl.origin;
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function sha256Base64Url(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function generateSecureToken(prefix = "mcp_ro_"): string {
  return `${prefix}${crypto.randomBytes(32).toString("base64url")}`;
}

export function buildMcpCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, X-Target-Email, X-Target-Password",
    "Access-Control-Expose-Headers": "Mcp-Session-Id, WWW-Authenticate",
  };
}

export function createStatelessSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Variáveis NEXT_PUBLIC_SUPABASE_URL e chave pública do Supabase não configuradas.");
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function buildProtectedResourceMetadata(origin: string) {
  return {
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp:read"],
    resource_documentation: `${origin}/oauth/authorize`,
  };
}

export function buildAuthorizationServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    scopes_supported: ["mcp:read"],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    code_challenge_methods_supported: ["S256", "plain"],
    service_documentation: `${origin}/api/mcp`,
  };
}

function buildWwwAuth(origin: string, errorDesc?: string): string {
  const base = `Bearer realm="Target Relocation MCP (Read-Only)", resource_metadata="${origin}/.well-known/oauth-protected-resource", scope="mcp:read"`;
  if (!errorDesc) return base;
  return `${base}, error="invalid_token", error_description="${errorDesc.replace(/"/g, "'")}"`;
}

async function authenticateViaPassword(
  email: string,
  password: string,
  origin: string,
  mode: "basic_password" | "header_password"
): Promise<McpCallerContext | McpAuthFailure> {
  const supabase = createStatelessSupabase();
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (signInErr || !signInData.user) {
    return {
      ok: false,
      status: 401,
      error: "Credenciais inválidas para o servidor MCP.",
      wwwAuthenticate: buildWwwAuth(origin, "Invalid email or password"),
    };
  }

  const { data: member } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("user_id", signInData.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!member) {
    return {
      ok: false,
      status: 403,
      error: "Usuário sem acesso ativo ao workspace.",
      wwwAuthenticate: buildWwwAuth(origin, "Inactive workspace member"),
    };
  }

  return {
    ok: true,
    member: member as WorkspaceMember,
    accessHash: null,
    supabase,
    authMode: mode,
  };
}

/** Authenticates incoming remote MCP requests via OAuth/Personal Bearer token, HTTP Basic password, header password, or Supabase JWT. */
export async function authenticateMcpRequest(req: NextRequest): Promise<McpCallerContext | McpAuthFailure> {
  const origin = getPublicOrigin(req);
  const authHeader = req.headers.get("authorization") || "";

  // 1. Custom email/password headers
  const headerEmail = req.headers.get("x-target-email");
  const headerPass = req.headers.get("x-target-password");
  if (headerEmail && headerPass) {
    return authenticateViaPassword(headerEmail, headerPass, origin, "header_password");
  }

  // 2. HTTP Basic Auth (email:password)
  if (authHeader.toLowerCase().startsWith("basic ")) {
    const rawB64 = authHeader.slice(6).trim();
    const decoded = Buffer.from(rawB64, "base64").toString("utf8");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx > 0) {
      const email = decoded.slice(0, colonIdx);
      const password = decoded.slice(colonIdx + 1);
      return authenticateViaPassword(email, password, origin, "basic_password");
    }
    return {
      ok: false,
      status: 401,
      error: "Cabeçalho Basic Auth malformado.",
      wwwAuthenticate: buildWwwAuth(origin, "Malformed Basic auth"),
    };
  }

  // 3. Bearer Token (mcp_ro_... OAuth/Personal OR Supabase JWT)
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    const supabase = createStatelessSupabase();

    if (token.startsWith("mcp_ro_")) {
      const accessHash = sha256Hex(token);
      const { data, error } = await supabase.rpc("mcp_verify_bearer_token", {
        p_access_hash: accessHash,
      });

      const res = data as Record<string, unknown> | null;
      if (error || !res?.valid) {
        return {
          ok: false,
          status: 401,
          error: "Token MCP inválido ou expirado.",
          wwwAuthenticate: buildWwwAuth(origin, "Invalid or expired MCP access token"),
        };
      }

      return {
        ok: true,
        member: {
          id: String(res.user_id || ""),
          user_id: String(res.user_id || ""),
          email: String(res.member_email || ""),
          full_name: String(res.member_name || "Target Member"),
          role: String(res.member_role || "ops"),
          crm_owner_name: null,
          weekly_responsibility: null,
          is_active: true,
        },
        accessHash,
        supabase,
        authMode: "mcp_bearer",
      };
    }

    // Fallback: Supabase Auth JWT passed as Bearer
    const jwtClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    const { data: userData, error: userErr } = await jwtClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return {
        ok: false,
        status: 401,
        error: "Token JWT inválido.",
        wwwAuthenticate: buildWwwAuth(origin, "Invalid Bearer token"),
      };
    }

    const { data: member } = await jwtClient
      .from("workspace_members")
      .select("*")
      .eq("user_id", userData.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!member) {
      return {
        ok: false,
        status: 403,
        error: "Usuário sem acesso ativo ao workspace.",
        wwwAuthenticate: buildWwwAuth(origin, "Inactive workspace member"),
      };
    }

    return {
      ok: true,
      member: member as WorkspaceMember,
      accessHash: null,
      supabase: jwtClient,
      authMode: "supabase_jwt",
    };
  }

  return {
    ok: false,
    status: 401,
    error: "Autenticação obrigatória para conectar ao MCP Target Relocation.",
    wwwAuthenticate: buildWwwAuth(origin),
  };
}
