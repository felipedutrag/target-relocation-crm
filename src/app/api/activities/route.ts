import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const sp = req.nextUrl.searchParams;
    const doneParam = sp.get("done") || "all";
    const type = sp.get("type") || "all";
    const period = sp.get("period") || "all";
    const owner = sp.get("owner") || "all";
    const search = (sp.get("search") || "").trim();
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Math.max(10, Number(sp.get("limit") || 40)));

    let query = supabase.from("activities").select("*", { count: "exact" });

    if (doneParam === "0" || doneParam === "pending") {
      query = query.eq("done", 0);
    } else if (doneParam === "1" || doneParam === "completed") {
      query = query.eq("done", 1);
    }
    if (type && type !== "all") {
      query = query.eq("type", type);
    }
    if (period && period !== "all") {
      query = query.eq("cadence_period", period);
    }
    if (owner && owner !== "all") {
      query = query.eq("owner_name", owner);
    }
    if (search) {
      const s = search.replace(/[,()]/g, " ");
      query = query.or(
        `subject.ilike.%${s}%,deal_title.ilike.%${s}%,person_name.ilike.%${s}%,org_name.ilike.%${s}%,note.ilike.%${s}%`
      );
    }

    const offset = (page - 1) * limit;
    const [rowsRes, summaryRes] = await Promise.all([
      query
        .order("done", { ascending: true })
        .order("due_date", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .range(offset, offset + limit - 1),
      supabase.rpc("get_activities_summary"),
    ]);

    if (rowsRes.error) return NextResponse.json({ error: rowsRes.error.message }, { status: 500 });

    const total = rowsRes.count || 0;
    return NextResponse.json({
      summary: summaryRes.data || { total: 0, pending: 0, completed: 0, auto_cadence: 0, manha: 0, tarde: 0 },
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      activities: rowsRes.data || [],
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const body = (await req.json()) as { id: number; done: boolean };
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const doneVal = body.done ? 1 : 0;

    const { error } = await supabase
      .from("activities")
      .update({
        done: doneVal,
        marked_as_done_time: doneVal === 1 ? now : "",
        update_time: now,
      })
      .eq("id", Number(body.id));

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const body = (await req.json()) as Record<string, unknown>;
    const subject = String(body.subject || "").trim();
    if (!subject) return NextResponse.json({ error: "Assunto obrigatório" }, { status: 400 });

    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const typeMap: Record<string, string> = {
      call: "Chamada",
      task: "Tarefa",
      meeting: "Reunião",
      deadline: "Prazo",
      email: "E-mail",
      lunch: "Almoço",
    };
    const typeKey = String(body.type || "task");

    const { data: created, error } = await supabase
      .from("activities")
      .insert({
        subject,
        type: typeKey,
        type_name: typeMap[typeKey] || "Tarefa",
        done: 0,
        due_date: String(body.due_date || now.slice(0, 10)),
        due_time: String(body.due_time || "09:00"),
        deal_id: body.deal_id ? Number(body.deal_id) : null,
        deal_title: body.deal_title ? String(body.deal_title) : null,
        person_name: body.person_name ? String(body.person_name) : null,
        org_name: body.org_name ? String(body.org_name) : null,
        owner_name: String(body.owner_name || auth.member.crm_owner_name || "Klaus"),
        note: body.note ? String(body.note) : null,
        cadence_period: String(body.cadence_period || "GERAL"),
        is_auto_cadence: 0,
        add_time: now,
        update_time: now,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, activity: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
