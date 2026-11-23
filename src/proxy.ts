import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

function detectHtmlLang(pathname: string): string {
  if (
    pathname === "/en" ||
    pathname.startsWith("/en/") ||
    pathname === "/privacy-policy" ||
    pathname.startsWith("/privacy-policy/")
  ) {
    return "en";
  }
  if (pathname === "/es" || pathname.startsWith("/es/")) {
    return "es";
  }
  return "pt-BR";
}

export async function proxy(request: NextRequest) {
  // If a browser navigation loads a URL containing internal _rsc query parameter, strip it
  if (request.nextUrl.searchParams.has("_rsc") && !request.headers.get("rsc")) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete("_rsc");
    return NextResponse.redirect(cleanUrl);
  }

  const pathname = request.nextUrl.pathname;
  const htmlLang = detectHtmlLang(pathname);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-target-locale", htmlLang);

  // Skip Supabase Auth round-trip on anonymous public routes for fast mobile TTFB
  const needsAuth =
    pathname.startsWith("/crm") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/oauth") ||
    request.cookies.getAll().some((c) => c.name.startsWith("sb-"));

  if (!needsAuth) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const response = await updateSession(request, requestHeaders);

  // Never cache sensitive or dynamic auth and CRM routes
  if (pathname.startsWith("/login") || pathname.startsWith("/crm") || pathname.startsWith("/oauth")) {
    response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
    response.headers.set("Pragma", "no-cache");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon\\.png|apple-icon\\.png|sitemap\\.xml|robots\\.txt|\\.well-known|api/mcp|api/oauth|api/analytics/collect|api/webhooks/resend|.*\\.(?:svg|png|jpg|jpeg|gif|webp|xml)$).*)",
  ],
};
