"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fireLeadConversion } from "@/components/analytics/marketing-pixels";

const CTA_COPY = {
  pt: {
    eyebrow: "Reunião Técnica com Especialista • RH & Global Mobility",
    heading: "Precisa validar elegibilidade e prazos no MTE antes de mover seu executivo?",
    sub: "Envie os dados básicos da operação. Sua solicitação é registrada para agendar diagnóstico técnico com Klaus Duailibi e time especializado.",
    namePh: "Seu nome completo *",
    companyPh: "Empresa / Multinacional",
    emailPh: "E-mail corporativo *",
    phonePh: "Telefone / WhatsApp",
    btnIdle: "Solicitar Diagnóstico Técnico",
    btnLoading: "Enviando solicitação...",
    errRequired: "Preencha seu nome e e-mail corporativo.",
    errGeneric: "Erro ao enviar solicitação.",
    doneTitle: (id: number) => `Diagnóstico registrado (#${id})!`,
    doneSub: "Nossa equipe entrará em contato em seguida para agendar a reunião.",
  },
  en: {
    eyebrow: "Technical Advisory • HR & Global Mobility",
    heading: "Need to validate visa eligibility and Ministry of Labor timelines before relocating your executive?",
    sub: "Share your basic project details to schedule a technical assessment with Klaus Duailibi and our immigration specialists.",
    namePh: "Full name *",
    companyPh: "Company / Multinational",
    emailPh: "Corporate email *",
    phonePh: "Phone / WhatsApp",
    btnIdle: "Request Technical Assessment",
    btnLoading: "Submitting request...",
    errRequired: "Please enter your name and corporate email.",
    errGeneric: "Failed to submit request.",
    doneTitle: (id: number) => `Request received (#${id})!`,
    doneSub: "Our specialist team will reach out shortly to schedule your consultation.",
  },
  es: {
    eyebrow: "Reunión Técnica con Especialista • RR. HH. y Movilidad Global",
    heading: "¿Necesitas validar elegibilidad y plazos ante el Ministerio de Trabajo antes de trasladar a tu ejecutivo?",
    sub: "Envía los datos básicos de tu operación para agendar un diagnóstico técnico con Klaus Duailibi y nuestro equipo.",
    namePh: "Nombre completo *",
    companyPh: "Empresa / Multinacional",
    emailPh: "Correo corporativo *",
    phonePh: "Teléfono / WhatsApp",
    btnIdle: "Solicitar Diagnóstico Técnico",
    btnLoading: "Enviando solicitud...",
    errRequired: "Completa tu nombre y correo corporativo.",
    errGeneric: "Error al enviar la solicitud.",
    doneTitle: (id: number) => `Diagnóstico registrado (#${id})!`,
    doneSub: "Nuestro equipo se pondrá en contacto en breve para agendar la reunión.",
  },
} as const;

export function BlogLeadCta({
  articleTitle,
  utmCampaign,
  locale = "pt",
}: {
  articleTitle: string;
  utmCampaign: string | null;
  locale?: "pt" | "en" | "es";
}) {
  const c = CTA_COPY[locale];
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [doneDealId, setDoneDealId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError(c.errRequired);
      return;
    }
    setLoading(true);
    try {
      const sp = new URLSearchParams(window.location.search);
      const res = await fetch("/api/public/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${company.trim() ? company.trim() + " — " : ""}Diagnóstico via Blog (${name.trim()})`,
          org_name: company.trim(),
          person_name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          service_interest: articleTitle,
          origin: `Blog (${locale.toUpperCase()})`,
          message: `Solicitação originada no artigo técnico: ${articleTitle}`,
          utm_source: sp.get("utm_source") || "blog_geo",
          utm_medium: sp.get("utm_medium") || "article_cta",
          utm_campaign: sp.get("utm_campaign") || utmCampaign || "blog_organico",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || c.errGeneric);
      fireLeadConversion("blog");
      setDoneDealId(json.lead?.deal_id || 1);
      setName("");
      setCompany("");
      setEmail("");
      setPhone("");
      window.location.href = `/obrigado?origem=blog_${locale}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : c.errGeneric);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-950 p-5 sm:p-6 text-white space-y-4">
      <div className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400">
          {c.eyebrow}
        </span>
        <h3 className="text-base sm:text-lg font-semibold tracking-tight">{c.heading}</h3>
        <p className="text-xs leading-relaxed text-zinc-400">{c.sub}</p>
      </div>

      {doneDealId ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3 text-xs text-emerald-300">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
          <div>
            <strong>{c.doneTitle(doneDealId)}</strong> {c.doneSub}
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder={c.namePh}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 bg-zinc-900 border-zinc-800 text-xs text-white placeholder:text-zinc-500"
          />
          <Input
            placeholder={c.companyPh}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="h-9 bg-zinc-900 border-zinc-800 text-xs text-white placeholder:text-zinc-500"
          />
          <Input
            type="email"
            placeholder={c.emailPh}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 bg-zinc-900 border-zinc-800 text-xs text-white placeholder:text-zinc-500"
          />
          <Input
            placeholder={c.phonePh}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-9 bg-zinc-900 border-zinc-800 text-xs text-white placeholder:text-zinc-500"
          />
          {error && <p className="sm:col-span-2 text-xs text-rose-400">{error}</p>}
          <div className="sm:col-span-2 flex justify-end">
            <Button
              type="submit"
              disabled={loading}
              className="h-9 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-medium px-5 cursor-pointer"
            >
              <Send className="mr-1.5 size-3.5" />
              {loading ? c.btnLoading : c.btnIdle}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
