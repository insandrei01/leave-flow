"use client";

/**
 * RejectDialog — modal for entering a rejection reason.
 *
 * Requires at least 10 characters in the reason field before
 * enabling the submit button. Calls onConfirm with the reason string.
 */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

/* =========================================================================
   Constants
   ========================================================================= */

const MIN_REASON_LENGTH = 10;

/* =========================================================================
   Props
   ========================================================================= */

interface RejectDialogProps {
  readonly isOpen: boolean;
  readonly requestId: string;
  readonly employeeName: string;
  readonly isRejecting: boolean;
  readonly onConfirm: (reason: string) => void;
  readonly onCancel: () => void;
}

/* =========================================================================
   Component
   ========================================================================= */

export function RejectDialog({
  isOpen,
  requestId: _requestId,
  employeeName,
  isRejecting,
  onConfirm,
  onCancel,
}: RejectDialogProps) {
  const [reason, setReason] = useState("");

  const isValid = reason.trim().length >= MIN_REASON_LENGTH;
  const remaining = Math.max(0, MIN_REASON_LENGTH - reason.trim().length);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValid || isRejecting) return;
      onConfirm(reason.trim());
    },
    [isValid, isRejecting, reason, onConfirm]
  );

  const handleCancel = useCallback(() => {
    setReason("");
    onCancel();
  }, [onCancel]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-dialog-title"
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 animate-slide-up"
      >
        <div className="glass-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/10 px-6 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-rose/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-4 w-4 text-accent-rose"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h2
                id="reject-dialog-title"
                className="font-display text-base font-semibold text-text-primary"
              >
                Reject Request
              </h2>
              <p className="text-xs text-text-secondary">
                For {employeeName}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-4">
              <label
                htmlFor="reject-reason"
                className="mb-1.5 block text-sm font-medium text-text-primary"
              >
                Reason for rejection
              </label>
              <p className="mb-3 text-xs text-text-secondary">
                This reason will be shared with the employee. Please be clear and
                professional.
              </p>
              <textarea
                id="reject-reason"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. The requested dates conflict with a critical project deadline. Please consider alternative dates."
                className={cn(
                  "w-full resize-none rounded-xl border bg-white/5 px-3 py-2 text-sm text-text-primary placeholder-text-tertiary",
                  "focus:outline-none focus:ring-1 focus:ring-accent-indigo/30",
                  isValid
                    ? "border-white/10 focus:border-accent-indigo/50"
                    : reason.length > 0
                      ? "border-accent-rose/30 focus:border-accent-rose/50"
                      : "border-white/10 focus:border-accent-indigo/50"
                )}
                aria-invalid={reason.length > 0 && !isValid}
                aria-describedby="reason-hint"
              />
              <p
                id="reason-hint"
                className={cn(
                  "mt-1 text-xs",
                  !isValid && reason.length > 0
                    ? "text-accent-amber"
                    : "text-text-tertiary"
                )}
              >
                {isValid
                  ? `${reason.trim().length} characters`
                  : remaining === 0
                    ? "Minimum reached"
                    : `${remaining} more character${remaining !== 1 ? "s" : ""} required`}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isRejecting}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-white/20 hover:text-text-primary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid || isRejecting}
                className={cn(
                  "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                  isValid && !isRejecting
                    ? "bg-accent-rose text-white hover:bg-accent-rose/90"
                    : "cursor-not-allowed bg-white/10 text-text-tertiary"
                )}
              >
                {isRejecting ? "Rejecting…" : "Reject Request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
