import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizationServerMetadata, buildMcpCorsHeaders, getPublicOrigin } from "@/lib/mcp-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = getPublicOrigin(req);
  return NextResponse.json(buildAuthorizationServerMetadata(origin), {
    headers: buildMcpCorsHeaders(),
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: buildMcpCorsHeaders() });
}
