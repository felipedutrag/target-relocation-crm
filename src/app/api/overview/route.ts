import { NextResponse } from "next/server";
import { requireWorkspaceUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;

    const { data, error } = await auth.supabase.rpc("get_overview_dashboard");
    if (error) {
      console.error("GET /api/overview rpc error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/overview error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
