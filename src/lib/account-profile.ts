import type { User } from "@supabase/supabase-js";

export const ACCOUNT_ACCENTS = {
  amber: { label: "Âmbar", color: "#f59e0b", darkText: true },
  ocean: { label: "Oceano", color: "#2563eb", darkText: false },
  forest: { label: "Floresta", color: "#047857", darkText: false },
  plum: { label: "Ameixa", color: "#9333ea", darkText: false },
} as const;

export const START_TABS = {
  overview: "Visão Geral",
  pipelines: "Pipelines & Negócios",
  dou: "Radar DOU",
  activities: "Atividades & Cadência",
  ai_prompts: "Central de prompts",
} as const;

export type AccountTheme = "system" | "light" | "dark";
export type AccountAccent = keyof typeof ACCOUNT_ACCENTS;
export type AccountStartTab = keyof typeof START_TABS;

export interface AccountPreferences {
  displayName: string;
  accent: AccountAccent;
  theme: AccountTheme | null;
  startTab: AccountStartTab;
}

export function readAccountPreferences(value: unknown): AccountPreferences {
  const profile = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  return {
    displayName: typeof profile.displayName === "string" ? profile.displayName.trim().slice(0, 80) : "",
    accent: typeof profile.accent === "string" && Object.hasOwn(ACCOUNT_ACCENTS, profile.accent) ? profile.accent as AccountAccent : "amber",
    theme: profile.theme === "system" || profile.theme === "light" || profile.theme === "dark" ? profile.theme : null,
    startTab: typeof profile.startTab === "string" && Object.hasOwn(START_TABS, profile.startTab) ? profile.startTab as AccountStartTab : "overview",
  };
}

export function accountInitials(name: string) {
  const [first = "", ...rest] = name.trim().split(/\s+/);
  return `${first.charAt(0)}${rest.at(-1)?.charAt(0) || first.charAt(1)}`.toLocaleUpperCase("pt-BR") || "TR";
}

export function buildCrmUser(user: User, member: {
  full_name: string;
  email: string;
  role: string;
  crm_owner_name: string | null;
}) {
  return {
    id: user.id,
    name: member.full_name,
    email: user.email || member.email,
    pendingEmail: user.new_email || null,
    role: member.role,
    crmOwnerName: member.crm_owner_name,
    preferences: readAccountPreferences(user.user_metadata.target_profile),
  };
}
