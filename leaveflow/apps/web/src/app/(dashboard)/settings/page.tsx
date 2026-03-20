"use client";

/**
 * Settings page — company profile, localization, work schedule, and integrations.
 */

import { useState, useEffect } from "react";
import {
  useSettings,
  type CompanyProfile,
  type Localization,
  type WorkSchedule,
  type Weekday,
} from "@/hooks/use-settings";
import { PageHeader } from "@/components/ui/page-header";
import { FormField, glassInputClass, glassSelectClass } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

/* =========================================================================
   Section wrapper
   ========================================================================= */

function SettingsSection({
  title,
  description,
  children,
  onSave,
  isSaving,
  saveError,
}: {
  readonly title: string;
  readonly description?: string;
  readonly children: React.ReactNode;
  readonly onSave?: () => void;
  readonly isSaving?: boolean;
  readonly saveError?: string | null;
}) {
  return (
    <section className="glass-card p-6 flex flex-col gap-4">
      <div>
        <h2 className="font-display text-base font-semibold text-text-primary">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
        )}
      </div>

      {children}

      {saveError && (
        <p className="text-sm text-accent-rose">{saveError}</p>
      )}

      {onSave && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="rounded-xl bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-accent-indigo transition-colors hover:bg-accent-indigo/30 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      )}
    </section>
  );
}

/* =========================================================================
   Weekday checkbox
   ========================================================================= */

const ALL_WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

/* =========================================================================
   Company profile section
   ========================================================================= */

function CompanyProfileSection({
  initial,
  onSave,
}: {
  readonly initial: CompanyProfile;
  readonly onSave: (data: CompanyProfile) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave({ name, logoUrl: logoUrl || null });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection
      title="Company Profile"
      description="Your organization's name and branding."
      onSave={handleSave}
      isSaving={isSaving}
      saveError={saveError}
    >
      <FormField label="Company name" required>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={glassInputClass}
          disabled={isSaving}
        />
      </FormField>
      <FormField label="Logo URL">
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://example.com/logo.png"
          className={glassInputClass}
          disabled={isSaving}
        />
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Company logo preview"
            className="mt-2 h-12 rounded-xl object-contain"
          />
        )}
      </FormField>
    </SettingsSection>
  );
}

/* =========================================================================
   Localization section
   ========================================================================= */

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "America/Denver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "IN", name: "India" },
  { code: "JP", name: "Japan" },
];

function LocalizationSection({
  initial,
  onSave,
}: {
  readonly initial: Localization;
  readonly onSave: (data: Localization) => Promise<void>;
}) {
  const [timezone, setTimezone] = useState(initial.timezone);
  const [country, setCountry] = useState(initial.country);
  const [fiscalYearStart, setFiscalYearStart] = useState(initial.fiscalYearStart);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave({ timezone, country, fiscalYearStart });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection
      title="Localization"
      description="Timezone, country, and fiscal year configuration."
      onSave={handleSave}
      isSaving={isSaving}
      saveError={saveError}
    >
      <FormField label="Timezone">
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={glassSelectClass} disabled={isSaving}>
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Country">
        <select value={country} onChange={(e) => setCountry(e.target.value)} className={glassSelectClass} disabled={isSaving}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Fiscal year start month">
        <select
          value={fiscalYearStart}
          onChange={(e) => setFiscalYearStart(Number(e.target.value))}
          className={glassSelectClass}
          disabled={isSaving}
        >
          {["January","February","March","April","May","June","July","August","September","October","November","December"].map(
            (month, i) => (
              <option key={i + 1} value={i + 1}>{month}</option>
            )
          )}
        </select>
      </FormField>
    </SettingsSection>
  );
}

/* =========================================================================
   Work schedule section
   ========================================================================= */

function WorkScheduleSection({
  initial,
  onSave,
}: {
  readonly initial: WorkSchedule;
  readonly onSave: (data: WorkSchedule) => Promise<void>;
}) {
  const [workWeekDays, setWorkWeekDays] = useState<ReadonlySet<Weekday>>(
    new Set(initial.workWeekDays)
  );
  const [coverageThreshold, setCoverageThreshold] = useState(
    initial.coverageThreshold
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function toggleDay(day: Weekday) {
    const next = new Set(workWeekDays);
    if (next.has(day)) {
      next.delete(day);
    } else {
      next.add(day);
    }
    setWorkWeekDays(next);
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave({
        workWeekDays: Array.from(workWeekDays),
        coverageThreshold,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection
      title="Work Schedule"
      description="Define your standard work week and coverage requirements."
      onSave={handleSave}
      isSaving={isSaving}
      saveError={saveError}
    >
      <FormField label="Work week days">
        <div className="flex flex-wrap gap-2">
          {ALL_WEEKDAYS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleDay(value)}
              disabled={isSaving}
              className={cn(
                "rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
                workWeekDays.has(value)
                  ? "bg-accent-indigo/20 text-accent-indigo border border-accent-indigo/40"
                  : "border border-white/10 bg-white/5 text-text-secondary hover:bg-white/10"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </FormField>

      <FormField label={`Coverage threshold: ${coverageThreshold}%`}>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={coverageThreshold}
          onChange={(e) => setCoverageThreshold(Number(e.target.value))}
          disabled={isSaving}
          className="w-full accent-accent-indigo"
        />
        <div className="flex justify-between text-xs text-text-tertiary">
          <span>0% (no min)</span>
          <span>100% (all present)</span>
        </div>
      </FormField>
    </SettingsSection>
  );
}

/* =========================================================================
   Integrations section
   ========================================================================= */

function IntegrationsSection({
  integrations,
}: {
  readonly integrations: readonly { provider: "slack" | "teams"; connected: boolean; installUrl: string }[];
}) {
  return (
    <SettingsSection
      title="Integrations"
      description="Connect LeaveFlow to your messaging platforms."
    >
      <div className="space-y-3">
        {integrations.map((integration) => (
          <div
            key={integration.provider}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                {integration.provider === "slack" ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-text-secondary">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-text-secondary">
                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.910 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary capitalize">
                  {integration.provider}
                </p>
                <p className="text-xs text-text-tertiary">
                  {integration.connected ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {integration.connected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-emerald/20 px-2 py-0.5 text-xs text-accent-emerald">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-emerald" />
                  Connected
                </span>
              )}
              <a
                href={integration.installUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
              >
                {integration.connected ? "Reconnect" : "Install"}
              </a>
            </div>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}

/* =========================================================================
   Page
   ========================================================================= */

export default function SettingsPage() {
  const { settings, isLoading, error, saveCompanyProfile, saveLocalization, saveWorkSchedule } =
    useSettings();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-slide-up">
        <PageHeader title="Settings" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="shimmer h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="flex flex-col gap-6 animate-slide-up">
        <PageHeader title="Settings" />
        <p className="rounded-xl border border-accent-rose/20 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose">
          {error ?? "Failed to load settings"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      <PageHeader
        title="Settings"
        subtitle="Configure your organization's preferences."
      />

      <CompanyProfileSection
        initial={settings.companyProfile}
        onSave={saveCompanyProfile}
      />

      <LocalizationSection
        initial={settings.localization}
        onSave={saveLocalization}
      />

      <WorkScheduleSection
        initial={settings.workSchedule}
        onSave={saveWorkSchedule}
      />

      <IntegrationsSection integrations={settings.integrations} />
    </div>
  );
}
