"use client";

import { useState } from "react";
import { CheckCircle2, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BlogSiteChrome } from "@/components/blog/blog-site-chrome";
import { fireLeadConversion } from "@/components/analytics/marketing-pixels";

export interface AdLandingConfig {
  slug: string;
  badge: string;
  headline: string;
  subheadline: string;
  serviceInterest: string;
  bullets: Array<{ title: string; detail: string }>;
  complianceNote: string;
  ctaLabel: string;
  whatsappText: string;
}

export function AdLandingPage({ config }: { config: AdLandingConfig }) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError("Informe seu nome completo e e-mail corporativo.");
      return;
    }

    setSubmitting(true);
    try {
      const sp = new URLSearchParams(window.location.search);
      const titlePrefix = company.trim() ? `${company.trim()} — ` : "";
      const res = await fetch("/api/public/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${titlePrefix}${config.serviceInterest} (${name.trim()})`,
          org_name: company.trim(),
          person_name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          service_interest: config.serviceInterest,
          origin: sp.get("utm_source") || `LP /${config.slug}`,
          message: message.trim() || `Solicitação via página /${config.slug}`,
          utm_source: sp.get("utm_source") || "google_ads",
          utm_medium: sp.get("utm_medium") || "cpc",
          utm_campaign: sp.get("utm_campaign") || config.slug,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Não foi possível enviar sua solicitação.");

      fireLeadConversion(config.slug);
      window.location.href = `/obrigado?origem=${encodeURIComponent(config.slug)}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar solicitação.");
      setSubmitting(false);
    }
  }

  return (
    <BlogSiteChrome locale="pt">
      <section className="border-b border-zinc-200/80 bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 grid gap-10 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7 space-y-6">
            <Badge
              variant="outline"
              className="border-zinc-300 bg-zinc-50 text-zinc-800 font-mono text-[11px]"
            >
              {config.badge}
            </Badge>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] text-zinc-950 leading-[1.08]">
              {config.headline}
            </h1>
            <p className="text-base leading-relaxed text-zinc-600">{config.subheadline}</p>

            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              {config.bullets.map((b) => (
                <div
                  key={b.title}
                  className="rounded-xl border border-zinc-200/80 bg-[#FAFAFA] p-4 space-y-1.5"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-950">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    <span>{b.title}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-600">{b.detail}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 flex items-start gap-3 text-xs text-amber-950">
              <ShieldCheck className="size-4 shrink-0 text-amber-700 mt-0.5" />
              <p className="leading-relaxed">{config.complianceNote}</p>
            </div>

            <div className="pt-1">
              <a
                href={`https://wa.me/551125946276?text=${encodeURIComponent(config.whatsappText)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-medium text-zinc-800 hover:text-zinc-950 underline underline-offset-4"
              >
                <MessageCircle className="size-4 text-emerald-600" />
                Falar diretamente via WhatsApp +55 (11) 2594-6276
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 sm:p-7 shadow-[0_16px_44px_-16px_rgba(0,0,0,0.08)] space-y-4">
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Diagnóstico Técnico & Proposta B2B
                </span>
                <h2 className="text-lg font-semibold text-zinc-950">
                  Solicite atendimento com nossa equipe
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <Label htmlFor="ad-name" className="text-xs text-zinc-700">
                    Nome completo *
                  </Label>
                  <Input
                    id="ad-name"
                    required
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ad-company" className="text-xs text-zinc-700">
                    Empresa
                  </Label>
                  <Input
                    id="ad-company"
                    placeholder="Nome da empresa"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ad-email" className="text-xs text-zinc-700">
                    E-mail corporativo *
                  </Label>
                  <Input
                    id="ad-email"
                    type="email"
                    required
                    placeholder="nome@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ad-phone" className="text-xs text-zinc-700">
                    Telefone / WhatsApp
                  </Label>
                  <Input
                    id="ad-phone"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ad-msg" className="text-xs text-zinc-700">
                    Contexto da demanda
                  </Label>
                  <Textarea
                    id="ad-msg"
                    rows={3}
                    placeholder="Destino, tipo de visto, número de executivos ou prazo..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="text-xs"
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-medium cursor-pointer"
                >
                  <Send className="mr-2 size-3.5" />
                  {submitting ? "Enviando..." : config.ctaLabel}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </BlogSiteChrome>
  );
}
