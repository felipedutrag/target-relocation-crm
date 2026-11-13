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
    const personId = Number(id);
    const db = getDb();
    const person = db.prepare("SELECT * FROM persons WHERE id = ?").get(personId);
    if (!person) return NextResponse.json({ error: "Pessoa não encontrada" }, { status: 404 });

    const deals = db.prepare("SELECT * FROM deals WHERE person_id = ? ORDER BY update_time DESC").all(personId);
    const notes = db.prepare("SELECT * FROM notes WHERE person_id = ? ORDER BY add_time DESC LIMIT 50").all(personId);
    const activities = db.prepare("SELECT * FROM activities WHERE person_id = ? ORDER BY due_date DESC").all(personId);
    const files = db.prepare("SELECT * FROM files WHERE person_id = ? ORDER BY add_time DESC").all(personId);
    const mailThreads = db.prepare("SELECT * FROM mail_threads WHERE linked_person_id = ?").all(personId);

    return NextResponse.json({ person, deals, notes, activities, files, mailThreads });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
