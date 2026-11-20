import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireWorkspaceUser();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const [servicesRes, proposalsRes] = await Promise.all([
      supabase
        .from("services_catalog")
        .select("*")
        .order("country", { ascending: true })
        .order("category", { ascending: true })
        .order("id", { ascending: true }),
      supabase
        .from("proposals")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }),
    ]);

    const proposals = (proposalsRes.data || []).map((p) => ({
      ...p,
      items: p.items_json ? JSON.parse(String(p.items_json)) : [],
    }));

    return NextResponse.json({ services: servicesRes.data || [], proposals });
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
    const title = String(body.title || "").trim();
    if (!title) return NextResponse.json({ error: "Título da proposta obrigatório" }, { status: 400 });

    const items = Array.isArray(body.items) ? body.items : [];
    const discountAmount = Number(body.discount_amount || 0);
    const totalRaw = items.reduce((acc: number, it: Record<string, unknown>) => acc + Number(it.subtotal || 0), 0);
    const totalValue = Math.max(0, totalRaw - discountAmount);
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    const { data: created, error } = await supabase
      .from("proposals")
      .insert({
        title,
        client_company: String(body.client_company || ""),
        client_contact: String(body.client_contact || ""),
        client_email: String(body.client_email || ""),
        client_phone: String(body.client_phone || ""),
        deal_id: body.deal_id ? Number(body.deal_id) : null,
        org_id: body.org_id ? Number(body.org_id) : null,
        person_id: body.person_id ? Number(body.person_id) : null,
        country_route: String(body.country_route || "Brasil"),
        currency: String(body.currency || "BRL"),
        total_value: totalValue,
        discount_amount: discountAmount,
        status: String(body.status || "Rascunho"),
        valid_days: Number(body.valid_days || 30),
        items_json: JSON.stringify(items),
        notes: String(body.notes || "Validade 30 dias. Pagamento: 50% na contratação e 50% na conclusão."),
        created_at: now,
      })
      .select("*")
      .single();

    if (error || !created) return NextResponse.json({ error: error?.message || "Erro" }, { status: 500 });

    if (body.deal_id && totalValue > 0) {
      const { data: existingDeal } = await supabase
        .from("deals")
        .select("value")
        .eq("id", Number(body.deal_id))
        .maybeSingle();
      if (existingDeal && Number(existingDeal.value || 0) === 0) {
        await supabase
          .from("deals")
          .update({ value: totalValue, update_time: now })
          .eq("id", Number(body.deal_id));
      }
    }

    return NextResponse.json(
      {
        success: true,
        proposal: {
          ...created,
          items: created.items_json ? JSON.parse(String(created.items_json)) : [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
