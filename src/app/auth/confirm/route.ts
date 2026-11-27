import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site-url";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const destination = new URL("/crm?tab=account", SITE_URL);
  const supabase = await createClient();
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    if (!result.error) return Response.redirect(destination, 303);
  } else if (tokenHash && params.get("type") === "email_change") {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email_change" });
    if (!result.error) return Response.redirect(destination, 303);
  }
  destination.searchParams.set("notice", "email-confirmation-failed");
  return Response.redirect(destination, 303);
}
