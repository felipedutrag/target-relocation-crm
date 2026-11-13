"use client";

import { useState } from "react";
import { LoginView, type AuthenticatedUser } from "@/components/auth/login-view";
import { CrmShell } from "@/components/crm/crm-shell";
import { TargetLandingPage } from "@/components/landing/target-landing-page";

export type AppViewMode = "landing" | "login" | "crm";

export function AppEntry({ initialMode = "landing" }: { initialMode?: AppViewMode }) {
  const [mode, setMode] = useState<AppViewMode>(initialMode);
  const [initialDealId, setInitialDealId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);

  const handleEnterCrm = (dealId?: number) => {
    setInitialDealId(dealId ?? null);
    setMode("crm");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (mode === "login") {
    return (
      <LoginView
        onSuccess={(user) => {
          setCurrentUser(user);
          setMode("crm");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onBackToLanding={() => {
          setMode("landing");
          window.scrollTo({ top: 0, behavior: "smooth" });
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
          setMode("landing");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onLogout={() => {
          setMode("login");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    );
  }

  return (
    <TargetLandingPage
      onEnterCrm={handleEnterCrm}
      onOpenLogin={() => {
        setMode("login");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    />
  );
}
