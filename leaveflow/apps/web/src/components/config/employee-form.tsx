"use client";

/**
 * EmployeeForm — create/edit form for employees.
 */

import { useState } from "react";
import {
  type CreateEmployeeInput,
  type Employee,
  type EmployeeRole,
} from "@/hooks/use-employees";
import { FormField, glassInputClass, glassSelectClass } from "@/components/ui/form-field";

/* =========================================================================
   Types
   ========================================================================= */

interface TeamOption {
  readonly id: string;
  readonly name: string;
}

interface FormErrors {
  name?: string;
  email?: string;
}

interface EmployeeFormProps {
  readonly initial?: Employee;
  readonly teams: readonly TeamOption[];
  readonly onSubmit: (input: CreateEmployeeInput) => Promise<void>;
  readonly onCancel: () => void;
  readonly isSubmitting?: boolean;
}

const ROLE_OPTIONS: { value: EmployeeRole; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

/* =========================================================================
   Component
   ========================================================================= */

export function EmployeeForm({
  initial,
  teams,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EmployeeFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<EmployeeRole>(initial?.role ?? "employee");
  const [teamId, setTeamId] = useState<string>(initial?.teamId ?? "");
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): boolean {
    const next: FormErrors = {};
    if (!name.trim()) next.name = "Name is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      next.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      next.email = "Enter a valid email address";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      teamId: teamId || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <FormField label="Full name" required error={errors.name}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jane Smith"
          className={glassInputClass}
          disabled={isSubmitting}
        />
      </FormField>

      {/* Email */}
      <FormField label="Email" required error={errors.email}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@company.com"
          className={glassInputClass}
          disabled={isSubmitting || !!initial} // cannot change email on edit
        />
      </FormField>

      {/* Role */}
      <FormField label="Role">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as EmployeeRole)}
          className={glassSelectClass}
          disabled={isSubmitting}
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      {/* Team */}
      <FormField label="Team">
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className={glassSelectClass}
          disabled={isSubmitting}
        >
          <option value="">No team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
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
          {isSubmitting ? "Saving..." : initial ? "Save changes" : "Add employee"}
        </button>
      </div>
    </form>
  );
}
