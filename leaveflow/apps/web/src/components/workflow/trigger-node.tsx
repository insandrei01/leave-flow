"use client";

/**
 * TriggerNode — start node for the workflow flow diagram.
 *
 * Represents the "Leave Request Submitted" trigger that initiates
 * the approval workflow. Used in both the step list and live preview.
 */

/* =========================================================================
   Props
   ========================================================================= */

interface TriggerNodeProps {
  /** Optional custom label. Defaults to "Leave Request Submitted". */
  readonly label?: string;
  /** Optional custom sub-label. */
  readonly sublabel?: string;
}

/* =========================================================================
   Component
   ========================================================================= */

export function TriggerNode({
  label = "Leave Request Submitted",
  sublabel = "Triggers when an employee submits a leave request",
}: TriggerNodeProps) {
  return (
    <div
      className="glass-card flex items-center gap-3 border-l-4 border-l-accent-emerald p-4"
      role="img"
      aria-label={`Workflow start: ${label}`}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-emerald/20">
        <TriggerIcon />
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

function TriggerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4 text-accent-emerald"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.15-.043l4.25-5.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
