"use client";

/**
 * WorkflowStepForm — form for a single workflow approval step.
 *
 * Renders approver type selector, approver selector, timeout configuration,
 * timeout action, delegation toggle, and reorder/delete controls.
 */

import { cn } from "@/lib/utils";
import type {
  WorkflowStep,
  ApproverType,
  TimeoutAction,
} from "@/stores/workflow-builder.store";

/* =========================================================================
   Approver option data
   ========================================================================= */

const ROLE_OPTIONS: readonly { readonly id: string; readonly label: string }[] =
  [
    { id: "direct-manager", label: "Direct Manager" },
    { id: "department-head", label: "Department Head" },
    { id: "hr-manager", label: "HR Manager" },
    { id: "ceo", label: "CEO / Executive" },
  ];

const TIMEOUT_ACTION_LABELS: Record<TimeoutAction, string> = {
  remind: "Send reminder",
  escalate: "Escalate to next approver",
  "auto-approve": "Auto-approve",
  "notify-hr": "Notify HR admin",
};

/* =========================================================================
   Props
   ========================================================================= */

interface WorkflowStepFormProps {
  readonly step: WorkflowStep;
  readonly stepNumber: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly onUpdate: (patch: Partial<Omit<WorkflowStep, "id">>) => void;
  readonly onMoveUp: () => void;
  readonly onMoveDown: () => void;
  readonly onRemove: () => void;
}

/* =========================================================================
   Component
   ========================================================================= */

export function WorkflowStepForm({
  step,
  stepNumber,
  isFirst,
  isLast,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
}: WorkflowStepFormProps) {
  const borderColor =
    stepNumber % 2 === 0
      ? "border-l-accent-violet"
      : "border-l-accent-indigo";

  return (
    <div
      className={cn(
        "glass-card border-l-4 p-5 transition-all",
        borderColor
      )}
      role="group"
      aria-label={`Step ${stepNumber}`}
    >
      {/* Step header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-indigo/20 font-mono text-xs font-semibold text-accent-indigo">
            {stepNumber}
          </span>
          <span className="font-display text-sm font-semibold text-text-primary">
            Approval Step
          </span>
        </div>

        {/* Reorder and delete controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label="Move step up"
            className={cn(
              "rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary",
              isFirst && "cursor-not-allowed opacity-30"
            )}
          >
            <ChevronUpIcon />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label="Move step down"
            className={cn(
              "rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary",
              isLast && "cursor-not-allowed opacity-30"
            )}
          >
            <ChevronDownIcon />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove step"
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-accent-rose/20 hover:text-accent-rose"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Form fields */}
      <div className="grid gap-4">
        {/* Approver type */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Approver Type
          </label>
          <div className="flex gap-2">
            {(["role-based", "specific", "group"] as const).map((type) => (
              <ApproverTypeButton
                key={type}
                type={type}
                selected={step.approverType === type}
                onClick={() => onUpdate({ approverType: type })}
              />
            ))}
          </div>
        </div>

        {/* Approver selector */}
        <div>
          <label
            htmlFor={`approver-${step.id}`}
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            {step.approverType === "role-based"
              ? "Role"
              : step.approverType === "specific"
                ? "Employee"
                : "Group"}
          </label>
          {step.approverType === "role-based" ? (
            <select
              id={`approver-${step.id}`}
              value={step.approverId}
              onChange={(e) =>
                onUpdate({
                  approverId: e.target.value,
                  approverLabel:
                    ROLE_OPTIONS.find((r) => r.id === e.target.value)?.label ??
                    e.target.value,
                })
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary focus:border-accent-indigo/50 focus:outline-none focus:ring-1 focus:ring-accent-indigo/30"
            >
              <option value="">Select role…</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`approver-${step.id}`}
              type="text"
              placeholder={
                step.approverType === "specific"
                  ? "Search employees…"
                  : "Search groups…"
              }
              value={step.approverLabel}
              onChange={(e) =>
                onUpdate({
                  approverId: e.target.value.toLowerCase().replace(/\s/g, "-"),
                  approverLabel: e.target.value,
                })
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-accent-indigo/50 focus:outline-none focus:ring-1 focus:ring-accent-indigo/30"
            />
          )}
        </div>

        {/* Timeout row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={`timeout-${step.id}`}
              className="mb-1.5 block text-xs font-medium text-text-secondary"
            >
              Timeout (hours)
            </label>
            <input
              id={`timeout-${step.id}`}
              type="number"
              min={1}
              max={720}
              value={step.timeoutHours}
              onChange={(e) =>
                onUpdate({ timeoutHours: Math.max(1, Number(e.target.value)) })
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary focus:border-accent-indigo/50 focus:outline-none focus:ring-1 focus:ring-accent-indigo/30"
            />
          </div>

          <div>
            <label
              htmlFor={`action-${step.id}`}
              className="mb-1.5 block text-xs font-medium text-text-secondary"
            >
              On Timeout
            </label>
            <select
              id={`action-${step.id}`}
              value={step.timeoutAction}
              onChange={(e) =>
                onUpdate({ timeoutAction: e.target.value as TimeoutAction })
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary focus:border-accent-indigo/50 focus:outline-none focus:ring-1 focus:ring-accent-indigo/30"
            >
              {(
                ["remind", "escalate", "auto-approve", "notify-hr"] as const
              ).map((action) => (
                <option key={action} value={action}>
                  {TIMEOUT_ACTION_LABELS[action]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Delegation toggle */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text-primary">
              Allow Delegation
            </p>
            <p className="text-xs text-text-secondary">
              Approver can delegate to another person
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={step.allowDelegation}
            onClick={() =>
              onUpdate({ allowDelegation: !step.allowDelegation })
            }
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-indigo",
              step.allowDelegation
                ? "bg-accent-indigo"
                : "bg-white/10"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                step.allowDelegation ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Sub-components
   ========================================================================= */

const APPROVER_TYPE_LABELS: Record<ApproverType, string> = {
  "role-based": "By Role",
  specific: "Specific Person",
  group: "Group",
};

function ApproverTypeButton({
  type,
  selected,
  onClick,
}: {
  readonly type: ApproverType;
  readonly selected: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
        selected
          ? "border-accent-indigo/50 bg-accent-indigo/10 text-accent-indigo"
          : "border-white/10 bg-white/5 text-text-secondary hover:border-white/20 hover:text-text-primary"
      )}
    >
      {APPROVER_TYPE_LABELS[type]}
    </button>
  );
}

function ChevronUpIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.712Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
