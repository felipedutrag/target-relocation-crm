import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const { id } = await context.params;
    const personId = Number(id);

    const { data: person } = await supabase.from("persons").select("*").eq("id", personId).maybeSingle();
    if (!person) return NextResponse.json({ error: "Pessoa não encontrada" }, { status: 404 });

    const [dealsRes, notesRes, actRes, filesRes, mailRes] = await Promise.all([
      supabase.from("deals").select("*").eq("person_id", personId).order("update_time", { ascending: false }),
      supabase.from("notes").select("*").eq("person_id", personId).order("add_time", { ascending: false }).limit(50),
      supabase.from("activities").select("*").eq("person_id", personId).order("due_date", { ascending: false }),
      supabase.from("files").select("*").eq("person_id", personId).order("add_time", { ascending: false }),
      supabase.from("mail_threads").select("*").eq("linked_person_id", personId),
    ]);

    return NextResponse.json({
      person,
      deals: dealsRes.data || [],
      notes: notesRes.data || [],
      activities: actRes.data || [],
      files: filesRes.data || [],
      mailThreads: mailRes.data || [],
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
