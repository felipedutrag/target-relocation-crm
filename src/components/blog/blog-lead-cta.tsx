"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BlogLeadCta({
  articleTitle,
  utmCampaign,
}: {
  articleTitle: string;
  utmCampaign: string | null;
}) {
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
      setError("Preencha seu nome e e-mail corporativo.");
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
          origin: "Site GEO/Blog",
          message: `Solicitação originada no artigo técnico: ${articleTitle}`,
          utm_source: sp.get("utm_source") || "blog_geo",
          utm_medium: sp.get("utm_medium") || "article_cta",
          utm_campaign: sp.get("utm_campaign") || utmCampaign || "blog_organico",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao registrar diagnóstico.");
      setDoneDealId(json.lead?.deal_id || 1);
      setName("");
      setCompany("");
      setEmail("");
      setPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar solicitação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-950 p-6 sm:p-8 text-white space-y-4">
      <div className="space-y-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-amber-400">
          Reunião Técnica com Especialista • RH & Global Mobility
        </span>
        <h3 className="text-xl font-semibold tracking-tight">
          Precisa validar elegibilidade e prazos no MTE antes de mover seu executivo?
        </h3>
        <p className="text-xs leading-relaxed text-zinc-400">
          Envie os dados básicos da operação. Sua solicitação cai direto no CRM da Target Relocation com
          atendimento inicial imediato para agendar diagnóstico com Klaus Duailibi e time técnico.
        </p>
      </div>

      {doneDealId ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3 text-xs text-emerald-300">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
          <div>
            <strong>Diagnóstico registrado (#{doneDealId})!</strong> Nossa equipe entrará em contato em seguida para
            agendar a reunião com seu RH.
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Seu nome completo *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 bg-zinc-900 border-zinc-800 text-xs text-white placeholder:text-zinc-500"
          />
          <Input
            placeholder="Empresa / Multinacional"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="h-9 bg-zinc-900 border-zinc-800 text-xs text-white placeholder:text-zinc-500"
          />
          <Input
            type="email"
            placeholder="E-mail corporativo *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 bg-zinc-900 border-zinc-800 text-xs text-white placeholder:text-zinc-500"
          />
          <Input
            placeholder="Telefone / WhatsApp"
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
              {loading ? "Registrando no CRM..." : "Solicitar Diagnóstico Técnico"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
