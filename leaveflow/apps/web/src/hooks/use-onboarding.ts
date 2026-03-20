"use client";

/**
 * useOnboarding — manages onboarding wizard state and API persistence.
 *
 * Loads progress from the API on mount and saves each step on advance.
 * Never mutates state — always creates new objects.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

/* =========================================================================
   Types
   ========================================================================= */

export type WorkWeekDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface LeaveTypeEntry {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly paid: boolean;
  readonly entitlementDays: number;
}

export interface TeamEntry {
  readonly id: string;
  readonly name: string;
  readonly managerId: string | null;
}

export interface EmployeeEntry {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly teamId: string | null;
}

export interface HolidayEntry {
  readonly id: string;
  readonly name: string;
  readonly date: string;
  readonly enabled: boolean;
  readonly custom: boolean;
}

export type WorkflowTemplate = "simple" | "standard" | "enterprise";

export interface OnboardingData {
  readonly companyName: string;
  readonly country: string;
  readonly timezone: string;
  readonly workWeek: readonly WorkWeekDay[];
  readonly leaveTypes: readonly LeaveTypeEntry[];
  readonly workflowTemplate: WorkflowTemplate | null;
  readonly teams: readonly TeamEntry[];
  readonly employees: readonly EmployeeEntry[];
  readonly holidays: readonly HolidayEntry[];
}

export interface OnboardingState {
  readonly currentStep: number;
  readonly completedSteps: readonly number[];
  readonly data: OnboardingData;
  readonly loading: boolean;
  readonly saving: boolean;
  readonly error: string | null;
}

const TOTAL_STEPS = 6;

const DEFAULT_DATA: OnboardingData = {
  companyName: "",
  country: "",
  timezone: "UTC",
  workWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  leaveTypes: [
    {
      id: "vacation",
      name: "Vacation",
      color: "#818CF8",
      paid: true,
      entitlementDays: 20,
    },
    {
      id: "sick",
      name: "Sick Leave",
      color: "#34D399",
      paid: true,
      entitlementDays: 10,
    },
    {
      id: "personal",
      name: "Personal",
      color: "#FBBF24",
      paid: false,
      entitlementDays: 5,
    },
  ],
  workflowTemplate: null,
  teams: [],
  employees: [],
  holidays: [],
};

const INITIAL_STATE: OnboardingState = {
  currentStep: 1,
  completedSteps: [],
  data: DEFAULT_DATA,
  loading: true,
  saving: false,
  error: null,
};

/* =========================================================================
   API response types
   ========================================================================= */

interface OnboardingProgressResponse {
  readonly currentStep: number;
  readonly completedSteps: readonly number[];
  readonly data: Partial<OnboardingData>;
}

/* =========================================================================
   Hook
   ========================================================================= */

export interface UseOnboardingReturn {
  readonly state: OnboardingState;
  readonly totalSteps: number;
  readonly goToStep: (step: number) => void;
  readonly completeStep: (step: number, data: Partial<OnboardingData>) => Promise<void>;
  readonly skipStep: (step: number) => void;
  readonly updateData: (patch: Partial<OnboardingData>) => void;
}

export function useOnboarding(): UseOnboardingReturn {
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);

  /* Load progress on mount */
  useEffect(() => {
    let cancelled = false;

    async function loadProgress(): Promise<void> {
      try {
        const result = await apiClient.get<OnboardingProgressResponse>(
          "/onboarding/progress"
        );
        if (cancelled) return;

        if (result.success && result.data) {
          const loaded = result.data;
          setState((prev) => ({
            ...prev,
            currentStep: loaded.currentStep ?? 1,
            completedSteps: loaded.completedSteps ?? [],
            data: { ...DEFAULT_DATA, ...loaded.data },
            loading: false,
            error: null,
          }));
        } else {
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: "Failed to load onboarding progress.",
          }));
        }
      }
    }

    void loadProgress();
    return () => {
      cancelled = true;
    };
  }, []);

  const goToStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const completeStep = useCallback(
    async (step: number, data: Partial<OnboardingData>): Promise<void> => {
      setState((prev) => ({ ...prev, saving: true, error: null }));

      try {
        const updatedData = { ...state.data, ...data };
        const completedSteps = Array.from(
          new Set([...state.completedSteps, step])
        );
        const nextStep = Math.min(step + 1, TOTAL_STEPS + 1);

        await apiClient.post("/onboarding/progress", {
          currentStep: nextStep,
          completedSteps,
          data: updatedData,
        });

        setState((prev) => ({
          ...prev,
          currentStep: nextStep,
          completedSteps,
          data: updatedData,
          saving: false,
          error: null,
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          saving: false,
          error: "Failed to save progress. Please try again.",
        }));
      }
    },
    [state.data, state.completedSteps]
  );

  const skipStep = useCallback(
    (step: number) => {
      const nextStep = Math.min(step + 1, TOTAL_STEPS + 1);
      setState((prev) => ({ ...prev, currentStep: nextStep }));
    },
    []
  );

  const updateData = useCallback((patch: Partial<OnboardingData>) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, ...patch },
    }));
  }, []);

  return {
    state,
    totalSteps: TOTAL_STEPS,
    goToStep,
    completeStep,
    skipStep,
    updateData,
  };
}
