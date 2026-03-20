"use client";

/**
 * ConfirmDialog — reusable confirmation modal for destructive actions.
 */

import { GlassModal } from "./glass-modal";

interface ConfirmDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="mb-6 text-sm text-text-secondary">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="rounded-xl bg-accent-rose/20 px-4 py-2 text-sm font-medium text-accent-rose transition-colors hover:bg-accent-rose/30 disabled:opacity-50"
        >
          {isLoading ? "Processing..." : confirmLabel}
        </button>
      </div>
    </GlassModal>
  );
}
