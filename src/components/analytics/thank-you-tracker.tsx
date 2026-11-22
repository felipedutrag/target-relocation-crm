"use client";

import { useEffect } from "react";
import { fireLeadConversion } from "@/components/analytics/marketing-pixels";

export function ThankYouTracker({ origin }: { origin?: string }) {
  useEffect(() => {
    fireLeadConversion(origin || "obrigado");
  }, [origin]);

  return null;
}
