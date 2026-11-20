import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const sp = req.nextUrl.searchParams;
    const onlyLocal = sp.get("only_local") === "true";
    const search = (sp.get("search") || "").trim();
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Math.max(10, Number(sp.get("limit") || 50)));

    let query = supabase.from("files").select("*", { count: "exact" });

    if (onlyLocal) {
      query = query.eq("has_local_file", 1);
    }
    if (search) {
      const s = search.replace(/[,()]/g, " ");
      query = query.or(`name.ilike.%${s}%,file_name.ilike.%${s}%,deal_name.ilike.%${s}%,org_name.ilike.%${s}%,person_name.ilike.%${s}%`);
    }

    const offset = (page - 1) * limit;
    const { data: files, count, error } = await query
      .order("has_local_file", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const total = count || 0;
    return NextResponse.json({
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      files: files || [],
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
