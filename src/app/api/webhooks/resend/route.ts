import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      type?: string;
      data?: { email_id?: string; [k: string]: unknown };
    };
    const eventType = String(body.type || "").trim();
    const emailId = String(body.data?.email_id || "").trim();

    if (!eventType || !emailId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const supabase = createPublicClient();
    await supabase.rpc("apply_resend_webhook_event", {
      p_resend_email_id: emailId,
      p_event_type: eventType,
      p_payload: body.data || {},
    });

    return NextResponse.json({ ok: true, eventType, emailId });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
