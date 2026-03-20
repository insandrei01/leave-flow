"use client";

/**
 * SearchInput — glass-styled search field with magnifier icon.
 */

import { cn } from "@/lib/utils";

export interface SearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly "aria-label"?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  disabled,
  "aria-label": ariaLabel = "Search",
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Icon */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-tertiary"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </span>

      <input
        type="search"
        role="searchbox"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full rounded-xl border border-border-glass bg-surface-glass py-2 pl-9 pr-4",
          "text-sm text-text-primary placeholder:text-text-tertiary",
          "backdrop-blur-glass-sm outline-none",
          "transition-colors duration-300",
          "focus:border-accent-indigo/50 focus:bg-white/5",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute inset-y-0 right-3 flex items-center text-text-tertiary transition-colors hover:text-text-secondary"
        >
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
