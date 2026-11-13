import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getBackupRoot, getDb } from "@/lib/db";
import { ensureDatabaseSeeded } from "@/lib/importer";

export const dynamic = "force-dynamic";

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSeeded();
    const { id } = await context.params;
    const fileId = Number(id);
    if (Number.isNaN(fileId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const db = getDb();
    const row = db.prepare("SELECT * FROM files WHERE id = ?").get(fileId) as
      | { local_filename?: string; name?: string; file_type?: string }
      | undefined;

    const arquivosDir = path.join(getBackupRoot(), "api-2026-09-28", "arquivos");
    let targetPath: string | null = null;
    let displayName = row?.name || `arquivo-${fileId}`;

    if (row?.local_filename) {
      const candidate = path.join(arquivosDir, row.local_filename);
      if (fs.existsSync(candidate)) targetPath = candidate;
    }

    if (!targetPath && fs.existsSync(arquivosDir)) {
      const found = fs.readdirSync(arquivosDir).find((f) => f.startsWith(`${fileId}__`));
      if (found) {
        targetPath = path.join(arquivosDir, found);
        displayName = found.slice(String(fileId).length + 2);
      }
    }

    if (!targetPath) {
      return NextResponse.json(
        { error: "Arquivo não disponível localmente (apenas referência remota no Pipedrive)" },
        { status: 404 }
      );
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    const download = req.nextUrl.searchParams.get("download") === "1";
    const buf = fs.readFileSync(targetPath);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(displayName)}`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
