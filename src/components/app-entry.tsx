"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoginView, type AuthenticatedUser } from "@/components/auth/login-view";
import { CrmShell } from "@/components/crm/crm-shell";
import { TargetLandingPage } from "@/components/landing/target-landing-page";
import type { LandingBlogPreview } from "@/lib/blog-queries";

export type AppViewMode = "landing" | "login" | "crm";

export function AppEntry({
  initialMode = "landing",
  initialUser = null,
  latestBlogPosts = [],
}: {
  initialMode?: AppViewMode;
  initialUser?: AuthenticatedUser | null;
  latestBlogPosts?: LandingBlogPreview[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AppViewMode>(initialMode);
  const [initialDealId, setInitialDealId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(initialUser);

  useEffect(() => {
    if (initialUser || initialMode !== "crm") return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      const { data: member } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("user_id", data.user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (member) {
        setCurrentUser({
          id: data.user.id,
          name: member.full_name,
          email: member.email,
          role: member.role,
          crmOwnerName: member.crm_owner_name,
        });
      }
    });
  }, [initialMode, initialUser, router]);

  const handleEnterCrm = (dealId?: number) => {
    setInitialDealId(dealId ?? null);
    if (currentUser) {
      setMode("crm");
      router.push("/crm");
    } else {
      router.push("/login");
    }
  };

  if (mode === "login") {
    return (
      <LoginView
        onSuccess={(user) => {
          setCurrentUser(user);
          router.push("/crm");
          router.refresh();
          setMode("crm");
        }}
        onBackToLanding={() => {
          router.push("/");
          setMode("landing");
        }}
      />
    );
  }

  if (mode === "crm") {
    return (
      <CrmShell
        initialDealId={initialDealId}
        currentUser={currentUser}
        onOpenLanding={() => {
          router.push("/");
          setMode("landing");
        }}
        onLogout={async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          setCurrentUser(null);
          router.push("/login");
          router.refresh();
          setMode("login");
        }}
      />
    );
  }

  return (
    <TargetLandingPage
      latestBlogPosts={latestBlogPosts}
      onEnterCrm={handleEnterCrm}
      onOpenLogin={() => {
        router.push("/login");
        setMode("login");
      }}
    />
  );
}
