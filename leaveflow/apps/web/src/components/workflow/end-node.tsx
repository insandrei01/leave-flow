"use client";

/**
 * EndNode — terminal node for the workflow flow diagram.
 *
 * Represents the "Final Decision" state at the end of the approval
 * workflow. Used in both the step list and live preview.
 */

/* =========================================================================
   Props
   ========================================================================= */

interface EndNodeProps {
  /** Optional custom label. Defaults to "Final Decision". */
  readonly label?: string;
  /** Optional custom sub-label. */
  readonly sublabel?: string;
}

/* =========================================================================
   Component
   ========================================================================= */

export function EndNode({
  label = "Final Decision",
  sublabel = "Leave approved, rejected, or auto-approved by timeout",
}: EndNodeProps) {
  return (
    <div
      className="glass-card flex items-center gap-3 border-l-4 border-l-accent-emerald p-4"
      role="img"
      aria-label={`Workflow end: ${label}`}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-emerald/20">
        <EndIcon />
      </div>
      <div>
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary">{sublabel}</p>
      </div>
    </div>
  );
}

/* =========================================================================
   Icons
   ========================================================================= */

function EndIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4 text-accent-emerald"
      aria-hidden="true"
    >
      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path
        fillRule="evenodd"
        d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm0-1.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
