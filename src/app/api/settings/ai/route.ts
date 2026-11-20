import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireWorkspaceUser } from "@/lib/supabase/server";
import { resolveOpenAiClient } from "@/lib/openai";

export const dynamic = "force-dynamic";

function maskKey(k: string | null): string | null {
  if (!k) return null;
  if (k.length <= 10) return "sk-****";
  return `${k.slice(0, 7)}••••••${k.slice(-4)}`;
}

export async function GET() {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;

    const isAdmin = auth.member.role === "admin" || auth.member.role === "ops";
    const resolved = await resolveOpenAiClient(auth.supabase);

    let monthlyGoal = "16";
    if (isAdmin) {
      const { data: g } = await auth.supabase
        .from("workspace_settings")
        .select("value")
        .eq("key", "monthly_meeting_goal")
        .maybeSingle();
      if (g?.value) monthlyGoal = g.value;
    }

    return NextResponse.json({
      configured: Boolean(resolved.client),
      source: resolved.source,
      model: resolved.model,
      maskedKey: maskKey(resolved.apiKey),
      isAdmin,
      monthlyMeetingGoal: monthlyGoal,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;

    const isAdmin = auth.member.role === "admin" || auth.member.role === "ops";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Apenas Klaus (Admin) ou Felipe (Ops) podem alterar configurações de IA." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      action?: string;
      apiKey?: string;
      model?: string;
      monthlyMeetingGoal?: string;
    };
    const now = new Date().toISOString();

    if (body.action === "test") {
      const testKey = body.apiKey?.trim() || (await resolveOpenAiClient(auth.supabase)).apiKey;
      if (!testKey) {
        return NextResponse.json({ ok: false, error: "Nenhuma OpenAI API Key configurada." }, { status: 400 });
      }
      const client = new OpenAI({ apiKey: testKey });
      const res = await client.chat.completions.create({
        model: body.model || "gpt-4o-mini",
        max_tokens: 20,
        messages: [{ role: "user", content: "Responda apenas: TARGET_AI_OK" }],
      });
      return NextResponse.json({
        ok: true,
        reply: res.choices[0]?.message?.content?.trim() || "TARGET_AI_OK",
        model: res.model,
      });
    }

    const upserts: Array<{ key: string; value: string; updated_by: string; updated_at: string }> = [];
    if (body.apiKey !== undefined && body.apiKey.trim()) {
      upserts.push({
        key: "openai_api_key",
        value: body.apiKey.trim(),
        updated_by: auth.user!.id,
        updated_at: now,
      });
    }
    if (body.model && body.model.trim()) {
      upserts.push({
        key: "openai_model",
        value: body.model.trim(),
        updated_by: auth.user!.id,
        updated_at: now,
      });
    }
    if (body.monthlyMeetingGoal !== undefined) {
      upserts.push({
        key: "monthly_meeting_goal",
        value: String(body.monthlyMeetingGoal).trim() || "16",
        updated_by: auth.user!.id,
        updated_at: now,
      });
    }

    if (upserts.length > 0) {
      const { error } = await auth.supabase
        .from("workspace_settings")
        .upsert(upserts, { onConflict: "key" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const resolved = await resolveOpenAiClient(auth.supabase);
    return NextResponse.json({
      success: true,
      configured: Boolean(resolved.client),
      source: resolved.source,
      model: resolved.model,
      maskedKey: maskKey(resolved.apiKey),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
