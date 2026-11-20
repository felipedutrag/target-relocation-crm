import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const sp = req.nextUrl.searchParams;
    const days = Math.min(365, Math.max(1, Number(sp.get("days") || 30)));
    const path = sp.get("path")?.trim() || null;
    const device = sp.get("device")?.trim() || "all";
    const heatmapPath = sp.get("heatmap_path")?.trim() || path || "/";
    const heatmapInteraction = sp.get("interaction")?.trim() || "click";

    const [dashRes, heatRes] = await Promise.all([
      supabase.rpc("get_analytics_dashboard", {
        p_days: days,
        p_path: path,
        p_device: device,
      }),
      supabase.rpc("get_heatmap_data", {
        p_path: heatmapPath,
        p_device: device,
        p_interaction: heatmapInteraction,
        p_days: days,
      }),
    ]);

    if (dashRes.error) {
      return NextResponse.json({ error: dashRes.error.message }, { status: 500 });
    }
    if (heatRes.error) {
      return NextResponse.json({ error: heatRes.error.message }, { status: 500 });
    }

    return NextResponse.json({
      days,
      device,
      dashboard: dashRes.data || {},
      heatmap: heatRes.data || {},
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
