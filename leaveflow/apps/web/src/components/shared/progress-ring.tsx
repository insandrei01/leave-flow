/**
 * ProgressRing — SVG circular progress indicator.
 *
 * Lightweight alternative to BalanceRing for inline use cases.
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface ProgressRingProps {
  /** 0–100 */
  readonly value: number;
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly color?: string;
  readonly trackColor?: string;
  /** Text displayed in the center. Defaults to "{value}%". */
  readonly centerLabel?: string;
  readonly className?: string;
  readonly ariaLabel?: string;
}

/* =========================================================================
   Component
   ========================================================================= */

export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 5,
  color = "#818CF8",
  trackColor = "rgba(255,255,255,0.06)",
  centerLabel,
  className,
  ariaLabel,
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  const displayLabel = centerLabel ?? `${Math.round(clamped)}%`;

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? `Progress: ${Math.round(clamped)}%`}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </svg>

      {/* Center label */}
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-semibold text-text-secondary">
        {displayLabel}
      </span>
    </div>
  );
}
