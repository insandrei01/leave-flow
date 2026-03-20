"use client";

/**
 * MiniNodeDiagram — compact vertical node visualization.
 *
 * Renders a condensed flow diagram showing start node, approval step
 * nodes, and end node in a vertical layout. Used in template cards
 * and summary views where space is limited.
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface MiniNodeStep {
  readonly label: string;
  readonly sublabel?: string;
  /** Color variant for the node accent. Defaults to "indigo". */
  readonly color?: "indigo" | "violet" | "emerald" | "amber";
}

/* =========================================================================
   Props
   ========================================================================= */

interface MiniNodeDiagramProps {
  readonly steps: readonly MiniNodeStep[];
  /** Whether to show the start/end terminal nodes. Defaults to true. */
  readonly showTerminals?: boolean;
  /** Compact mode hides sublabels. Defaults to false. */
  readonly compact?: boolean;
}

/* =========================================================================
   Color maps
   ========================================================================= */

const NODE_COLORS: Record<
  NonNullable<MiniNodeStep["color"]>,
  { readonly border: string; readonly bg: string; readonly text: string; readonly dot: string }
> = {
  indigo: {
    border: "border-accent-indigo/30",
    bg: "bg-accent-indigo/10",
    text: "text-accent-indigo",
    dot: "bg-accent-indigo",
  },
  violet: {
    border: "border-accent-violet/30",
    bg: "bg-accent-violet/10",
    text: "text-accent-violet",
    dot: "bg-accent-violet",
  },
  emerald: {
    border: "border-accent-emerald/30",
    bg: "bg-accent-emerald/10",
    text: "text-accent-emerald",
    dot: "bg-accent-emerald",
  },
  amber: {
    border: "border-accent-amber/30",
    bg: "bg-accent-amber/10",
    text: "text-accent-amber",
    dot: "bg-accent-amber",
  },
};

const TERMINAL_STYLE =
  "border-dashed border-accent-emerald/30 bg-accent-emerald/5";

/* =========================================================================
   Component
   ========================================================================= */

export function MiniNodeDiagram({
  steps,
  showTerminals = true,
  compact = false,
}: MiniNodeDiagramProps) {
  return (
    <div
      className="flex flex-col items-center gap-0"
      role="img"
      aria-label={`Flow diagram with ${steps.length} step${steps.length !== 1 ? "s" : ""}`}
    >
      {/* Start terminal */}
      {showTerminals && (
        <>
          <TerminalNode label="Start" compact={compact} />
          <Connector />
        </>
      )}

      {/* Step nodes */}
      {steps.length === 0 ? (
        <EmptyNode />
      ) : (
        steps.map((step, index) => (
          <div key={index} className="flex w-full flex-col items-center">
            <StepNode step={step} stepNumber={index + 1} compact={compact} />
            <Connector />
          </div>
        ))
      )}

      {/* End terminal */}
      {showTerminals && <TerminalNode label="End" compact={compact} />}
    </div>
  );
}

/* =========================================================================
   Sub-components
   ========================================================================= */

function TerminalNode({
  label,
  compact,
}: {
  readonly label: string;
  readonly compact: boolean;
}) {
  return (
    <div
      className={cn(
        "w-full rounded-lg border px-3 text-center",
        compact ? "py-1.5" : "py-2",
        TERMINAL_STYLE
      )}
    >
      <p className="text-xs font-semibold text-accent-emerald">{label}</p>
    </div>
  );
}

function StepNode({
  step,
  stepNumber,
  compact,
}: {
  readonly step: MiniNodeStep;
  readonly stepNumber: number;
  readonly compact: boolean;
}) {
  const color = step.color ?? (stepNumber % 2 === 0 ? "violet" : "indigo");
  const c = NODE_COLORS[color];

  return (
    <div
      className={cn(
        "w-full rounded-lg border px-3",
        compact ? "py-1.5" : "py-2",
        c.border,
        c.bg
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold",
            c.bg,
            c.text
          )}
        >
          {stepNumber}
        </span>
        <span className="truncate text-xs font-medium text-text-primary">
          {step.label}
        </span>
      </div>
      {!compact && step.sublabel && (
        <p className="mt-0.5 truncate text-[10px] text-text-tertiary">
          {step.sublabel}
        </p>
      )}
    </div>
  );
}

function EmptyNode() {
  return (
    <div className="w-full rounded-lg border border-dashed border-white/10 bg-white/3 px-3 py-2 text-center">
      <p className="text-xs text-text-tertiary">No steps</p>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex justify-center py-0">
      <div className="h-4 w-px bg-gradient-to-b from-white/10 to-white/20" />
    </div>
  );
}
