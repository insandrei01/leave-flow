"use client";

/**
 * LeaveTypeForm — create/edit form for leave types.
 * Used inside a GlassModal.
 */

import { useState } from "react";
import {
  type CreateLeaveTypeInput,
  type LeaveType,
  type AccrualType,
} from "@/hooks/use-leave-types";
import { FormField, glassInputClass, glassSelectClass } from "@/components/ui/form-field";

/* =========================================================================
   Constants
   ========================================================================= */

const PRESET_COLORS = [
  "#818CF8", // indigo
  "#A78BFA", // violet
  "#34D399", // emerald
  "#FBBF24", // amber
  "#FB7185", // rose
  "#22D3EE", // cyan
  "#F97316", // orange
  "#A3E635", // lime
];

const ACCRUAL_OPTIONS: { value: AccrualType; label: string }[] = [
  { value: "none", label: "No accrual (fixed entitlement)" },
  { value: "monthly", label: "Monthly accrual" },
  { value: "annual", label: "Annual allocation" },
  { value: "per_pay_period", label: "Per pay period" },
];

/* =========================================================================
   Component
   ========================================================================= */

interface FormErrors {
  name?: string;
  entitlementDays?: string;
}

interface LeaveTypeFormProps {
  readonly initial?: LeaveType;
  readonly onSubmit: (input: CreateLeaveTypeInput) => Promise<void>;
  readonly onCancel: () => void;
  readonly isSubmitting?: boolean;
}

export function LeaveTypeForm({
  initial,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: LeaveTypeFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]!);
  const [paid, setPaid] = useState(initial?.paid ?? true);
  const [entitlementDays, setEntitlementDays] = useState(
    initial?.entitlementDays ?? 20
  );
  const [accrualType, setAccrualType] = useState<AccrualType>(
    initial?.accrualType ?? "none"
  );
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): boolean {
    const next: FormErrors = {};
    if (!name.trim()) next.name = "Name is required";
    if (entitlementDays < 0 || entitlementDays > 365) {
      next.entitlementDays = "Must be between 0 and 365 days";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ name: name.trim(), color, paid, entitlementDays, accrualType });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <FormField label="Name" required error={errors.name}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Annual Leave"
          className={glassInputClass}
          disabled={isSubmitting}
        />
      </FormField>

      {/* Color */}
      <FormField label="Color">
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Select color ${c}`}
              className="h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              style={{ backgroundColor: c, outline: color === c ? `2px solid white` : undefined, outlineOffset: "2px" }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div
            className="h-6 w-6 rounded-full border border-white/20"
            style={{ backgroundColor: color }}
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#818CF8"
            className={`${glassInputClass} flex-1 font-mono text-xs`}
            disabled={isSubmitting}
          />
        </div>
      </FormField>

      {/* Paid toggle */}
      <FormField label="Pay type">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPaid(true)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              paid
                ? "bg-accent-indigo/30 text-accent-indigo border border-accent-indigo/40"
                : "border border-white/10 bg-white/5 text-text-secondary hover:bg-white/10"
            }`}
          >
            Paid
          </button>
          <button
            type="button"
            onClick={() => setPaid(false)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              !paid
                ? "bg-white/10 text-text-primary border border-white/20"
                : "border border-white/10 bg-white/5 text-text-secondary hover:bg-white/10"
            }`}
          >
            Unpaid
          </button>
        </div>
      </FormField>

      {/* Entitlement days */}
      <FormField
        label="Entitlement days per year"
        required
        error={errors.entitlementDays}
      >
        <input
          type="number"
          value={entitlementDays}
          onChange={(e) => setEntitlementDays(Number(e.target.value))}
          min={0}
          max={365}
          className={glassInputClass}
          disabled={isSubmitting}
        />
      </FormField>

      {/* Accrual type */}
      <FormField label="Accrual type">
        <select
          value={accrualType}
          onChange={(e) => setAccrualType(e.target.value as AccrualType)}
          className={glassSelectClass}
          disabled={isSubmitting}
        >
          {ACCRUAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-accent-indigo transition-colors hover:bg-accent-indigo/30 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : initial ? "Save changes" : "Create"}
        </button>
      </div>
    </form>
  );
}
