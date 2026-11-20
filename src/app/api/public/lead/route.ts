import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Título ou nome do contato obrigatório" }, { status: 400 });
    }

    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("submit_landing_lead", {
      p_title: title,
      p_org_name: String(body.org_name || ""),
      p_person_name: String(body.person_name || ""),
      p_email: String(body.email || ""),
      p_phone: String(body.phone || ""),
      p_service_interest: String(body.service_interest || ""),
      p_message: String(body.message || ""),
      p_origin: String(body.origin || "Site"),
      p_utm_source: body.utm_source ? String(body.utm_source) : null,
      p_utm_medium: body.utm_medium ? String(body.utm_medium) : null,
      p_utm_campaign: body.utm_campaign ? String(body.utm_campaign) : null,
    });

    if (error) {
      console.error("POST /api/public/lead error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
