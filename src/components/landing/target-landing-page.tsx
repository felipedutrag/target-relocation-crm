"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  Compass,
  FileCheck2,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Home,
  LayoutDashboard,
  LogIn,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  PawPrint,
  Phone,
  Scale,
  Send,
  ShieldCheck,
  Star,
  Truck,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceCatalogItem } from "@/components/crm/types";
import type { LandingBlogPreview } from "@/lib/blog-queries";
import { formatMoney } from "@/components/crm/utils";
import { CATALOG_SERVICES_SEED } from "@/lib/catalog-seed";
import {
  LANDING_COPY,
  LANDING_LOCALES,
  type LandingLocale,
} from "@/components/landing/landing-translations";

interface TargetLandingPageProps {
  onEnterCrm: (initialDealId?: number) => void;
  onOpenLogin: () => void;
  latestBlogPosts?: LandingBlogPreview[];
}

const PILLAR_ICONS = [BadgeCheck, Globe2, HeartHandshake] as const;

const SERVICE_ICONS = [
  FileCheck2,
  Scale,
  Award,
  Users,
  Briefcase,
  Truck,
  PawPrint,
  Home,
] as const;

const PROCESS_ICONS = [
  Compass,
  FileCheck2,
  Home,
  GraduationCap,
  Globe2,
  ShieldCheck,
] as const;

function formatPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function LanguageSwitcher({
  locale,
  onChange,
  ariaLabel,
  compact = false,
}: {
  locale: LandingLocale;
  onChange: (next: LandingLocale) => void;
  ariaLabel: string;
  compact?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center rounded-lg border border-zinc-200/90 bg-zinc-100/80 p-0.5"
    >
      <Globe2 className="ml-1.5 mr-1 size-3 text-zinc-400 shrink-0 hidden sm:block" />
      {LANDING_LOCALES.map((loc) => {
        const active = locale === loc.code;
        return (
          <button
            key={loc.code}
            type="button"
            onClick={() => onChange(loc.code)}
            aria-pressed={active}
            title={loc.label}
            className={`rounded-md px-2 py-1 font-mono text-[11px] font-medium transition-all cursor-pointer ${
              active
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {compact ? loc.short : loc.short}
          </button>
        );
      })}
    </div>
  );
}

export function TargetLandingPage({ onEnterCrm, onOpenLogin, latestBlogPosts = [] }: TargetLandingPageProps) {
  const [locale, setLocale] = useState<LandingLocale>("en");
  const [heroIndex, setHeroIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [catalogCountry, setCatalogCountry] = useState("Brasil");
  const [catalog] = useState<ServiceCatalogItem[]>(() =>
    CATALOG_SERVICES_SEED.map((s, idx) => ({ id: idx + 1, ...s }))
  );

  // CRM-integrated contact form state
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("visas");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdDealId, setCreatedDealId] = useState<number | null>(null);

  const t = LANDING_COPY[locale];

  useEffect(() => {
    document.documentElement.lang = t.htmlLang;
  }, [t.htmlLang]);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % t.hero.modes.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [t.hero.modes.length]);

  const currentHero = t.hero.modes[heroIndex] ?? t.hero.modes[0];
  const selectedServiceOption =
    t.contact.serviceOptions.find((opt) => opt.id === serviceId) ?? t.contact.serviceOptions[0];

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!name.trim() || !email.trim()) {
      setSubmitError(t.contact.validationError);
      return;
    }

    setSubmitting(true);
    try {
      const sp = new URLSearchParams(window.location.search);
      const titleCompany = company.trim() ? `${company.trim()} — ` : "";
      const res = await fetch("/api/public/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${titleCompany}${selectedServiceOption.crmTitle} (${name.trim()})`,
          org_name: company.trim() || "",
          person_name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          service_interest: selectedServiceOption.label,
          origin: sp.get("utm_source") || t.contact.originTag,
          message: message.trim(),
          utm_source: sp.get("utm_source"),
          utm_medium: sp.get("utm_medium"),
          utm_campaign: sp.get("utm_campaign"),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || t.contact.submitErrorFallback);
      }
      setCreatedDealId(json.lead?.deal_id ?? json.id ?? null);
      setName("");
      setCompany("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t.contact.submitErrorFallback);
    } finally {
      setSubmitting(false);
    }
  };

  const countryServices = catalog
    .filter((item) => {
      if (catalogCountry === "Brasil") return item.country === "Brasil";
      if (catalogCountry === "México / EUA")
        return item.country.includes("México") || item.country.includes("EUA");
      return item.country === catalogCountry;
    })
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900">
      {/* PURE WHITE HEADER BAR (Seamlessly frames the white-background Target Logo) */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <a href="#inicio" className="flex items-center shrink-0">
              <img
                src="/target-logo.png"
                alt="Target Relocation"
                className="h-9 w-auto object-contain"
              />
            </a>
            <Separator orientation="vertical" className="hidden md:block h-5 bg-zinc-200" />
            <nav className="hidden lg:flex items-center gap-5 text-[13px] font-medium text-zinc-600">
              <a href="#servicos" className="hover:text-zinc-950 transition-colors">
                {t.nav.solutions}
              </a>
              <a href="#catalogo" className="hover:text-zinc-950 transition-colors">
                {t.nav.catalog}
              </a>
              <a href="#etapas" className="hover:text-zinc-950 transition-colors">
                {t.nav.process}
              </a>
              <a href="#sobre" className="hover:text-zinc-950 transition-colors">
                {t.nav.about}
              </a>
              <a href="/blog" className="hover:text-zinc-950 transition-colors">
                {t.nav.insights}
              </a>
              <a href="#faq" className="hover:text-zinc-950 transition-colors">
                {t.nav.faq}
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="tel:+551125946276"
              className="hidden xl:inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 hover:text-zinc-900 mr-1"
            >
              <Phone className="size-3" />
              (11) 2594-6276
            </a>

            <LanguageSwitcher
              locale={locale}
              onChange={setLocale}
              ariaLabel={t.nav.languageLabel}
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenLogin}
              className="hidden sm:inline-flex h-8 rounded-lg px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer"
            >
              <LogIn className="mr-1.5 size-3.5" />
              {t.nav.login}
            </Button>
            <Button
              size="sm"
              onClick={() => onEnterCrm()}
              className="h-8 rounded-lg bg-zinc-950 px-3.5 text-xs font-medium text-white hover:bg-zinc-800 cursor-pointer shadow-xs"
            >
              <span>{t.nav.accessCrm}</span>
              <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="lg:hidden size-8 text-zinc-700"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-zinc-200 bg-white px-4 py-3 lg:hidden space-y-3">
            <div className="flex flex-col gap-2 text-xs font-medium text-zinc-600">
              {t.nav.mobileLinks.map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1.5 hover:text-zinc-950"
                >
                  {label}
                </a>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-zinc-100 pt-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin();
                }}
                className="h-8 rounded-lg text-xs"
              >
                <LogIn className="mr-1.5 size-3.5" />
                {t.nav.login}
              </Button>
              <LanguageSwitcher
                locale={locale}
                onChange={setLocale}
                ariaLabel={t.nav.languageLabel}
                compact
              />
            </div>
          </div>
        )}
      </header>

      {/* LINEAR-STYLE HERO SECTION */}
      <section id="inicio" className="relative overflow-hidden border-b border-zinc-200/80 bg-white">
        <div className="bg-linear-grid pointer-events-none absolute inset-0 opacity-70" />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-80"
          style={{
            background:
              "radial-gradient(50% 60% at 50% 0%, rgba(242, 154, 73, 0.10), transparent 100%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 lg:pt-20 lg:pb-24">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <button
              type="button"
              onClick={() => setHeroIndex((prev) => (prev + 1) % t.hero.modes.length)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-300 transition-colors cursor-pointer"
            >
              <span className="size-1.5 rounded-full bg-amber-500" />
              <span>{currentHero.tag}</span>
              <span className="text-zinc-400">•</span>
              <span className="font-mono text-[11px] text-zinc-500">{t.hero.locationTag}</span>
            </button>

            <h1 className="text-4xl font-semibold tracking-[-0.035em] text-zinc-950 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.06]">
              {currentHero.title}
            </h1>

            <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-[17px]">
              {currentHero.description}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <a
                href="#contato"
                className={buttonVariants({
                  size: "lg",
                  className:
                    "h-10 rounded-lg bg-zinc-950 px-5 text-[13px] font-medium text-white hover:bg-zinc-800 shadow-xs",
                })}
              >
                {currentHero.cta}
                <ArrowRight className="ml-2 size-3.5" />
              </a>
              <a
                href={t.hero.whatsappHref}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({
                  size: "lg",
                  variant: "ghost",
                  className: "h-10 rounded-lg px-4 text-[13px] font-medium text-zinc-600 hover:text-zinc-950",
                })}
              >
                <MessageCircle className="mr-1.5 size-3.5 text-emerald-600" />
                {t.hero.whatsappLabel}
              </a>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              {t.hero.modes.map((m, idx) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setHeroIndex(idx)}
                  aria-label={m.tag}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === heroIndex ? "w-8 bg-zinc-900" : "w-2 bg-zinc-300 hover:bg-zinc-400"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 3 Architectural Pillars */}
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {t.pillars.map((pillar, idx) => {
              const Icon = PILLAR_ICONS[idx] ?? BadgeCheck;
              return (
                <div
                  key={pillar.code}
                  className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800">
                      <Icon className="size-4" />
                    </div>
                    <span className="font-mono text-[11px] text-zinc-400">{pillar.code}</span>
                  </div>
                  <h2 className="text-sm font-semibold text-zinc-950">{pillar.title}</h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TRUSTED COMPANIES STRIP */}
      <section className="border-b border-zinc-200/80 bg-[#FAFAFA] py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              {t.trusted.eyebrow}
            </span>
            <span className="font-mono text-[11px] text-zinc-500">{t.trusted.counter}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {t.trusted.companies.map((c) => (
              <div
                key={c.name}
                className="flex flex-col justify-center rounded-lg border border-zinc-200/80 bg-white px-3.5 py-3 hover:border-zinc-300 transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                  <Building2 className="size-3.5 text-zinc-400" />
                  <span className="truncate">{c.name}</span>
                </div>
                <div className="mt-0.5 truncate text-[11px] text-zinc-500">{c.sector}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENTO PORTFOLIO OF 8 SOLUTIONS */}
      <section id="servicos" className="py-16 lg:py-20 bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div className="max-w-2xl space-y-2">
              <Badge
                variant="outline"
                className="border-zinc-300 bg-white text-zinc-700 font-mono text-[11px]"
              >
                {t.services.badge}
              </Badge>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-4xl">
                {t.services.title}
              </h2>
              <p className="text-sm text-zinc-600 leading-relaxed">{t.services.subtitle}</p>
            </div>
            <a
              href="#contato"
              className={buttonVariants({
                size: "sm",
                className: "h-9 rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 px-4 text-xs shrink-0",
              })}
            >
              {t.services.cta}
              <ArrowRight className="ml-1.5 size-3.5" />
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.services.items.map((svc, idx) => {
              const Icon = SERVICE_ICONS[idx] ?? FileCheck2;
              return (
                <Card
                  key={svc.tag}
                  className="border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-zinc-400 transition-colors"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800">
                        <Icon className="size-4" />
                      </div>
                      <span className="font-mono text-[10px] font-medium text-zinc-400">
                        {svc.tag}
                      </span>
                    </div>
                    <CardTitle className="pt-2.5 text-sm font-semibold text-zinc-950">
                      {svc.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-relaxed text-zinc-600">{svc.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* MULTI-COUNTRY CATALOG */}
      <section id="catalogo" className="border-y border-zinc-200/80 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div className="space-y-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                {t.catalog.eyebrow}
              </span>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950">
                {t.catalog.title}
              </h2>
              <p className="text-sm text-zinc-600">{t.catalog.subtitle}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEnterCrm()}
              className="h-8 rounded-lg border-zinc-200 text-xs font-medium cursor-pointer"
            >
              {t.catalog.openProposalsBtn}
            </Button>
          </div>

          <Tabs
            value={catalogCountry}
            onValueChange={(v) => setCatalogCountry(v ?? "Brasil")}
            className="space-y-5"
          >
            <TabsList className="bg-zinc-100 p-1">
              <TabsTrigger value="Brasil" className="text-xs">
                {t.catalog.tabs.br}
              </TabsTrigger>
              <TabsTrigger value="México / EUA" className="text-xs">
                {t.catalog.tabs.mxUs}
              </TabsTrigger>
              <TabsTrigger value="Argentina" className="text-xs">
                {t.catalog.tabs.ar}
              </TabsTrigger>
              <TabsTrigger value="Chile" className="text-xs">
                {t.catalog.tabs.cl}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={catalogCountry} className="mt-0">
              {countryServices.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-xs text-zinc-600">
                  {t.catalog.emptyPrefix}
                  <strong>{t.catalog.emptyBold}</strong>
                  {t.catalog.emptySuffix}
                </div>
              ) : (
                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {countryServices.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-[#FAFAFA] p-4 hover:border-zinc-300 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-white border border-zinc-200 text-zinc-700 text-[10px]"
                          >
                            {item.category}
                          </Badge>
                          <span className="font-mono text-[11px] text-zinc-400">{item.code}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-950">{item.name}</h3>
                        <p className="text-xs text-zinc-600 line-clamp-3">
                          {item.description || item.scope}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-zinc-200/80 pt-3">
                        <span className="text-[11px] text-zinc-500">{item.unit}</span>
                        <span className="font-mono text-xs font-semibold text-zinc-950 tabular-nums">
                          {item.price ? formatMoney(item.price, item.currency) : t.catalog.onRequest}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* PROCESS STEPS (LINEAR ARCHITECTURAL TIMELINE) */}
      <section id="etapas" className="bg-zinc-950 text-zinc-100 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl space-y-2 mb-10">
            <span className="font-mono text-[11px] uppercase tracking-wider text-amber-400">
              {t.process.eyebrow}
            </span>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
              {t.process.title}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{t.process.subtitle}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {t.process.steps.map((st, idx) => {
              const Icon = PROCESS_ICONS[idx] ?? Compass;
              return (
                <div
                  key={st.step}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-sm font-semibold text-amber-400">
                      {t.process.stepPrefix} {st.step}
                    </span>
                    <div className="flex size-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300">
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1.5">{st.title}</h3>
                  <p className="text-xs leading-relaxed text-zinc-400">{st.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ABOUT, PARTNERSHIPS & TESTIMONIALS */}
      <section id="sobre" className="py-16 lg:py-20 bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-16">
          <div className="grid gap-10 lg:grid-cols-12 items-start">
            <div className="lg:col-span-6 space-y-4">
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                {t.about.eyebrow}
              </span>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-3xl">
                {t.about.title}
              </h2>
              <p className="text-sm leading-relaxed text-zinc-600">{t.about.description}</p>
              <div className="flex flex-wrap gap-2.5 pt-2">
                <a
                  href="#contato"
                  className={buttonVariants({
                    size: "sm",
                    className: "h-9 rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 px-4 text-xs",
                  })}
                >
                  {t.about.ctaSpecialist}
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenLogin}
                  className="h-9 rounded-lg border-zinc-200 bg-white px-4 text-xs cursor-pointer"
                >
                  {t.about.ctaPortal}
                </Button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-xl border border-zinc-200/80 bg-white p-6 space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {t.about.partnersEyebrow}
                  </div>
                  <h3 className="text-base font-semibold text-zinc-950 mt-1">
                    {t.about.partnersTitle}
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {t.about.partners.map((p) => (
                    <div
                      key={p.org}
                      className="flex items-start gap-3 rounded-lg border border-zinc-200/70 bg-zinc-50/70 p-3"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      <div>
                        <div className="text-xs font-semibold text-zinc-900">{p.org}</div>
                        <div className="text-[11px] text-zinc-600">{p.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {t.about.testimonials.map((item) => (
              <div
                key={item.author}
                className="flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-white p-5 space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-700">“{item.quote}”</p>
                </div>
                <div className="border-t border-zinc-100 pt-3">
                  <div className="text-xs font-semibold text-zinc-900">{item.author}</div>
                  <div className="text-[11px] text-zinc-500">{item.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BLOG INSIGHTS */}
      <section id="blog" className="border-y border-zinc-200/80 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                {t.blog.eyebrow}
              </span>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950">
                {t.blog.title}
              </h2>
            </div>
            <a
              href={locale === "en" ? "/en/blog" : locale === "es" ? "/es/blog" : "/blog"}
              className="text-xs font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-600"
            >
              {t.blog.viewAll}
            </a>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {latestBlogPosts.length > 0
              ? latestBlogPosts.map((post) => (
                  <a
                    key={post.id}
                    href={post.href}
                    className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-[#FAFAFA] hover:border-zinc-400 transition-colors"
                  >
                    {post.featured_image_url && (
                      <div className="aspect-[16/9] w-full overflow-hidden bg-zinc-100 border-b border-zinc-200/60">
                        <img
                          src={post.featured_image_url}
                          alt={post.title}
                          loading="lazy"
                          className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col justify-between p-5">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <Badge variant="outline" className="bg-white border-zinc-200 text-zinc-700 truncate max-w-[155px]">
                            {post.category}
                          </Badge>
                          <span className="font-mono text-zinc-400">
                            {new Date(post.updated_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-950 leading-snug group-hover:text-amber-700 line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-xs leading-relaxed text-zinc-600 line-clamp-3">
                          {post.direct_answer}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-zinc-200/70 pt-3 text-[11px] text-zinc-500">
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="size-3" />
                          {post.reading_time_min} min
                        </span>
                        <span className="font-medium text-zinc-900 group-hover:underline">
                          {t.blog.readMore}
                        </span>
                      </div>
                    </div>
                  </a>
                ))
              : t.blog.posts.map((post) => (
                  <div
                    key={post.title}
                    className="flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-[#FAFAFA] p-5 hover:border-zinc-300 transition-colors"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <Badge variant="outline" className="bg-white border-zinc-200 text-zinc-700">
                          {post.tag}
                        </Badge>
                        <span className="font-mono text-zinc-400">{post.date}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-950 leading-snug">{post.title}</h3>
                      <p className="text-xs leading-relaxed text-zinc-600">{post.excerpt}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-zinc-200/70 pt-3 text-[11px] text-zinc-500">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="size-3" />
                        {post.readTime}
                      </span>
                      <a
                        href="/blog"
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {t.blog.readMore}
                      </a>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-16 bg-[#FAFAFA]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center mb-8 space-y-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
              {t.faq.eyebrow}
            </span>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950">
              {t.faq.title}
            </h2>
          </div>

          <div className="divide-y divide-zinc-200/80 rounded-xl border border-zinc-200/80 bg-white overflow-hidden">
            {t.faq.items.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left text-xs sm:text-[13px] font-medium text-zinc-950 hover:bg-zinc-50 cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`size-4 shrink-0 text-zinc-400 transition-transform ${
                        isOpen ? "rotate-180 text-zinc-900" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="bg-zinc-50/70 px-5 py-3.5 text-xs leading-relaxed text-zinc-600 border-t border-zinc-100">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONTACT DIAGNOSTIC (LINEAR LIGHT ARCHITECTURAL SPLIT FRAME) */}
      <section
        id="contato"
        className="relative overflow-hidden border-t border-zinc-200/80 bg-white py-20 text-zinc-900"
      >
        <div className="bg-linear-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          {/* Clean Top Section Heading */}
          <div className="mx-auto max-w-2xl text-center space-y-2.5 mb-10">
            <Badge
              variant="outline"
              className="border-zinc-300 bg-zinc-50 text-zinc-700 font-mono text-[10px] tracking-wider"
            >
              {t.contact.badge}
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-semibold tracking-[-0.03em] text-zinc-950">
              {t.contact.title}
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">{t.contact.subtitle}</p>
          </div>

          {/* Unified Linear 12-column Architectural Container */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_16px_44px_-16px_rgba(0,0,0,0.06)] grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200/80">
            {/* Left Column: São Paulo HQ & Map */}
            <div className="lg:col-span-5 bg-[#FAFAFA] p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-amber-600 font-medium">
                  {t.contact.officeEyebrow}
                </span>
                <h3 className="text-xl font-semibold tracking-[-0.02em] text-zinc-950">
                  {t.contact.officeTitle}
                </h3>
                <p className="text-xs leading-relaxed text-zinc-600">{t.contact.officeDesc}</p>
              </div>

              <div className="space-y-2.5 text-xs text-zinc-700">
                <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-white p-3.5">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                  <span>
                    Av. Adolfo Pinheiro, 2054, Sala 404 — Alto da Boa Vista, São Paulo - SP, CEP
                    04734-003
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200/80 bg-white p-3.5">
                  <Phone className="size-3.5 shrink-0 text-amber-600" />
                  <span className="font-mono text-[11px] text-zinc-900">
                    +55 (11) 2594-6276 • (11) 2594-6281
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200/80 bg-white p-3.5">
                  <Mail className="size-3.5 shrink-0 text-amber-600" />
                  <span className="font-mono text-[11px] text-zinc-900">
                    comercial@targetrelocation.com.br
                  </span>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white">
                <iframe
                  title="Target Relocation — Alto da Boa Vista, São Paulo"
                  src="https://maps.google.com/maps?q=Target%20Relocation%2C%20Av.%20Adolfo%20Pinheiro%2C%202054%20-%20sala%20404%20-%20Alto%20da%20Boa%20Vista%2C%20S%C3%A3o%20Paulo%20-%20SP%2C%2004734-003&t=m&z=15&output=embed&iwloc=near"
                  className="h-48 w-full border-0 grayscale contrast-105"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Right Column: Clean Project Scope Form */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-9 flex flex-col justify-center">
              {createdDealId ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 space-y-3 text-emerald-950">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>{t.contact.successTitle(createdDealId)}</span>
                  </div>
                  <p className="text-xs text-emerald-900/80">{t.contact.successDescription}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => onEnterCrm(createdDealId)}
                      className="h-9 rounded-lg bg-zinc-950 text-white text-xs cursor-pointer"
                    >
                      <LayoutDashboard className="mr-1.5 size-3.5" />
                      {t.contact.openDealBtn(createdDealId)}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCreatedDealId(null)}
                      className="h-9 rounded-lg text-xs cursor-pointer"
                    >
                      {t.contact.newRequestBtn}
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitLead} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="lp-name" className="text-xs font-medium text-zinc-700">
                        {t.contact.nameLabel}
                      </Label>
                      <Input
                        id="lp-name"
                        required
                        placeholder={t.contact.namePlaceholder}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-10 rounded-lg border-zinc-200 bg-zinc-50/40 focus:bg-white text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lp-company" className="text-xs font-medium text-zinc-700">
                        {t.contact.companyLabel}
                      </Label>
                      <Input
                        id="lp-company"
                        placeholder={t.contact.companyPlaceholder}
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="h-10 rounded-lg border-zinc-200 bg-zinc-50/40 focus:bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="lp-email" className="text-xs font-medium text-zinc-700">
                        {t.contact.emailLabel}
                      </Label>
                      <Input
                        id="lp-email"
                        type="email"
                        required
                        placeholder={t.contact.emailPlaceholder}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-10 rounded-lg border-zinc-200 bg-zinc-50/40 focus:bg-white text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lp-phone" className="text-xs font-medium text-zinc-700">
                        {t.contact.phoneLabel}
                      </Label>
                      <Input
                        id="lp-phone"
                        inputMode="numeric"
                        placeholder={t.contact.phonePlaceholder}
                        value={phone}
                        onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                        className="h-10 rounded-lg border-zinc-200 bg-zinc-50/40 focus:bg-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-zinc-700">
                      {t.contact.serviceLabel}
                    </Label>
                    <Select
                      value={serviceId}
                      onValueChange={(v) => setServiceId(v ?? "visas")}
                    >
                      <SelectTrigger className="h-10 w-full rounded-lg border-zinc-200 bg-zinc-50/40 text-xs">
                        <SelectValue>{selectedServiceOption.label}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {t.contact.serviceOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lp-msg" className="text-xs font-medium text-zinc-700">
                      {t.contact.messageLabel}
                    </Label>
                    <Textarea
                      id="lp-msg"
                      rows={4}
                      placeholder={t.contact.messagePlaceholder}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="rounded-lg border-zinc-200 bg-zinc-50/40 focus:bg-white text-xs"
                    />
                  </div>

                  {submitError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {submitError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-10 rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-medium cursor-pointer shadow-xs"
                  >
                    <Send className="mr-2 size-3.5" />
                    {submitting ? t.contact.submitLoading : t.contact.submitIdle}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PURE WHITE FOOTER BAR (Matches White-background Logo seamlessly) */}
      <footer className="border-t border-zinc-200 bg-white text-zinc-600">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <img
                src="/target-logo.png"
                alt="Target Relocation"
                className="h-8 w-auto object-contain"
              />
              <p className="text-xs text-zinc-500 max-w-md">{t.footer.tagline}</p>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-zinc-600">
              <a href="#servicos" className="hover:text-zinc-950">
                {t.footer.solutions}
              </a>
              <a href="#etapas" className="hover:text-zinc-950">
                {t.footer.process}
              </a>
              <a href="#sobre" className="hover:text-zinc-950">
                {t.footer.about}
              </a>
              <button
                type="button"
                onClick={onOpenLogin}
                className="hover:text-zinc-950 cursor-pointer"
              >
                {t.footer.login}
              </button>
              <button
                type="button"
                onClick={() => onEnterCrm()}
                className="text-zinc-950 hover:underline cursor-pointer"
              >
                {t.footer.crmPortal}
              </button>
              <LanguageSwitcher
                locale={locale}
                onChange={setLocale}
                ariaLabel={t.nav.languageLabel}
              />
            </div>
          </div>
          <Separator className="my-6 bg-zinc-100" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-400">
            <span>{t.footer.copyright(new Date().getFullYear())}</span>
            <span className="font-mono">{t.footer.stackNote}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
