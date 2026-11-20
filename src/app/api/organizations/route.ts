import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const sp = req.nextUrl.searchParams;
    const search = (sp.get("search") || "").trim();
    const label = sp.get("label") || "";
    const owner = sp.get("owner") || "";
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Math.max(10, Number(sp.get("limit") || 30)));

    let query = supabase.from("organizations").select("*", { count: "exact" });

    if (search) {
      const s = search.replace(/[,()]/g, " ");
      query = query.or(`name.ilike.%${s}%,address.ilike.%${s}%,website.ilike.%${s}%,city.ilike.%${s}%`);
    }
    if (label && label !== "all") {
      query = query.ilike("label_name", `%${label}%`);
    }
    if (owner && owner !== "all") {
      query = query.eq("owner_name", owner);
    }

    const offset = (page - 1) * limit;
    const { data: rows, count, error } = await query
      .order("open_deals_count", { ascending: false })
      .order("notes_count", { ascending: false })
      .order("update_time", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const total = count || 0;
    return NextResponse.json({
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      labels: [],
      organizations: rows || [],
    });
  } catch (error) {
    console.error("GET /api/organizations error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const { data: created, error } = await supabase
      .from("organizations")
      .insert({
        name,
        owner_name: String(body.owner_name || auth.member.crm_owner_name || "Klaus"),
        label_name: body.label_name ? String(body.label_name) : null,
        address: body.address ? String(body.address) : null,
        website: body.website ? String(body.website) : null,
        linkedin: body.linkedin ? String(body.linkedin) : null,
        add_time: now,
        update_time: now,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, organization: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
