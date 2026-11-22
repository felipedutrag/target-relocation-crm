import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteTracker } from "@/components/analytics/site-tracker";
import { MarketingPixels } from "@/components/analytics/marketing-pixels";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Target Relocation | Imigração Corporativa e Relocation para Empresas",
  description:
    "Assessoria especializada em imigração corporativa, vistos de trabalho no Brasil e Américas, registro na Polícia Federal (RNM) e relocation executivo para empresas.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const reqHeaders = await headers();
  const htmlLang = reqHeaders.get("x-target-locale") || "pt-BR";

  return (
    <html
      lang={htmlLang}
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground font-sans selection:bg-zinc-900 selection:text-white">
        <SiteTracker />
        <MarketingPixels />
        <TooltipProvider delay={150}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
