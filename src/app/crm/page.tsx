import { redirect } from "next/navigation";
import { AppEntry } from "@/components/app-entry";
import { createClient } from "@/lib/supabase/server";
import { buildCrmUser } from "@/lib/account-profile";

export const dynamic = "force-dynamic";

export default async function CrmPage({ searchParams }: {
  searchParams: Promise<{ tab?: string; notice?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: member } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!member) {
    redirect("/login");
  }

  const params = await searchParams;
  return (
    <AppEntry
      initialMode="crm"
      initialUser={buildCrmUser(user, member)}
      initialTab={params.tab === "account" ? "account" : params.tab === "whatsapp-demo" ? "whatsapp_demo" : undefined}
      emailConfirmationFailed={params.notice === "email-confirmation-failed"}
    />
  );
}
