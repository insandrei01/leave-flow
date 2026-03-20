"use client";

/**
 * useBilling — hook for billing data and Stripe checkout redirect.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

/* =========================================================================
   Types
   ========================================================================= */

export type PlanTier = "free" | "team" | "business" | "enterprise";

export interface BillingUsage {
  readonly employeesUsed: number;
  readonly employeeLimit: number | null; // null = unlimited
}

export interface CurrentPlan {
  readonly tier: PlanTier;
  readonly name: string;
  readonly pricePerSeat: number; // cents/month
  readonly renewsAt: string | null;
  readonly usage: BillingUsage;
}

export interface PlanFeature {
  readonly label: string;
  readonly included: boolean;
}

export interface Plan {
  readonly tier: PlanTier;
  readonly name: string;
  readonly pricePerSeat: number; // cents/month
  readonly employeeLimit: number | null;
  readonly features: readonly PlanFeature[];
}

export interface BillingData {
  readonly currentPlan: CurrentPlan;
  readonly availablePlans: readonly Plan[];
}

/* =========================================================================
   Hook
   ========================================================================= */

interface UseBillingReturn {
  readonly billing: BillingData | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly upgrade: (tier: PlanTier) => Promise<void>;
  readonly refresh: () => void;
}

export function useBilling(): UseBillingReturn {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBilling = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<BillingData>("/api/billing");
      if (result.success && result.data) {
        setBilling(result.data);
      } else {
        setError(result.error ?? "Failed to load billing data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBilling();
  }, [fetchBilling]);

  const upgrade = useCallback(async (tier: PlanTier) => {
    const result = await apiClient.post<{ checkoutUrl: string }>(
      "/api/billing/checkout",
      { tier }
    );
    if (!result.success) {
      throw new Error(result.error ?? "Failed to start checkout");
    }
    if (result.data?.checkoutUrl) {
      window.location.href = result.data.checkoutUrl;
    }
  }, []);

  return { billing, isLoading, error, upgrade, refresh: fetchBilling };
}
