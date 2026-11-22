import type { SupabaseClient } from "@supabase/supabase-js";

export const MIN_PUBLISH_WORDS = 1200;

function extractTokens(input: string): string[] {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !["como", "para", "sobre", "guia", "brasil", "pode", "quais", "qual", "onde", "quando"].includes(w));
}

export interface DuplicateCheckResult {
  duplicate: boolean;
  existing?: { id: number; slug: string; title: string; status: string };
  reason?: string;
}

/** Checks whether an existing blog_posts entry already covers the same topic or slug. */
export async function findDuplicateBlogPost(
  supabase: SupabaseClient,
  title: string,
  slug: string,
  excludeId?: number
): Promise<DuplicateCheckResult> {
  const { data: rows } = await supabase
    .from("blog_posts")
    .select("id, slug, title, status")
    .in("status", ["published", "approved", "ready_for_approval"]);

  if (!rows || rows.length === 0) return { duplicate: false };

  const targetTokens = new Set(extractTokens(title));

  for (const row of rows) {
    if (excludeId && row.id === excludeId) continue;
    if (slug && row.slug === slug) {
      return {
        duplicate: true,
        existing: row,
        reason: `Já existe um artigo com o mesmo slug (/${row.slug}).`,
      };
    }

    if (targetTokens.size >= 3) {
      const candidateTokens = new Set(extractTokens(String(row.title || "")));
      let overlap = 0;
      for (const tok of targetTokens) {
        if (candidateTokens.has(tok)) overlap += 1;
      }
      const ratio = overlap / Math.min(targetTokens.size, Math.max(candidateTokens.size, 1));
      if (overlap >= 3 && ratio >= 0.6) {
        return {
          duplicate: true,
          existing: row,
          reason: `Tema duplicado do artigo existente "${row.title}" (/${row.slug}).`,
        };
      }
    }
  }

  return { duplicate: false };
}
