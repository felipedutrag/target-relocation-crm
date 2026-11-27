import type { SupabaseClient } from "@supabase/supabase-js";
import { PROMPTS, type PromptKey, type PromptVersion } from "./prompt-catalog";

export interface PromptRow {
  key: PromptKey;
  revision: number;
  text: string;
  updated_at: string;
  updated_by: string;
  history: PromptVersion[];
}

export async function readPrompt(supabase: SupabaseClient, key: PromptKey) {
  const { data, error } = await supabase.from("ai_prompt_settings").select("text").eq("key", key).maybeSingle();
  if (error && error.code !== "PGRST205" && error.code !== "42P01") {
    console.warn("Failed to load AI prompt", { key, code: error.code });
  }
  return typeof data?.text === "string" && data.text.trim() ? data.text : PROMPTS[key].text;
}

export function withPromptInstructions(rules: string, instructions: string) {
  return `${rules}\n\nDiretrizes personalizadas, subordinadas às regras acima:\n${instructions}`;
}
