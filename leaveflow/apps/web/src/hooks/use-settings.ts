"use client";

/**
 * useSettings — hook for reading and updating organization settings.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

/* =========================================================================
   Types
   ========================================================================= */

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface CompanyProfile {
  readonly name: string;
  readonly logoUrl: string | null;
}

export interface Localization {
  readonly timezone: string;
  readonly country: string;
  readonly fiscalYearStart: number; // 1-12 month number
}

export interface WorkSchedule {
  readonly workWeekDays: readonly Weekday[];
  readonly coverageThreshold: number; // 0-100
}

export interface Integration {
  readonly provider: "slack" | "teams";
  readonly connected: boolean;
  readonly installUrl: string;
}

export interface OrgSettings {
  readonly companyProfile: CompanyProfile;
  readonly localization: Localization;
  readonly workSchedule: WorkSchedule;
  readonly integrations: readonly Integration[];
}

/* =========================================================================
   Hook
   ========================================================================= */

interface UseSettingsReturn {
  readonly settings: OrgSettings | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly saveCompanyProfile: (data: CompanyProfile) => Promise<void>;
  readonly saveLocalization: (data: Localization) => Promise<void>;
  readonly saveWorkSchedule: (data: WorkSchedule) => Promise<void>;
  readonly refresh: () => void;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<OrgSettings>("/api/settings");
      if (result.success && result.data) {
        setSettings(result.data);
      } else {
        setError(result.error ?? "Failed to load settings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const saveCompanyProfile = useCallback(async (data: CompanyProfile) => {
    const result = await apiClient.patch<OrgSettings>(
      "/api/settings/company-profile",
      data
    );
    if (!result.success) {
      throw new Error(result.error ?? "Failed to save company profile");
    }
    if (result.data) {
      setSettings(result.data);
    }
  }, []);

  const saveLocalization = useCallback(async (data: Localization) => {
    const result = await apiClient.patch<OrgSettings>(
      "/api/settings/localization",
      data
    );
    if (!result.success) {
      throw new Error(result.error ?? "Failed to save localization");
    }
    if (result.data) {
      setSettings(result.data);
    }
  }, []);

  const saveWorkSchedule = useCallback(async (data: WorkSchedule) => {
    const result = await apiClient.patch<OrgSettings>(
      "/api/settings/work-schedule",
      data
    );
    if (!result.success) {
      throw new Error(result.error ?? "Failed to save work schedule");
    }
    if (result.data) {
      setSettings(result.data);
    }
  }, []);

  return {
    settings,
    isLoading,
    error,
    saveCompanyProfile,
    saveLocalization,
    saveWorkSchedule,
    refresh: fetchSettings,
  };
}
