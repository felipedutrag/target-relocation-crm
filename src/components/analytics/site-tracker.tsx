"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem("target_vid");
    if (existing) return existing;
    const id = `v_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
    localStorage.setItem("target_vid", id);
    return id;
  } catch {
    return `v_${Math.random().toString(36).slice(2, 14)}`;
  }
}

function getOrCreateSessionId(): string {
  try {
    const now = Date.now();
    const raw = sessionStorage.getItem("target_sid");
    const last = Number(sessionStorage.getItem("target_sid_ts") || 0);
    if (raw && last && now - last < 30 * 60 * 1000) {
      sessionStorage.setItem("target_sid_ts", String(now));
      return raw;
    }
    const id = `s_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
    sessionStorage.setItem("target_sid", id);
    sessionStorage.setItem("target_sid_ts", String(now));
    return id;
  } catch {
    return `s_${Math.random().toString(36).slice(2, 14)}`;
  }
}

function parseBlogPath(pathname: string): { isBlogArticle: boolean; slug: string | null; locale: string | null } {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/" || clean === "/blog" || clean === "/en/blog" || clean === "/es/blog") {
    return { isBlogArticle: false, slug: null, locale: null };
  }
  const enMatch = clean.match(/^\/en\/([^/]+)$/);
  if (enMatch && enMatch[1] !== "blog") {
    return { isBlogArticle: true, slug: enMatch[1], locale: "en" };
  }
  const esMatch = clean.match(/^\/es\/([^/]+)$/);
  if (esMatch && esMatch[1] !== "blog") {
    return { isBlogArticle: true, slug: esMatch[1], locale: "es" };
  }
  const blogMatch = clean.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    return { isBlogArticle: true, slug: blogMatch[1], locale: "pt" };
  }
  const rootMatch = clean.match(/^\/([^/]+)$/);
  if (rootMatch && !["login", "crm", "oauth", "robots.txt", "sitemap.xml"].includes(rootMatch[1])) {
    return { isBlogArticle: true, slug: rootMatch[1], locale: "pt" };
  }
  return { isBlogArticle: false, slug: null, locale: null };
}

function buildSelector(el: Element | null): string {
  if (!el) return "";
  const parts: string[] = [];
  let cur: Element | null = el;
  for (let depth = 0; cur && depth < 4; depth++) {
    let seg = cur.tagName.toLowerCase();
    if (cur.id) {
      seg += `#${cur.id.slice(0, 32)}`;
      parts.unshift(seg);
      break;
    }
    const cls = typeof cur.className === "string" ? cur.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    if (cls) seg += `.${cls.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 36)}`;
    parts.unshift(seg);
    cur = cur.parentElement;
  }
  return parts.join(" > ").slice(0, 220);
}

function SiteTrackerInner() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const qsString = searchParams?.toString() || "";

  const eventsQueueRef = useRef<Array<Record<string, unknown>>>([]);
  const heatmapQueueRef = useRef<Array<Record<string, unknown>>>([]);
  const sessionStartRef = useRef<number>(Date.now());
  const pageEnterRef = useRef<number>(Date.now());
  const lastMoveRef = useRef<number>(0);
  const recentClicksRef = useRef<Array<{ t: number; x: number; y: number }>>([]);
  const scrollMilestonesRef = useRef<Set<number>>(new Set());
  const maxScrollRef = useRef<number>(0);

  const shouldSkip =
    pathname.startsWith("/crm") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/oauth") ||
    pathname.startsWith("/api");

  useEffect(() => {
    if (shouldSkip || typeof window === "undefined") return;

    // Respect opt-out flag if set in localStorage or inside an iframe heatmap preview
    if (window.self !== window.top && new URLSearchParams(window.location.search).has("_hm_preview")) {
      return;
    }

    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId();
    const url = new URL(window.location.href);
    const sp = url.searchParams;

    const utmSource = sp.get("utm_source");
    const utmMedium = sp.get("utm_medium");
    const utmCampaign = sp.get("utm_campaign");
    const utmTerm = sp.get("utm_term");
    const utmContent = sp.get("utm_content");
    const gclid = sp.get("gclid");
    const fbclid = sp.get("fbclid");
    const hasTracking = Boolean(utmSource || utmMedium || utmCampaign || utmTerm || utmContent || gclid || fbclid);

    let referrerDomain: string | null = null;
    try {
      if (document.referrer) {
        const refHost = new URL(document.referrer).hostname;
        if (refHost && refHost !== window.location.hostname) {
          referrerDomain = refHost;
        }
      }
    } catch {
      referrerDomain = null;
    }

    const buildSessionPayload = (curPath: string) => ({
      session_id: sessionId,
      visitor_id: visitorId,
      entry_path: curPath,
      exit_path: curPath,
      duration_sec: Math.round((Date.now() - sessionStartRef.current) / 1000),
      referrer: document.referrer || null,
      referrer_domain: referrerDomain,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_term: utmTerm,
      utm_content: utmContent,
      gclid,
      fbclid,
      tracking_url: hasTracking ? url.pathname + url.search : null,
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
      screen_w: window.screen?.width || window.innerWidth,
      screen_h: window.screen?.height || window.innerHeight,
      language: navigator.language || "pt-BR",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    });

    const flush = (useBeacon = false) => {
      if (eventsQueueRef.current.length === 0 && heatmapQueueRef.current.length === 0) return;
      const payload = JSON.stringify({
        session: buildSessionPayload(pathname),
        events: eventsQueueRef.current.splice(0, 80),
        heatmap: heatmapQueueRef.current.splice(0, 150),
      });

      if (useBeacon && navigator.sendBeacon) {
        try {
          navigator.sendBeacon("/api/analytics/collect", new Blob([payload], { type: "application/json" }));
          return;
        } catch {
          // fallback to fetch keepalive
        }
      }

      fetch("/api/analytics/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    };

    // Reset page timers & scroll milestones on route change
    pageEnterRef.current = Date.now();
    scrollMilestonesRef.current = new Set();
    maxScrollRef.current = 0;

    const blogInfo = parseBlogPath(pathname);
    eventsQueueRef.current.push({
      occurred_at: new Date().toISOString(),
      event_type: blogInfo.isBlogArticle ? "blog_read" : "pageview",
      event_name: blogInfo.isBlogArticle ? "article_view" : "page_view",
      path: pathname,
      full_url: window.location.href,
      page_title: document.title,
      is_blog_article: blogInfo.isBlogArticle,
      blog_slug: blogInfo.slug,
      blog_locale: blogInfo.locale,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_term: utmTerm,
      utm_content: utmContent,
      gclid,
      fbclid,
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
    });
    // Flush initial pageview right away
    flush(false);

    const onClick = (e: MouseEvent) => {
      const target = (e.target as Element | null)?.closest("a, button, input, select, textarea, [role='button'], [data-track]") || (e.target as Element | null);
      const docHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight, 1);
      const docWidth = Math.max(document.documentElement.scrollWidth, window.innerWidth, 1);
      const absY = e.clientY + window.scrollY;
      const absX = e.clientX + window.scrollX;
      const xPct = Number(((absX / docWidth) * 100).toFixed(2));
      const yPct = Number(((absY / docHeight) * 100).toFixed(2));

      const tag = target?.tagName?.toLowerCase() || "body";
      const anchor = target?.closest("a");
      const href = anchor?.getAttribute("href") || "";
      const txt = (target?.textContent || target?.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 140);
      const selector = buildSelector(target);

      const now = Date.now();
      recentClicksRef.current = recentClicksRef.current.filter((c) => now - c.t < 750);
      recentClicksRef.current.push({ t: now, x: e.clientX, y: e.clientY });
      const isRage =
        recentClicksRef.current.length >= 3 &&
        recentClicksRef.current.every(
          (c) => Math.hypot(c.x - e.clientX, c.y - e.clientY) < 28
        );

      let eventType = "click";
      let eventName = "ui_click";
      if (isRage) {
        eventType = "rage_click";
        eventName = "rage_click";
      } else if (href.includes("wa.me") || href.includes("whatsapp")) {
        eventType = "whatsapp_click";
        eventName = "whatsapp_cta";
      } else if (href.startsWith("http") && !href.includes(window.location.hostname)) {
        eventType = "outbound_click";
        eventName = "outbound_link";
      } else if (tag === "button" || href.includes("#contato")) {
        eventType = "cta_click";
        eventName = "button_click";
      }

      eventsQueueRef.current.push({
        occurred_at: new Date().toISOString(),
        event_type: eventType,
        event_name: eventName,
        path: pathname,
        full_url: window.location.href,
        page_title: document.title,
        is_blog_article: blogInfo.isBlogArticle,
        blog_slug: blogInfo.slug,
        blog_locale: blogInfo.locale,
        viewport_w: window.innerWidth,
        viewport_h: window.innerHeight,
        element_tag: tag,
        element_text: txt,
        element_href: href,
        element_selector: selector,
        click_x_pct: xPct,
        click_y_pct: yPct,
      });

      heatmapQueueRef.current.push({
        occurred_at: new Date().toISOString(),
        path: pathname,
        interaction_type: "click",
        x_pct: xPct,
        y_pct: yPct,
        y_px: Math.round(absY),
        doc_height: Math.round(docHeight),
        viewport_w: window.innerWidth,
        viewport_h: window.innerHeight,
        element_tag: tag,
        element_text: txt,
        element_selector: selector,
      });

      if (eventsQueueRef.current.length >= 5) flush(false);
    };

    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      eventsQueueRef.current.push({
        occurred_at: new Date().toISOString(),
        event_type: "form_submit",
        event_name: "form_submit",
        path: pathname,
        full_url: window.location.href,
        page_title: document.title,
        is_blog_article: blogInfo.isBlogArticle,
        blog_slug: blogInfo.slug,
        element_tag: "form",
        element_text: form?.getAttribute("aria-label") || form?.id || "Formulário do site",
        element_selector: buildSelector(form),
        viewport_w: window.innerWidth,
        viewport_h: window.innerHeight,
      });
      flush(false);
    };

    const onMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMoveRef.current < 450) return;
      lastMoveRef.current = now;
      const docHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight, 1);
      const docWidth = Math.max(document.documentElement.scrollWidth, window.innerWidth, 1);
      heatmapQueueRef.current.push({
        occurred_at: new Date().toISOString(),
        path: pathname,
        interaction_type: "move",
        x_pct: Number((((e.clientX + window.scrollX) / docWidth) * 100).toFixed(2)),
        y_pct: Number((((e.clientY + window.scrollY) / docHeight) * 100).toFixed(2)),
        y_px: Math.round(e.clientY + window.scrollY),
        doc_height: Math.round(docHeight),
        viewport_w: window.innerWidth,
        viewport_h: window.innerHeight,
      });
    };

    const onScroll = () => {
      const docHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight, 1);
      const reached = Math.min(100, Math.round(((window.scrollY + window.innerHeight) / docHeight) * 100));
      if (reached > maxScrollRef.current) maxScrollRef.current = reached;

      for (const mark of [10, 25, 50, 75, 90, 100]) {
        if (reached >= mark && !scrollMilestonesRef.current.has(mark)) {
          scrollMilestonesRef.current.add(mark);
          eventsQueueRef.current.push({
            occurred_at: new Date().toISOString(),
            event_type: "scroll",
            event_name: `scroll_${mark}`,
            path: pathname,
            is_blog_article: blogInfo.isBlogArticle,
            blog_slug: blogInfo.slug,
            scroll_depth_pct: mark,
            viewport_w: window.innerWidth,
            viewport_h: window.innerHeight,
          });
          heatmapQueueRef.current.push({
            occurred_at: new Date().toISOString(),
            path: pathname,
            interaction_type: "scroll",
            x_pct: 50,
            y_pct: mark,
            y_px: Math.round((docHeight * mark) / 100),
            doc_height: Math.round(docHeight),
            viewport_w: window.innerWidth,
            viewport_h: window.innerHeight,
          });
        }
      }
    };

    const emitExit = () => {
      const secs = Math.max(1, Math.round((Date.now() - pageEnterRef.current) / 1000));
      eventsQueueRef.current.push({
        occurred_at: new Date().toISOString(),
        event_type: "page_exit",
        event_name: "engagement_ping",
        path: pathname,
        is_blog_article: blogInfo.isBlogArticle,
        blog_slug: blogInfo.slug,
        scroll_depth_pct: maxScrollRef.current || null,
        time_on_page_sec: secs,
        viewport_w: window.innerWidth,
        viewport_h: window.innerHeight,
      });
      flush(true);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") emitExit();
    };

    window.addEventListener("click", onClick, { passive: true });
    window.addEventListener("submit", onSubmit, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", emitExit);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const timer = window.setInterval(() => flush(false), 3500);

    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("submit", onSubmit);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", emitExit);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(timer);
      emitExit();
    };
  }, [pathname, qsString, shouldSkip]);

  return null;
}

export function SiteTracker() {
  return (
    <Suspense fallback={null}>
      <SiteTrackerInner />
    </Suspense>
  );
}
