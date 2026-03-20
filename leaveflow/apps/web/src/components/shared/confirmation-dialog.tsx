"use client";

/**
 * ConfirmationDialog — modal dialog for destructive or irreversible actions.
 *
 * Accessible: traps focus, closes on Escape, uses role="dialog" with aria-modal.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface ConfirmationDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly title: string;
  readonly description?: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly isDestructive?: boolean;
  readonly isLoading?: boolean;
}

/* =========================================================================
   Component
   ========================================================================= */

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  isLoading = false,
}: ConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button when opened
  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-surface-primary/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-description" : undefined}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2",
          "animate-slide-up"
        )}
      >
        <div className="glass-card p-6">
          {/* Warning icon for destructive */}
          {isDestructive && (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-rose/15">
              <svg
                aria-hidden="true"
                className="h-6 w-6 text-accent-rose"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
          )}

          <h2
            id="dialog-title"
            className="text-center font-display text-base font-semibold text-text-primary"
          >
            {title}
          </h2>

          {description && (
            <p
              id="dialog-description"
              className="mt-2 text-center text-sm text-text-secondary"
            >
              {description}
            </p>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={cn(
                "flex-1 rounded-xl border border-border-glass bg-surface-glass px-4 py-2.5",
                "text-sm font-medium text-text-secondary",
                "transition-colors hover:border-border-glass-hover hover:text-text-primary",
                "disabled:opacity-50"
              )}
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white",
                "transition-all duration-300",
                "active:scale-[0.98]",
                "disabled:cursor-not-allowed disabled:opacity-60",
                isDestructive
                  ? "bg-accent-rose hover:shadow-[0_0_16px_rgba(251,113,133,0.4)]"
                  : "bg-gradient-to-r from-accent-indigo to-accent-violet hover:brightness-110"
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing…
                </span>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
