"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe2, LogIn, Menu, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { BlogLocale } from "@/lib/blog-queries";

const CHROME_COPY: Record<
  BlogLocale,
  {
    solutions: string;
    catalog: string;
    process: string;
    about: string;
    insights: string;
    faq: string;
    login: string;
    accessCrm: string;
    blogIndexHref: string;
    tagline: string;
    contact: string;
    stackNote: string;
  }
> = {
  pt: {
    solutions: "Soluções",
    catalog: "Catálogo",
    process: "Etapas",
    about: "Sobre & Parcerias",
    insights: "Blog",
    faq: "FAQ",
    login: "Login",
    accessCrm: "Abrir CRM",
    blogIndexHref: "/blog",
    tagline:
      "Imigração corporativa, compliance regulatório e global mobility para multinacionais no Brasil e Américas.",
    contact: "Contato",
    stackNote: "Target Relocation • Portal Técnico GEO/SEO",
  },
  en: {
    solutions: "Solutions",
    catalog: "Catalog",
    process: "Process",
    about: "About & Partners",
    insights: "Blog",
    faq: "FAQ",
    login: "Login",
    accessCrm: "Open CRM",
    blogIndexHref: "/en/blog",
    tagline:
      "Corporate immigration, regulatory compliance, and global mobility for multinationals across Brazil & Americas.",
    contact: "Contact",
    stackNote: "Target Relocation • GEO/SEO Technical Portal",
  },
  es: {
    solutions: "Soluciones",
    catalog: "Catálogo",
    process: "Etapas",
    about: "Nosotros",
    insights: "Blog",
    faq: "FAQ",
    login: "Ingresar",
    accessCrm: "Abrir CRM",
    blogIndexHref: "/es/blog",
    tagline:
      "Inmigración corporativa, cumplimiento normativo y movilidad global para multinacionales en Brasil y Américas.",
    contact: "Contacto",
    stackNote: "Target Relocation • Portal Técnico GEO/SEO",
  },
};

export interface BlogSiteChromeProps {
  locale: BlogLocale;
  alternateHrefs?: {
    pt: string;
    en: string;
    es: string;
  };
  children: React.ReactNode;
}

/** Wraps public blog pages in the exact architectural pure-white header and footer of the main site. */
export function BlogSiteChrome({ locale, alternateHrefs, children }: BlogSiteChromeProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = CHROME_COPY[locale];

  const langLinks: Array<{ code: BlogLocale; label: string; href: string }> = [
    { code: "pt", label: "PT", href: alternateHrefs?.pt || "/blog" },
    { code: "en", label: "EN", href: alternateHrefs?.en || "/en/blog" },
    { code: "es", label: "ES", href: alternateHrefs?.es || "/es/blog" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center shrink-0">
              <img src="/target-logo.png" alt="Target Relocation" width={276} height={120} className="h-9 w-auto object-contain" />
            </Link>
            <Separator orientation="vertical" className="hidden md:block h-5 bg-zinc-200" />
            <nav className="hidden lg:flex items-center gap-5 text-[13px] font-medium text-zinc-600">
              <Link href="/#servicos" className="hover:text-zinc-950 transition-colors">
                {t.solutions}
              </Link>
              <Link href="/#catalogo" className="hover:text-zinc-950 transition-colors">
                {t.catalog}
              </Link>
              <Link href="/#etapas" className="hover:text-zinc-950 transition-colors">
                {t.process}
              </Link>
              <Link href="/#sobre" className="hover:text-zinc-950 transition-colors">
                {t.about}
              </Link>
              <Link href={t.blogIndexHref} className="text-zinc-950 font-semibold transition-colors">
                {t.insights}
              </Link>
              <Link href="/#faq" className="hover:text-zinc-950 transition-colors">
                {t.faq}
              </Link>
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

            <div
              role="group"
              aria-label="Idioma / Language"
              className="inline-flex items-center rounded-lg border border-zinc-200/90 bg-zinc-100/80 p-0.5"
            >
              <Globe2 className="ml-1.5 mr-1 size-3 text-zinc-400 shrink-0 hidden sm:block" />
              {langLinks.map((item) => {
                const active = locale === item.code;
                return (
                  <Link
                    key={item.code}
                    href={item.href}
                    className={`rounded-md px-2 py-1 font-mono text-[11px] font-medium transition-all ${
                      active ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <Link
              href="/login"
              className="hidden lg:inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
            >
              <LogIn className="mr-1.5 size-3.5" />
              {t.login}
            </Link>
            <Link
              href="/crm"
              className="hidden lg:inline-flex h-8 items-center rounded-lg bg-zinc-950 px-3.5 text-xs font-medium text-white hover:bg-zinc-800 shadow-xs"
            >
              <span>{t.accessCrm}</span>
              <ArrowRight className="ml-1.5 size-3.5" />
            </Link>
            <Button
              size="icon"
              variant="ghost"
              className="lg:hidden size-8 text-zinc-700"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-zinc-200 bg-white px-4 py-3 lg:hidden space-y-2 text-xs font-medium text-zinc-600">
            <div className="flex flex-col gap-2">
              <Link href="/#servicos" onClick={() => setMobileOpen(false)} className="py-1">
                {t.solutions}
              </Link>
              <Link href="/#catalogo" onClick={() => setMobileOpen(false)} className="py-1">
                {t.catalog}
              </Link>
              <Link href={t.blogIndexHref} onClick={() => setMobileOpen(false)} className="py-1 text-zinc-950 font-semibold">
                {t.insights}
              </Link>
              <Link href="/#contato" onClick={() => setMobileOpen(false)} className="py-1">
                {t.contact}
              </Link>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-zinc-200 bg-white text-zinc-600 mt-12">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <img src="/target-logo.png" alt="Target Relocation" width={276} height={120} className="h-8 w-auto object-contain" />
              <p className="text-xs text-zinc-500 max-w-md">{t.tagline}</p>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-zinc-600">
              <Link href="/#servicos" className="hover:text-zinc-950">
                {t.solutions}
              </Link>
              <Link href={t.blogIndexHref} className="hover:text-zinc-950">
                {t.insights}
              </Link>
              <Link href="/blog/rss.xml" className="hover:text-zinc-950">
                RSS
              </Link>
              <Link href={locale === "en" ? "/privacy-policy" : "/politica-de-privacidade"} className="hover:text-zinc-950">
                {locale === "en" ? "Privacy Policy" : locale === "es" ? "Política de Privacidad" : "Política de Privacidade"}
              </Link>
              <Link href="/login" className="hidden lg:inline-flex hover:text-zinc-950">
                {t.login}
              </Link>
              <Link href="/crm" className="hidden lg:inline-flex text-zinc-950 hover:underline">
                {t.accessCrm}
              </Link>
            </div>
          </div>
          <Separator className="my-6 bg-zinc-100" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-400">
            <span>© {new Date().getFullYear()} Target Relocation. Todos os direitos reservados.</span>
            <span className="font-mono">{t.stackNote}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
