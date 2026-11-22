"use client";

import Script from "next/script";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID?.trim() || "";
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || "";
const GOOGLE_ADS_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL?.trim() || "";
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID?.trim() || "";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/** Fires conversion events across GA4, Google Ads, and Meta Pixel when a lead completes submission. */
export function fireLeadConversion(origin?: string) {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.gtag === "function") {
      if (GA4_ID) {
        window.gtag("event", "generate_lead", {
          event_category: "lead",
          event_label: origin || "website",
        });
      }
      if (GOOGLE_ADS_ID && GOOGLE_ADS_LABEL) {
        window.gtag("event", "conversion", {
          send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_LABEL}`,
        });
      }
    }
    if (typeof window.fbq === "function" && META_PIXEL_ID) {
      window.fbq("track", "Lead", { content_name: origin || "Target Relocation" });
    }
  } catch {
    // non-blocking
  }
}

/** Loads GA4, Google Ads, Meta Pixel, and Microsoft Clarity when their public IDs are configured. */
export function MarketingPixels() {
  const primaryGtagId = GA4_ID || GOOGLE_ADS_ID;

  return (
    <>
      {primaryGtagId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryGtagId)}`}
            strategy="afterInteractive"
          />
          <Script id="target-gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              ${GA4_ID ? `gtag('config', '${GA4_ID}', { send_page_view: true });` : ""}
              ${GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : ""}
            `}
          </Script>
        </>
      )}

      {META_PIXEL_ID && (
        <Script id="target-meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {CLARITY_ID && (
        <Script id="target-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_ID}");
          `}
        </Script>
      )}
    </>
  );
}
