import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authenticateMcpRequest, buildMcpCorsHeaders } from "@/lib/mcp-auth";
import {
  executeMcpTool,
  MCP_RESOURCES_LIST,
  MCP_TOOLS_DEFINITION,
  readMcpResource,
} from "@/lib/mcp-tools";

export const dynamic = "force-dynamic";

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

function buildUnauthorized(error: string, status: 401 | 403, wwwAuthenticate: string) {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32001,
        message: error,
      },
    },
    {
      status,
      headers: {
        ...buildMcpCorsHeaders(),
        "WWW-Authenticate": wwwAuthenticate,
      },
    }
  );
}

async function handleRpcMessage(
  msg: JsonRpcRequest,
  caller: Extract<Awaited<ReturnType<typeof authenticateMcpRequest>>, { ok: true }>
): Promise<Record<string, unknown> | null> {
  const method = msg.method || "";
  const id = msg.id ?? null;
  const params = msg.params || {};

  // Notifications have no id and expect no JSON-RPC response body
  if (msg.id === undefined || method.startsWith("notifications/")) {
    return null;
  }

  if (method === "initialize") {
    const reqProto = typeof params.protocolVersion === "string" ? params.protocolVersion : "2025-03-26";
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: reqProto,
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
          prompts: { listChanged: false },
        },
        serverInfo: {
          name: "target-relocation-mcp-readonly",
          version: "1.0.0",
        },
        instructions:
          `Target Relocation CRM Read-Only MCP Server (autenticado como ${caller.member.full_name} / ${caller.member.email}). Todas as 30 tabelas de negócios (CRM, Radar DOU, Blog SEO, Placar SDR, Ads e Plano 30d) podem ser consultadas via get_database_schema, query_table, run_readonly_sql, search e fetch. Mutações e chaves de API são estritamente bloqueadas.`,
      },
    };
  }

  if (method === "ping") {
    return { jsonrpc: "2.0", id, result: {} };
  }

  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: { tools: MCP_TOOLS_DEFINITION },
    };
  }

  if (method === "tools/call") {
    const toolName = String(params.name || "");
    const toolArgs =
      params.arguments && typeof params.arguments === "object"
        ? (params.arguments as Record<string, unknown>)
        : {};
    const out = await executeMcpTool(caller, toolName, toolArgs);
    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: out.text }],
        ...(out.isError ? { isError: true } : {}),
      },
    };
  }

  if (method === "resources/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: { resources: MCP_RESOURCES_LIST },
    };
  }

  if (method === "resources/read") {
    const uri = String(params.uri || "");
    try {
      const contents = await readMcpResource(caller, uri);
      return { jsonrpc: "2.0", id, result: { contents } };
    } catch (e) {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: e instanceof Error ? e.message : String(e) },
      };
    }
  }

  if (method === "prompts/list") {
    return { jsonrpc: "2.0", id, result: { prompts: [] } };
  }

  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: buildMcpCorsHeaders() });
}

export async function GET(req: NextRequest) {
  const auth = await authenticateMcpRequest(req);
  if (!auth.ok) {
    return buildUnauthorized(auth.error, auth.status, auth.wwwAuthenticate);
  }

  return NextResponse.json(
    {
      name: "target-relocation-mcp-readonly",
      version: "1.0.0",
      protocolVersion: "2025-03-26",
      readOnly: true,
      authenticatedAs: {
        email: auth.member.email,
        name: auth.member.full_name,
        role: auth.member.role,
        authMode: auth.authMode,
      },
      toolsCount: MCP_TOOLS_DEFINITION.length,
    },
    { status: 200, headers: buildMcpCorsHeaders() }
  );
}

export async function DELETE() {
  return new NextResponse(null, { status: 200, headers: buildMcpCorsHeaders() });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateMcpRequest(req);
  if (!auth.ok) {
    return buildUnauthorized(auth.error, auth.status, auth.wwwAuthenticate);
  }

  try {
    const rawBody = (await req.json()) as JsonRpcRequest | JsonRpcRequest[];
    const sessionId = req.headers.get("mcp-session-id") || crypto.randomUUID();
    const baseHeaders = {
      ...buildMcpCorsHeaders(),
      "Mcp-Session-Id": sessionId,
    };

    if (Array.isArray(rawBody)) {
      const results = (await Promise.all(rawBody.map((m) => handleRpcMessage(m, auth)))).filter(Boolean);
      if (results.length === 0) {
        return new NextResponse(null, { status: 202, headers: baseHeaders });
      }
      return NextResponse.json(results, { status: 200, headers: baseHeaders });
    }

    const reply = await handleRpcMessage(rawBody, auth);
    if (!reply) {
      return new NextResponse(null, { status: 202, headers: baseHeaders });
    }
    return NextResponse.json(reply, { status: 200, headers: baseHeaders });
  } catch (err) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: `Parse/Execution error: ${String(err)}` },
      },
      { status: 400, headers: buildMcpCorsHeaders() }
    );
  }
}
