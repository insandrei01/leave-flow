/**
 * ApprovalDonut — conic gradient donut chart for approval resolution rates.
 *
 * Segments: approved (emerald), pending (amber), rejected (rose).
 */

import { COLORS } from "@/styles/design-tokens";
import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface ApprovalDonutProps {
  readonly approved: number;
  readonly pending: number;
  readonly rejected: number;
  readonly total: number;
  readonly size?: number;
  readonly className?: string;
}

/* =========================================================================
   Helpers
   ========================================================================= */

function buildConicGradient(
  approved: number,
  pending: number,
  rejected: number,
  total: number
): string {
  if (total === 0) {
    return `conic-gradient(rgba(255,255,255,0.06) 0deg 360deg)`;
  }

  const approvedDeg = (approved / total) * 360;
  const pendingDeg = (pending / total) * 360;
  const rejectedDeg = (rejected / total) * 360;

  const segments: string[] = [];
  let current = 0;

  if (approvedDeg > 0) {
    segments.push(`${COLORS.accent.emerald}CC ${current}deg ${current + approvedDeg}deg`);
    current += approvedDeg;
  }
  if (pendingDeg > 0) {
    segments.push(`${COLORS.accent.amber}CC ${current}deg ${current + pendingDeg}deg`);
    current += pendingDeg;
  }
  if (rejectedDeg > 0) {
    segments.push(`${COLORS.accent.rose}CC ${current}deg ${current + rejectedDeg}deg`);
    current += rejectedDeg;
  }

  return `conic-gradient(${segments.join(", ")})`;
}

/* =========================================================================
   Component
   ========================================================================= */

export function ApprovalDonut({
  approved,
  pending,
  rejected,
  total,
  size = 80,
  className,
}: ApprovalDonutProps) {
  const conicGradient = buildConicGradient(approved, pending, rejected, total);
  const innerSize = Math.round(size * 0.6);
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <div
      role="img"
      aria-label={`Approval rate: ${approvalRate}%. Approved: ${approved}, Pending: ${pending}, Rejected: ${rejected}`}
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Outer donut */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{ background: conicGradient }}
      />

      {/* Inner cutout */}
      <div
        aria-hidden="true"
        className="absolute rounded-full bg-surface-secondary"
        style={{ width: innerSize, height: innerSize }}
      />

      {/* Center text */}
      <div className="relative z-10 flex flex-col items-center">
        <span className="font-display text-base font-bold text-text-primary">
          {approvalRate}%
        </span>
        <span className="font-mono text-[9px] text-text-tertiary">approved</span>
      </div>
    </div>
  );
}
