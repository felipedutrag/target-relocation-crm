import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest, customHeaders?: Headers) {
  const nextReqInit = customHeaders ? { request: { headers: customHeaders } } : { request };
  let supabaseResponse = NextResponse.next(nextReqInit);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next(nextReqInit);
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
        if (headers && typeof headers === "object") {
          Object.entries(headers).forEach(([k, v]) => supabaseResponse.headers.set(k, v));
        }
      },
    },
  });

  // Always call getClaims() to validate JWT signature and refresh session cookies
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims && request.nextUrl.pathname.startsWith("/crm")) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("redirect", "/crm");
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
