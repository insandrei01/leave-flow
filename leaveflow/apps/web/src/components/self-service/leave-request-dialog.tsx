"use client";

/**
 * LeaveRequestDialog — modal for submitting a new leave request.
 *
 * Features: leave type selector, date picker, half-day toggle,
 * reason textarea, real-time balance preview. Calls the API on submit.
 */

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  useCreateLeaveRequest,
  useValidateLeaveRequest,
  type LeaveBalance,
  type LeaveRequest,
} from "@/hooks/use-self-service";

/* =========================================================================
   Types
   ========================================================================= */

interface FormState {
  readonly leaveTypeId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly halfDay: boolean;
  readonly halfDayPeriod: "morning" | "afternoon";
  readonly reason: string;
}

const EMPTY_FORM: FormState = {
  leaveTypeId: "",
  startDate: "",
  endDate: "",
  halfDay: false,
  halfDayPeriod: "morning",
  reason: "",
};

/* =========================================================================
   Props
   ========================================================================= */

interface LeaveRequestDialogProps {
  readonly isOpen: boolean;
  readonly balances: readonly LeaveBalance[];
  readonly onClose: () => void;
  readonly onSuccess: (request: LeaveRequest) => void;
}

/* =========================================================================
   Component
   ========================================================================= */

export function LeaveRequestDialog({
  isOpen,
  balances,
  onClose,
  onSuccess,
}: LeaveRequestDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [validationDebounce, setValidationDebounce] =
    useState<ReturnType<typeof setTimeout> | null>(null);

  const { submit, isSubmitting, error: submitError } = useCreateLeaveRequest();
  const {
    validate,
    isValidating,
    validationResult,
  } = useValidateLeaveRequest();

  const selectedBalance = balances.find((b) => b.leaveTypeId === form.leaveTypeId);

  // Real-time validation with debounce
  useEffect(() => {
    if (!form.leaveTypeId || !form.startDate || !form.endDate) return;

    if (validationDebounce) clearTimeout(validationDebounce);

    const timer = setTimeout(() => {
      void validate({
        leaveTypeId: form.leaveTypeId,
        startDate: form.startDate,
        endDate: form.endDate,
        halfDay: form.halfDay,
        halfDayPeriod: form.halfDayPeriod,
        reason: form.reason,
      });
    }, 500);

    setValidationDebounce(timer);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.leaveTypeId, form.startDate, form.endDate, form.halfDay]);

  const updateForm = useCallback(
    (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch })),
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.leaveTypeId || !form.startDate || !form.endDate) return;

      const result = await submit({
        leaveTypeId: form.leaveTypeId,
        startDate: form.startDate,
        endDate: form.endDate,
        halfDay: form.halfDay,
        halfDayPeriod: form.halfDayPeriod,
        reason: form.reason,
      });

      if (result) {
        setForm(EMPTY_FORM);
        onSuccess(result);
      }
    },
    [form, submit, onSuccess]
  );

  const handleClose = useCallback(() => {
    setForm(EMPTY_FORM);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const canSubmit =
    form.leaveTypeId &&
    form.startDate &&
    form.endDate &&
    !isSubmitting &&
    !(validationResult && !validationResult.valid);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-request-dialog-title"
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 animate-slide-up"
      >
        <div className="glass-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2
              id="leave-request-dialog-title"
              className="font-display text-lg font-semibold text-text-primary"
            >
              Request Leave
            </h2>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close dialog"
              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={(e) => void handleSubmit(e)} className="p-6">
            <div className="flex flex-col gap-4">
              {/* Leave type selector */}
              <div>
                <label
                  htmlFor="leave-type"
                  className="mb-1.5 block text-xs font-medium text-text-secondary"
                >
                  Leave Type
                </label>
                {balances.length === 0 ? (
                  <p className="text-sm text-text-tertiary">
                    No leave types available
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {balances.map((b) => (
                      <LeaveTypeButton
                        key={b.leaveTypeId}
                        balance={b}
                        selected={form.leaveTypeId === b.leaveTypeId}
                        onClick={() =>
                          updateForm({ leaveTypeId: b.leaveTypeId })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="start-date"
                    className="mb-1.5 block text-xs font-medium text-text-secondary"
                  >
                    Start Date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => updateForm({ startDate: e.target.value })}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary focus:border-accent-indigo/50 focus:outline-none focus:ring-1 focus:ring-accent-indigo/30"
                  />
                </div>
                <div>
                  <label
                    htmlFor="end-date"
                    className="mb-1.5 block text-xs font-medium text-text-secondary"
                  >
                    End Date
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(e) => updateForm({ endDate: e.target.value })}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary focus:border-accent-indigo/50 focus:outline-none focus:ring-1 focus:ring-accent-indigo/30"
                  />
                </div>
              </div>

              {/* Half-day toggle */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-sm font-medium text-text-primary">
                  Half Day
                </p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.halfDay}
                  onClick={() => updateForm({ halfDay: !form.halfDay })}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    form.halfDay ? "bg-accent-indigo" : "bg-white/10"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                      form.halfDay ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>

              {form.halfDay && (
                <div className="flex gap-2">
                  {(["morning", "afternoon"] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => updateForm({ halfDayPeriod: period })}
                      className={cn(
                        "flex-1 rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors",
                        form.halfDayPeriod === period
                          ? "border-accent-indigo/50 bg-accent-indigo/10 text-accent-indigo"
                          : "border-white/10 bg-white/5 text-text-secondary hover:border-white/20"
                      )}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              )}

              {/* Reason */}
              <div>
                <label
                  htmlFor="reason"
                  className="mb-1.5 block text-xs font-medium text-text-secondary"
                >
                  Reason{" "}
                  <span className="text-text-tertiary">(optional)</span>
                </label>
                <textarea
                  id="reason"
                  rows={3}
                  value={form.reason}
                  onChange={(e) => updateForm({ reason: e.target.value })}
                  placeholder="Add a note for your manager…"
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-accent-indigo/50 focus:outline-none focus:ring-1 focus:ring-accent-indigo/30"
                />
              </div>

              {/* Balance preview */}
              {selectedBalance && validationResult && (
                <BalancePreview
                  balance={selectedBalance}
                  workingDays={validationResult.workingDays}
                  balanceAfter={validationResult.balanceAfter}
                  warnings={validationResult.warnings}
                  errors={validationResult.errors}
                  isValidating={isValidating}
                />
              )}

              {/* Submit error */}
              {submitError && (
                <p
                  role="alert"
                  className="rounded-xl border border-accent-rose/30 bg-accent-rose/10 px-3 py-2 text-sm text-accent-rose"
                >
                  {submitError}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-white/20 hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                  canSubmit
                    ? "bg-accent-indigo text-white hover:bg-accent-indigo/90"
                    : "cursor-not-allowed bg-white/10 text-text-tertiary"
                )}
              >
                {isSubmitting ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

/* =========================================================================
   Sub-components
   ========================================================================= */

function LeaveTypeButton({
  balance,
  selected,
  onClick,
}: {
  readonly balance: LeaveBalance;
  readonly selected: boolean;
  readonly onClick: () => void;
}) {
  const usedPercent = Math.min(
    100,
    (balance.usedDays / Math.max(1, balance.totalDays)) * 100
  );
  const isLow = balance.remainingDays / Math.max(1, balance.totalDays) < 0.2;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1 rounded-xl border p-3 text-left transition-all",
        selected
          ? "border-accent-indigo/50 bg-accent-indigo/10"
          : isLow
            ? "border-accent-amber/30 bg-accent-amber/5 hover:border-accent-amber/50"
            : "border-white/10 bg-white/5 hover:border-white/20"
      )}
      aria-pressed={selected}
    >
      <p
        className={cn(
          "text-xs font-semibold",
          selected ? "text-accent-indigo" : "text-text-primary"
        )}
      >
        {balance.leaveTypeName}
      </p>
      <p
        className={cn(
          "font-mono text-xs",
          isLow ? "text-accent-amber" : "text-text-secondary"
        )}
      >
        {balance.remainingDays}d left
      </p>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isLow ? "bg-accent-amber" : "bg-accent-emerald"
          )}
          style={{ width: `${usedPercent}%` }}
        />
      </div>
    </button>
  );
}

function BalancePreview({
  balance,
  workingDays,
  balanceAfter,
  warnings,
  errors,
  isValidating,
}: {
  readonly balance: LeaveBalance;
  readonly workingDays: number;
  readonly balanceAfter: number;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly isValidating: boolean;
}) {
  if (isValidating) {
    return (
      <div className="shimmer h-16 rounded-xl" aria-busy="true" aria-label="Validating…" />
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">
          {workingDays} working day{workingDays !== 1 ? "s" : ""}
        </span>
        <span className="font-mono text-text-secondary">
          {balance.remainingDays}d{" "}
          <span className="text-text-tertiary">→</span>{" "}
          <span
            className={cn(
              "font-semibold",
              balanceAfter < 0 ? "text-accent-rose" : "text-accent-emerald"
            )}
          >
            {balanceAfter}d
          </span>
        </span>
      </div>

      {errors.map((err, i) => (
        <p key={i} className="mt-1.5 text-xs text-accent-rose">
          {err}
        </p>
      ))}

      {warnings.map((w, i) => (
        <p key={i} className="mt-1.5 text-xs text-accent-amber">
          {w}
        </p>
      ))}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
    </svg>
  );
}
