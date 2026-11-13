import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureDatabaseSeeded } from "@/lib/importer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseSeeded();
    const db = getDb();

    const services = db
      .prepare("SELECT * FROM services_catalog ORDER BY country ASC, category ASC, id ASC")
      .all();

    const rawProposals = db
      .prepare("SELECT * FROM proposals ORDER BY created_at DESC, id DESC")
      .all() as Array<Record<string, unknown>>;

    const proposals = rawProposals.map((p) => ({
      ...p,
      items: p.items_json ? JSON.parse(String(p.items_json)) : [],
    }));

    return NextResponse.json({ services, proposals });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const db = getDb();
    const body = (await req.json()) as Record<string, unknown>;
    const title = String(body.title || "").trim();
    if (!title) return NextResponse.json({ error: "Título da proposta obrigatório" }, { status: 400 });

    const items = Array.isArray(body.items) ? body.items : [];
    const discountAmount = Number(body.discount_amount || 0);
    const totalRaw = items.reduce((acc: number, it: Record<string, unknown>) => acc + Number(it.subtotal || 0), 0);
    const totalValue = Math.max(0, totalRaw - discountAmount);
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    const res = db
      .prepare(
        `INSERT INTO proposals (
          title, client_company, client_contact, client_email, client_phone,
          deal_id, org_id, person_id, country_route, currency, total_value, discount_amount,
          status, valid_days, items_json, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        title,
        String(body.client_company || ""),
        String(body.client_contact || ""),
        String(body.client_email || ""),
        String(body.client_phone || ""),
        body.deal_id ? Number(body.deal_id) : null,
        body.org_id ? Number(body.org_id) : null,
        body.person_id ? Number(body.person_id) : null,
        String(body.country_route || "Brasil"),
        String(body.currency || "BRL"),
        totalValue,
        discountAmount,
        String(body.status || "Rascunho"),
        Number(body.valid_days || 30),
        JSON.stringify(items),
        String(body.notes || "Validade 30 dias. Pagamento: 50% na contratação e 50% na conclusão."),
        now
      );

    // If linked to a deal with value 0, optionally update deal value
    if (body.deal_id && totalValue > 0) {
      db.prepare("UPDATE deals SET value = CASE WHEN value = 0 THEN ? ELSE value END, update_time = ? WHERE id = ?").run(
        totalValue,
        now,
        Number(body.deal_id)
      );
    }

    const created = db.prepare("SELECT * FROM proposals WHERE id = ?").get(Number(res.lastInsertRowid)) as Record<
      string,
      unknown
    >;
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
