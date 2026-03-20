"use client";

/**
 * TeamForm — create/edit form for teams.
 * Requires a list of employees (managers) and workflows from the caller.
 */

import { useState } from "react";
import { type CreateTeamInput, type Team } from "@/hooks/use-teams";
import { FormField, glassInputClass, glassSelectClass } from "@/components/ui/form-field";

/* =========================================================================
   Types
   ========================================================================= */

interface EmployeeOption {
  readonly id: string;
  readonly name: string;
}

interface WorkflowOption {
  readonly id: string;
  readonly name: string;
}

interface FormErrors {
  name?: string;
  managerId?: string;
  workflowId?: string;
}

interface TeamFormProps {
  readonly initial?: Team;
  readonly employees: readonly EmployeeOption[];
  readonly workflows: readonly WorkflowOption[];
  readonly onSubmit: (input: CreateTeamInput) => Promise<void>;
  readonly onCancel: () => void;
  readonly isSubmitting?: boolean;
}

/* =========================================================================
   Component
   ========================================================================= */

export function TeamForm({
  initial,
  employees,
  workflows,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: TeamFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [managerId, setManagerId] = useState(initial?.managerId ?? "");
  const [workflowId, setWorkflowId] = useState(initial?.workflowId ?? "");
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): boolean {
    const next: FormErrors = {};
    if (!name.trim()) next.name = "Name is required";
    if (!managerId) next.managerId = "Manager is required";
    if (!workflowId) next.workflowId = "Workflow is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ name: name.trim(), managerId, workflowId });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <FormField label="Team name" required error={errors.name}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Engineering"
          className={glassInputClass}
          disabled={isSubmitting}
        />
      </FormField>

      {/* Manager */}
      <FormField label="Manager" required error={errors.managerId}>
        <select
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
          className={glassSelectClass}
          disabled={isSubmitting}
        >
          <option value="">Select a manager</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
      </FormField>

      {/* Workflow */}
      <FormField label="Approval workflow" required error={errors.workflowId}>
        <select
          value={workflowId}
          onChange={(e) => setWorkflowId(e.target.value)}
          className={glassSelectClass}
          disabled={isSubmitting}
        >
          <option value="">Select a workflow</option>
          {workflows.map((wf) => (
            <option key={wf.id} value={wf.id}>
              {wf.name}
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
          {isSubmitting ? "Saving..." : initial ? "Save changes" : "Create team"}
        </button>
      </div>
    </form>
  );
}
