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
        className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      };
    case "lost":
      return {
        label: "Perdido",
        className: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      };
    default:
      return {
        label: "Aberto",
        className: "bg-sky-500/15 text-sky-400 border-sky-500/30",
      };
  }
}

export function getLabelColorClass(color: string | null | undefined): string {
  switch (color) {
    case "purple":
      return "bg-purple-500/15 text-purple-300 border-purple-500/30";
    case "blue":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    case "green":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "yellow":
    case "orange":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "red":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    case "brown":
      return "bg-orange-900/30 text-orange-300 border-orange-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function getScoreColorClass(score: number | null | undefined): string {
  if (score === null || score === undefined) return "bg-muted text-muted-foreground border-border";
  if (score >= 60) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (score >= 40) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-rose-500/15 text-rose-400 border-rose-500/30";
}

export function buildWhatsappUrl(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const normalized = digits.startsWith("55") || digits.length > 11 ? digits : `55${digits}`;
  return `https://wa.me/${normalized}`;
}
