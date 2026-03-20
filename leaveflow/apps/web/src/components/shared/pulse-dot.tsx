/**
 * PulseDot — pulsing indicator dot for active/in-progress states.
 *
 * Used in approval journey and status indicators to show real-time activity.
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export type PulseDotColor = "indigo" | "emerald" | "amber" | "rose" | "cyan";

export interface PulseDotProps {
  readonly color?: PulseDotColor;
  readonly size?: "sm" | "md" | "lg";
  readonly className?: string;
  /** When true, omits the pulse ring (static dot only). */
  readonly noPulse?: boolean;
}

/* =========================================================================
   Config
   ========================================================================= */

const COLOR_MAP: Record<PulseDotColor, { dot: string; ring: string }> = {
  indigo: {
    dot: "bg-accent-indigo",
    ring: "bg-accent-indigo/30",
  },
  emerald: {
    dot: "bg-accent-emerald",
    ring: "bg-accent-emerald/30",
  },
  amber: {
    dot: "bg-accent-amber",
    ring: "bg-accent-amber/30",
  },
  rose: {
    dot: "bg-accent-rose",
    ring: "bg-accent-rose/30",
  },
  cyan: {
    dot: "bg-accent-cyan",
    ring: "bg-accent-cyan/30",
  },
};

const SIZE_MAP: Record<"sm" | "md" | "lg", { outer: string; inner: string }> = {
  sm: { outer: "h-3 w-3", inner: "h-1.5 w-1.5" },
  md: { outer: "h-4 w-4", inner: "h-2 w-2" },
  lg: { outer: "h-5 w-5", inner: "h-2.5 w-2.5" },
};

/* =========================================================================
   Component
   ========================================================================= */

export function PulseDot({
  color = "indigo",
  size = "md",
  className,
  noPulse = false,
}: PulseDotProps) {
  const colors = COLOR_MAP[color];
  const sizes = SIZE_MAP[size];

  return (
    <span
      className={cn("relative inline-flex items-center justify-center", sizes.outer, className)}
      aria-hidden="true"
    >
      {!noPulse && (
        <span
          className={cn(
            "absolute animate-ping rounded-full",
            colors.ring,
            sizes.outer
          )}
        />
      )}
      <span className={cn("relative rounded-full", colors.dot, sizes.inner)} />
    </span>
  );
}
