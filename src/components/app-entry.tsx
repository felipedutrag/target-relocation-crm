"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoginView, type AuthenticatedUser } from "@/components/auth/login-view";
import { CrmShell } from "@/components/crm/crm-shell";
import { CrmCacheProvider } from "@/lib/crm-cache";
import { TargetLandingPage } from "@/components/landing/target-landing-page";
import type { LandingBlogPreview } from "@/lib/blog-queries";
import { buildCrmUser } from "@/lib/account-profile";
import type { CrmTab } from "@/components/crm/types";

export type AppViewMode = "landing" | "login" | "crm";

export function AppEntry({
  initialMode = "landing",
  initialUser = null,
  latestBlogPosts = [],
  initialTab,
  emailConfirmationFailed = false,
}: {
  initialMode?: AppViewMode;
  initialUser?: AuthenticatedUser | null;
  latestBlogPosts?: LandingBlogPreview[];
  initialTab?: CrmTab;
  emailConfirmationFailed?: boolean;
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
        setCurrentUser(buildCrmUser(data.user, member));
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
      <CrmCacheProvider key={JSON.stringify([currentUser?.id ?? currentUser?.email, currentUser?.role])}>
        <CrmShell
          initialDealId={initialDealId}
          initialTab={initialTab}
          emailConfirmationFailed={emailConfirmationFailed}
          currentUser={currentUser}
          onAccountChange={setCurrentUser}
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
      </CrmCacheProvider>
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
