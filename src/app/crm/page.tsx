import { redirect } from "next/navigation";
import { AppEntry } from "@/components/app-entry";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
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

  return (
    <AppEntry
      initialMode="crm"
      initialUser={{
        id: user.id,
        name: member.full_name,
        email: member.email,
        role: member.role,
        crmOwnerName: member.crm_owner_name,
      }}
    />
  );
}
