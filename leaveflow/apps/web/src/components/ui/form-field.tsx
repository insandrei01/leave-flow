"use client";

/**
 * FormField — labeled input wrapper with glass styling.
 */

import { cn } from "@/lib/utils";

interface FormFieldProps {
  readonly label: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function FormField({
  label,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-sm font-medium text-text-secondary">
        {label}
        {required && <span className="ml-1 text-accent-rose">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-accent-rose">{error}</p>
      )}
    </div>
  );
}

/** Glass-styled text input. */
export const glassInputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary transition-colors focus:border-accent-indigo/50 focus:outline-none focus:ring-1 focus:ring-accent-indigo/50 disabled:opacity-50";

/** Glass-styled select. */
export const glassSelectClass =
  "w-full rounded-xl border border-white/10 bg-surface-secondary px-3 py-2 text-sm text-text-primary transition-colors focus:border-accent-indigo/50 focus:outline-none focus:ring-1 focus:ring-accent-indigo/50 disabled:opacity-50";
