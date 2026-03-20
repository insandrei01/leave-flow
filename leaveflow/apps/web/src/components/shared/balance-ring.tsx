/**
 * BalanceRing — SVG radial progress ring for leave balance visualization.
 *
 * Renders a donut chart: used days as the filled arc, remaining as the track.
 * Color is determined by the leave type accent color.
 */

import { COLORS } from "@/styles/design-tokens";
import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface BalanceRingProps {
  /** Leave type label (e.g., "Vacation") */
  readonly label: string;
  /** Days used */
  readonly used: number;
  /** Total days entitlement */
  readonly total: number;
  /** Accent color for the filled arc (hex or CSS color) */
  readonly color?: string;
  /** Diameter in pixels. Default: 96 */
  readonly size?: number;
  /** Stroke width. Default: 8 */
  readonly strokeWidth?: number;
  readonly className?: string;
}

/* =========================================================================
   Component
   ========================================================================= */

export function BalanceRing({
  label,
  used,
  total,
  color = COLORS.accent.indigo,
  size = 96,
  strokeWidth = 8,
  className,
}: BalanceRingProps) {
  const remaining = Math.max(0, total - used);
  const percentage = total > 0 ? Math.min(used / total, 1) : 0;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percentage);

  // Warn when low balance (< 20% remaining)
  const isLow = total > 0 && remaining / total < 0.2;
  const displayColor = isLow ? COLORS.accent.amber : color;

  return (
    <div
      role="img"
      aria-label={`${label}: ${used} of ${total} days used, ${remaining} remaining`}
      className={cn("flex flex-col items-center gap-2", className)}
    >
      <div className="relative" style={{ width: size, height: size }}>
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
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={displayColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: "stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-xl font-bold text-text-primary">
            {remaining}
          </span>
          <span className="font-mono text-[9px] text-text-tertiary">left</span>
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="text-sm font-medium text-text-secondary">{label}</p>
        {isLow && (
          <p className="mt-0.5 text-xs text-accent-amber">Low balance</p>
        )}
      </div>
    </div>
  );
}
