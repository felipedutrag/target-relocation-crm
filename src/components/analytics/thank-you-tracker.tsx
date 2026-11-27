"use client";

import { useEffect } from "react";
import { fireLeadConversion } from "@/components/analytics/marketing-pixels";

export function ThankYouTracker({ origin }: { origin?: string }) {
  useEffect(() => {
    // Google Ads is recorded by the successful form submission.
    fireLeadConversion(origin || "obrigado", { googleAds: false });
  }, [origin]);

  return null;
}
