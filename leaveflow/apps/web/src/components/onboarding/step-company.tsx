"use client";

/**
 * StepCompany — Step 1: Company profile.
 *
 * Fields: company name, country, timezone, work week (checkbox days).
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { OnboardingData, WorkWeekDay } from "@/hooks/use-onboarding";

/* =========================================================================
   Constants
   ========================================================================= */

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "NL", label: "Netherlands" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "CH", label: "Switzerland" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "PT", label: "Portugal" },
  { value: "JP", label: "Japan" },
  { value: "SG", label: "Singapore" },
  { value: "IN", label: "India" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
] as const;

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (US)" },
  { value: "America/Chicago", label: "Central Time (US)" },
  { value: "America/Denver", label: "Mountain Time (US)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US)" },
  { value: "America/Toronto", label: "Eastern Time (Canada)" },
  { value: "America/Vancouver", label: "Pacific Time (Canada)" },
  { value: "America/Sao_Paulo", label: "Brasilia Time" },
  { value: "America/Mexico_City", label: "Central Time (Mexico)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European Time" },
  { value: "Europe/Berlin", label: "Central European Time (Germany)" },
  { value: "Europe/Stockholm", label: "Central European Time (Sweden)" },
  { value: "Europe/Amsterdam", label: "Central European Time (Netherlands)" },
  { value: "Europe/Zurich", label: "Central European Time (Switzerland)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time" },
  { value: "Asia/Singapore", label: "Singapore Standard Time" },
  { value: "Asia/Kolkata", label: "India Standard Time" },
  { value: "Australia/Sydney", label: "Australian Eastern Time" },
] as const;

const WEEK_DAYS: { value: WorkWeekDay; short: string; label: string }[] = [
  { value: "monday", short: "Mon", label: "Monday" },
  { value: "tuesday", short: "Tue", label: "Tuesday" },
  { value: "wednesday", short: "Wed", label: "Wednesday" },
  { value: "thursday", short: "Thu", label: "Thursday" },
  { value: "friday", short: "Fri", label: "Friday" },
  { value: "saturday", short: "Sat", label: "Saturday" },
  { value: "sunday", short: "Sun", label: "Sunday" },
];

/* =========================================================================
   Types
   ========================================================================= */

interface StepCompanyProps {
  readonly data: OnboardingData;
  readonly onChange: (patch: Partial<OnboardingData>) => void;
}

/* =========================================================================
   Form field components
   ========================================================================= */

function FieldLabel({
  htmlFor,
  children,
}: {
  readonly htmlFor: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <label
      htmlFor={htmlFor}
      className="block font-mono text-xs font-medium uppercase tracking-wider text-text-secondary"
    >
      {children}
    </label>
  );
}

function GlassInput({
  id,
  value,
  placeholder,
  onChange,
}: {
  readonly id: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly onChange: (value: string) => void;
}): React.ReactElement {
  return (
    <input
      id={id}
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-text-primary placeholder-text-tertiary backdrop-blur-glass-sm transition-colors duration-400 focus:border-accent-indigo/60 focus:bg-white/8 focus:outline-none"
    />
  );
}

function GlassSelect({
  id,
  value,
  options,
  onChange,
}: {
  readonly id: string;
  readonly value: string;
  readonly options: readonly { value: string; label: string }[];
  readonly onChange: (value: string) => void;
}): React.ReactElement {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-white/10 bg-surface-overlay px-4 py-3 text-sm text-text-primary transition-colors duration-400 focus:border-accent-indigo/60 focus:outline-none"
    >
      <option value="" disabled>
        Select...
      </option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/* =========================================================================
   Main component
   ========================================================================= */

export function StepCompany({
  data,
  onChange,
}: StepCompanyProps): React.ReactElement {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateField(field: string, value: string): string {
    if (field === "companyName" && !value.trim()) {
      return "Company name is required.";
    }
    if (field === "country" && !value) {
      return "Country is required.";
    }
    if (field === "timezone" && !value) {
      return "Timezone is required.";
    }
    return "";
  }

  function handleFieldChange(field: string, value: string): void {
    const errorMsg = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
    onChange({ [field]: value } as Partial<OnboardingData>);
  }

  function toggleWorkDay(day: WorkWeekDay): void {
    const current = data.workWeek as WorkWeekDay[];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    onChange({ workWeek: next });
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          Set up your company
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          This information helps LeaveFlow configure your calendar and
          business rules.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Company name */}
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="company-name">Company name</FieldLabel>
          <GlassInput
            id="company-name"
            value={data.companyName}
            placeholder="Acme Corp"
            onChange={(v) => handleFieldChange("companyName", v)}
          />
          {errors["companyName"] && (
            <p className="text-xs text-accent-rose">{errors["companyName"]}</p>
          )}
        </div>

        {/* Country */}
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="country">Country</FieldLabel>
          <GlassSelect
            id="country"
            value={data.country}
            options={COUNTRIES}
            onChange={(v) => handleFieldChange("country", v)}
          />
          {errors["country"] && (
            <p className="text-xs text-accent-rose">{errors["country"]}</p>
          )}
        </div>

        {/* Timezone */}
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
          <GlassSelect
            id="timezone"
            value={data.timezone}
            options={TIMEZONES}
            onChange={(v) => handleFieldChange("timezone", v)}
          />
          {errors["timezone"] && (
            <p className="text-xs text-accent-rose">{errors["timezone"]}</p>
          )}
        </div>

        {/* Work week */}
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="work-week">Work week</FieldLabel>
          <div
            id="work-week"
            role="group"
            aria-label="Select work days"
            className="flex flex-wrap gap-2"
          >
            {WEEK_DAYS.map(({ value, short, label }) => {
              const active = (data.workWeek as WorkWeekDay[]).includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleWorkDay(value)}
                  aria-pressed={active}
                  aria-label={label}
                  className={cn(
                    "flex h-10 w-12 items-center justify-center rounded-xl border text-xs font-semibold transition-all duration-400",
                    active
                      ? "border-accent-indigo/60 bg-accent-indigo/20 text-accent-indigo"
                      : "border-white/10 bg-white/5 text-text-tertiary hover:border-white/20 hover:text-text-secondary"
                  )}
                >
                  {short}
                </button>
              );
            })}
          </div>
          <p className="font-mono text-[11px] text-text-tertiary">
            {(data.workWeek as WorkWeekDay[]).length} working days per week
          </p>
        </div>
      </div>
    </div>
  );
}
