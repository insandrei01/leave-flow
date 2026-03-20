/**
 * WorkflowNode — visual node for workflow builder/preview.
 *
 * Displays a step in the workflow (e.g., manager approval, HR review).
 * Used in workflow preview cards and the workflow builder canvas.
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export type WorkflowNodeType =
  | "start"
  | "approval"
  | "notification"
  | "condition"
  | "end";

export interface WorkflowNodeProps {
  readonly type: WorkflowNodeType;
  readonly label: string;
  readonly sublabel?: string;
  readonly isActive?: boolean;
  readonly className?: string;
}

/* =========================================================================
   Config
   ========================================================================= */

const NODE_CONFIG: Record<
  WorkflowNodeType,
  { icon: React.ReactNode; accent: string; bg: string }
> = {
  start: {
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
      </svg>
    ),
    accent: "text-accent-emerald",
    bg: "bg-accent-emerald/15",
  },
  approval: {
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    accent: "text-accent-indigo",
    bg: "bg-accent-indigo/15",
  },
  notification: {
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
    accent: "text-accent-cyan",
    bg: "bg-accent-cyan/15",
  },
  condition: {
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
      </svg>
    ),
    accent: "text-accent-amber",
    bg: "bg-accent-amber/15",
  },
  end: {
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <rect x="9" y="9" width="6" height="6" fill="currentColor" />
      </svg>
    ),
    accent: "text-text-tertiary",
    bg: "bg-white/5",
  },
};

/* =========================================================================
   Component
   ========================================================================= */

export function WorkflowNode({
  type,
  label,
  sublabel,
  isActive = false,
  className,
}: WorkflowNodeProps) {
  const config = NODE_CONFIG[type];

  return (
    <div
      className={cn(
        "glass-card flex items-center gap-3 p-3 transition-all duration-400",
        isActive && "ring-1 ring-accent-indigo/40",
        className
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          config.bg,
          config.accent
        )}
      >
        {config.icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {sublabel && (
          <p className="text-xs text-text-tertiary">{sublabel}</p>
        )}
      </div>
    </div>
  );
}
