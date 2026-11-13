import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getBackupRoot, getDb } from "@/lib/db";
import { ensureDatabaseSeeded, importUploadedDocument, runFullBackupImport } from "@/lib/importer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseSeeded();
    const db = getDb();

    const auditedFiles = db
      .prepare("SELECT * FROM imported_files_audit ORDER BY file_format ASC, file_size DESC")
      .all();
    const webhooks = db.prepare("SELECT * FROM webhooks ORDER BY id ASC").all();
    const savedFilters = db.prepare("SELECT * FROM saved_filters ORDER BY last_used_time DESC, id ASC").all();
    const users = db.prepare("SELECT * FROM users ORDER BY id ASC").all();
    const mailThreads = db.prepare("SELECT * FROM mail_threads ORDER BY id ASC").all();
    const fieldDefinitions = db
      .prepare("SELECT entity_type, COUNT(*) as count FROM field_definitions GROUP BY entity_type")
      .all();

    const logPath = path.join(getBackupRoot(), "backup-log.txt");
    const backupLog = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf-8") : "";

    const lastSync = db.prepare("SELECT value FROM app_meta WHERE key = 'last_sync_at'").get() as
      | { value: string }
      | undefined;

    return NextResponse.json({
      lastSyncAt: lastSync?.value || null,
      auditedFiles,
      webhooks,
      savedFilters,
      users,
      mailThreads,
      fieldDefinitions,
      backupLog,
    });
  } catch (error) {
    console.error("GET /api/import error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const files = formData.getAll("files") as File[];
      if (!files.length) {
        return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
      }
      const results = [];
      for (const file of files) {
        const arrBuf = await file.arrayBuffer();
        const res = await importUploadedDocument(file.name, Buffer.from(arrBuf));
        results.push(res);
      }
      return NextResponse.json({ success: true, mode: "upload", results });
    }

    const summary = await runFullBackupImport();
    return NextResponse.json({ success: true, mode: "full_sync", summary });
  } catch (error) {
    console.error("POST /api/import error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
