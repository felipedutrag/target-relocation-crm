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
    const orgId = Number(id);

    const { data: organization } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .maybeSingle();
    if (!organization) {
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const [dealsRes, personsRes, notesRes, filesRes] = await Promise.all([
      supabase.from("deals").select("*").eq("org_id", orgId).order("update_time", { ascending: false }),
      supabase.from("persons").select("*").eq("org_id", orgId).order("name", { ascending: true }),
      supabase.from("notes").select("*").eq("org_id", orgId).order("add_time", { ascending: false }).limit(50),
      supabase.from("files").select("*").eq("org_id", orgId).order("add_time", { ascending: false }),
    ]);

    return NextResponse.json({
      organization,
      deals: dealsRes.data || [],
      persons: personsRes.data || [],
      notes: notesRes.data || [],
      files: filesRes.data || [],
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
