export function formatMoney(value: number | null | undefined, currency = "BRL"): string {
  const num = Number(value || 0);
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(num);
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatBytes(bytes: number | null | undefined): string {
  const b = Number(bytes || 0);
  if (b === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(dt: string | null | undefined): string {
  if (!dt) return "—";
  const clean = dt.replace("T", " ").slice(0, 16);
  const [datePart, timePart] = clean.split(" ");
  if (!datePart) return dt;
  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return dt;
  return timePart ? `${d}/${m}/${y} ${timePart}` : `${d}/${m}/${y}`;
}

export function getStatusBadgeVariant(status: string): {
  label: string;
  className: string;
} {
  switch (status) {
    case "won":
      return {
        label: "Ganho",
        className:
          "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
      };
    case "lost":
      return {
        label: "Perdido",
        className:
          "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40",
      };
    default:
      return {
        label: "Aberto",
        className:
          "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40",
      };
  }
}

export function getLabelColorClass(color: string | null | undefined): string {
  switch (color) {
    case "purple":
      return "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-500/40";
    case "blue":
      return "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/40";
    case "green":
      return "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/40";
    case "yellow":
    case "orange":
      return "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40";
    case "red":
      return "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-500/40";
    case "brown":
      return "bg-amber-200/80 text-amber-950 border-amber-400 dark:bg-orange-500/25 dark:text-orange-200 dark:border-orange-500/45";
    default:
      return "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700";
  }
}

export function getScoreColorClass(score: number | null | undefined): string {
  if (score === null || score === undefined) {
    return "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  }
  if (score >= 60) {
    return "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40";
  }
  if (score >= 40) {
    return "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40";
  }
  return "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40";
}

export function buildWhatsappUrl(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const normalized = digits.startsWith("55") || digits.length > 11 ? digits : `55${digits}`;
  return `https://wa.me/${normalized}`;
}
