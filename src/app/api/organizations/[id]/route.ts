import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureDatabaseSeeded } from "@/lib/importer";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSeeded();
    const { id } = await context.params;
    const orgId = Number(id);
    const db = getDb();
    const organization = db.prepare("SELECT * FROM organizations WHERE id = ?").get(orgId);
    if (!organization) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const deals = db.prepare("SELECT * FROM deals WHERE org_id = ? ORDER BY update_time DESC").all(orgId);
    const persons = db.prepare("SELECT * FROM persons WHERE org_id = ? ORDER BY name ASC").all(orgId);
    const notes = db.prepare("SELECT * FROM notes WHERE org_id = ? ORDER BY add_time DESC LIMIT 50").all(orgId);
    const files = db.prepare("SELECT * FROM files WHERE org_id = ? ORDER BY add_time DESC").all(orgId);

    return NextResponse.json({ organization, deals, persons, notes, files });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
