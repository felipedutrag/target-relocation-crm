import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BlogSiteChrome } from "@/components/blog/blog-site-chrome";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Privacy Policy & Data Protection | Target Relocation",
  description:
    "Target Relocation Privacy Policy covering Brazilian LGPD (Law No. 13.709/2018), analytics cookies, and corporate immigration data handling.",
  alternates: {
    canonical: `${SITE_URL}/privacy-policy`,
    languages: {
      "pt-BR": `${SITE_URL}/politica-de-privacidade`,
      "en-US": `${SITE_URL}/privacy-policy`,
    },
  },
};

export default function PrivacyPolicyEnPage() {
  return (
    <BlogSiteChrome
      locale="en"
      alternateHrefs={{
        pt: "/politica-de-privacidade",
        en: "/privacy-policy",
        es: "/politica-de-privacidade",
      }}
    >
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <article className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-6 text-sm leading-relaxed text-zinc-700">
          <div className="space-y-3 border-b border-zinc-200 pb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>LGPD Compliance • Brazil Law No. 13.709/2018</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-semibold tracking-[-0.03em] text-zinc-950">
              Privacy Policy
            </h1>
            <p className="text-xs font-mono text-zinc-500">
              Target Relocation • Last updated: November 2026
            </p>
          </div>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">1. Data Controller & Scope</h2>
            <p>
              <strong>Target Relocation</strong>, headquartered at Av. Adolfo Pinheiro, 2054, Suite 404, Alto da Boa
              Vista, São Paulo/SP, Brazil, acts as controller for personal data collected on this website in compliance
              with Brazil&apos;s General Data Protection Law (LGPD — Law No. 13.709/2018).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">2. Information Collected & Purpose</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Inquiry and assessment forms:</strong> full name, company name, corporate email, phone/WhatsApp,
                and project scope voluntarily submitted so our specialists can respond to proposal requests.
              </li>
              <li>
                <strong>Usage & campaign measurement:</strong> essential analytics, UTM attribution, pageviews, device
                metadata, and advertising conversion tags (Google Analytics 4, Google Ads, Meta Pixel, Microsoft Clarity)
                when enabled.
              </li>
              <li>
                <strong>Immigration engagements:</strong> assignee records are processed strictly under confidentiality
                for filings before the Ministry of Labor, Federal Police, and diplomatic missions.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">3. Sharing & Retention</h2>
            <p>
              Target Relocation never sells personal data. Information is shared strictly when required to perform
              contracted immigration/relocation services or comply with legal and regulatory obligations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">4. Your Rights & Contact</h2>
            <p>
              You may request access, correction, portability, or deletion of personal data by contacting{" "}
              <a href="mailto:comercial@targetrelocation.com.br" className="font-medium text-zinc-950 underline">
                comercial@targetrelocation.com.br
              </a>{" "}
              or calling +55 (11) 2594-6276.
            </p>
          </section>

          <div className="pt-4 border-t border-zinc-200 flex flex-wrap gap-4 text-xs">
            <Link href="/" className="font-medium text-zinc-950 underline underline-offset-4">
              ← Back to homepage
            </Link>
            <Link
              href="/politica-de-privacidade"
              className="text-zinc-600 hover:text-zinc-950 underline underline-offset-4"
            >
              Versão em Português
            </Link>
          </div>
        </article>
      </main>
    </BlogSiteChrome>
  );
}
