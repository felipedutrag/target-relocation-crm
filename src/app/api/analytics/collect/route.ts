import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface GeoInfo {
  country: string;
  country_code: string;
  region: string;
  city: string;
}

const geoCache = new Map<string, { val: GeoInfo; expires: number }>();

function parseUserAgent(ua: string): { deviceType: string; osName: string; browserName: string } {
  const lower = ua.toLowerCase();
  let deviceType = "desktop";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    deviceType = "tablet";
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
    deviceType = "mobile";
  }

  let osName = "Outro";
  if (lower.includes("windows")) osName = "Windows";
  else if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ios")) osName = "iOS";
  else if (lower.includes("android")) osName = "Android";
  else if (lower.includes("mac os") || lower.includes("macintosh")) osName = "macOS";
  else if (lower.includes("linux")) osName = "Linux";

  let browserName = "Outro";
  if (lower.includes("edg/")) browserName = "Edge";
  else if (lower.includes("opr/") || lower.includes("opera")) browserName = "Opera";
  else if (lower.includes("chrome/") && !lower.includes("edg/")) browserName = "Chrome";
  else if (lower.includes("firefox/")) browserName = "Firefox";
  else if (lower.includes("safari/") && !lower.includes("chrome/")) browserName = "Safari";

  return { deviceType, osName, browserName };
}

function guessGeoFromTimezone(tz: string | null | undefined): GeoInfo | null {
  if (!tz) return null;
  if (tz === "America/Sao_Paulo" || tz.startsWith("America/Fortaleza") || tz.startsWith("America/Recife") || tz.startsWith("America/Manaus")) {
    return {
      country: "Brasil",
      country_code: "BR",
      region: tz === "America/Sao_Paulo" ? "São Paulo" : tz.replace("America/", ""),
      city: tz === "America/Sao_Paulo" ? "São Paulo" : tz.replace("America/", ""),
    };
  }
  return null;
}

async function resolveGeo(req: NextRequest, timezone?: string | null): Promise<{ geo: GeoInfo; ipHash: string | null }> {
  const fwd = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
  const rawIp = fwd.split(",")[0]?.trim() || "";
  const ipHash = rawIp ? crypto.createHash("sha256").update(rawIp).digest("hex").slice(0, 24) : null;

  const hCountry = req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || "";
  const hRegion = req.headers.get("x-vercel-ip-country-region") || "";
  const hCity = req.headers.get("x-vercel-ip-city") || "";
  if (hCountry && hCountry !== "XX") {
    return {
      geo: {
        country: hCountry === "BR" ? "Brasil" : hCountry,
        country_code: hCountry.slice(0, 2).toUpperCase(),
        region: decodeURIComponent(hRegion || "Desconhecido"),
        city: decodeURIComponent(hCity || "Desconhecido"),
      },
      ipHash,
    };
  }

  const isLocal = !rawIp || rawIp === "::1" || rawIp.startsWith("127.") || rawIp.startsWith("10.") || rawIp.startsWith("192.168.");
  if (!isLocal) {
    const cached = geoCache.get(rawIp);
    if (cached && cached.expires > Date.now()) {
      return { geo: cached.val, ipHash };
    }
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1100);
      const r = await fetch(`https://ipapi.co/${encodeURIComponent(rawIp)}/json/`, { signal: controller.signal });
      clearTimeout(t);
      if (r.ok) {
        const j = (await r.json()) as { country_name?: string; country_code?: string; region?: string; city?: string };
        if (j.country_name || j.country_code) {
          const val: GeoInfo = {
            country: j.country_name || j.country_code || "Desconhecido",
            country_code: j.country_code || "XX",
            region: j.region || "Desconhecido",
            city: j.city || "Desconhecido",
          };
          geoCache.set(rawIp, { val, expires: Date.now() + 6 * 3600_000 });
          return { geo: val, ipHash };
        }
      }
    } catch {
      // Fallback below
    }
  }

  const tzGuess = guessGeoFromTimezone(timezone);
  if (tzGuess) return { geo: tzGuess, ipHash };

  return {
    geo: { country: "Brasil (Local/Direto)", country_code: "BR", region: "São Paulo", city: "São Paulo" },
    ipHash,
  };
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (!raw) return NextResponse.json({ ok: true, empty: true });
    const body = JSON.parse(raw) as {
      session?: Record<string, unknown>;
      events?: Array<Record<string, unknown>>;
      heatmap?: Array<Record<string, unknown>>;
    };

    const sess = body.session || {};
    if (!sess.session_id || !sess.visitor_id) {
      return NextResponse.json({ error: "session_id e visitor_id são obrigatórios" }, { status: 400 });
    }

    const ua = req.headers.get("user-agent") || "";
    const parsedUa = parseUserAgent(ua);
    const { geo, ipHash } = await resolveGeo(req, typeof sess.timezone === "string" ? sess.timezone : null);

    const enrichedSession = {
      ...sess,
      device_type: sess.device_type || parsedUa.deviceType,
      os_name: sess.os_name || parsedUa.osName,
      browser_name: sess.browser_name || parsedUa.browserName,
      country: geo.country,
      country_code: geo.country_code,
      region: geo.region,
      city: geo.city,
      ip_hash: ipHash,
    };

    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("ingest_analytics_batch", {
      p_session: enrichedSession,
      p_events: Array.isArray(body.events) ? body.events.slice(0, 100) : [],
      p_heatmap: Array.isArray(body.heatmap) ? body.heatmap.slice(0, 200) : [],
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || { ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
