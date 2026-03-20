"use client";

/**
 * GlassModal — accessible dialog with glassmorphic backdrop.
 *
 * Uses a native <dialog> element for focus trapping and a11y.
 * Renders a glass card panel centered on screen with a dark overlay.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface GlassModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function GlassModal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: GlassModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickedOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (clickedOutside) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClick={handleBackdropClick}
      className={cn(
        "m-auto w-full max-w-lg rounded-2xl border border-white/10",
        "bg-surface-secondary/90 backdrop-blur-glass p-0",
        "text-text-primary",
        // Override native dialog backdrop
        "open:flex open:flex-col",
        "[&::backdrop]:bg-black/60 [&::backdrop]:backdrop-blur-sm",
        className
      )}
    >
      {/* Prevent backdrop click from propagating into content */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-text-tertiary transition-colors hover:bg-white/10 hover:text-text-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </dialog>
  );
}
