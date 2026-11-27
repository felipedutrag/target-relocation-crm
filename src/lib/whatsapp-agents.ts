export const WHATSAPP_AGENTS = {
  anderley: "Anderley",
  aurea: "Áurea",
  sara: "Sara",
} as const;

export type WhatsAppAgent = keyof typeof WHATSAPP_AGENTS;

export function isWhatsAppAgent(value: string): value is WhatsAppAgent {
  return Object.hasOwn(WHATSAPP_AGENTS, value);
}
