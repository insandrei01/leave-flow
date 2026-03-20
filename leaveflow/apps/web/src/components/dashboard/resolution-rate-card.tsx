"use client";

/**
 * ResolutionRateCard — conic-gradient donut chart.
 *
 * Segments: approved (emerald), rejected (rose), pending (amber).
 */

import type { ResolutionData } from "@/hooks/use-dashboard";

interface ResolutionRateCardProps {
  readonly data: ResolutionData;
}

interface Segment {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

export function ResolutionRateCard({
  data,
}: ResolutionRateCardProps): React.ReactElement {
  const total = data.total || 1;

  const segments: readonly Segment[] = [
    { label: "Approved", value: data.approved, color: "#34D399" },
    { label: "Pending", value: data.pending, color: "#FBBF24" },
    { label: "Rejected", value: data.rejected, color: "#FB7185" },
  ];

  /* Build conic-gradient string */
  let angle = 0;
  const gradientParts: string[] = [];
  for (const seg of segments) {
    const degrees = (seg.value / total) * 360;
    if (degrees > 0) {
      gradientParts.push(`${seg.color} ${angle}deg ${angle + degrees}deg`);
      angle += degrees;
    }
  }
  const gradient =
    gradientParts.length > 0
      ? `conic-gradient(${gradientParts.join(", ")})`
      : "conic-gradient(rgba(255,255,255,0.06) 0deg 360deg)";

  const approvalRate =
    data.total > 0 ? Math.round((data.approved / data.total) * 100) : 0;

  return (
    <div className="glass-card flex flex-col gap-4 p-5">
      <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
        Resolution rate
      </p>

      <div className="flex items-center gap-6">
        {/* Donut chart */}
        <div className="relative h-20 w-20 shrink-0" aria-hidden="true">
          <div
            className="h-20 w-20 rounded-full"
            style={{ background: gradient }}
          />
          {/* Hole */}
          <div className="absolute inset-[12px] flex flex-col items-center justify-center rounded-full bg-surface-primary">
            <span className="font-display text-base font-bold text-text-primary">
              {approvalRate}%
            </span>
            <span className="font-mono text-[8px] text-text-tertiary">approved</span>
          </div>
        </div>

        {/* Legend */}
        <div
          className="flex flex-col gap-2"
          role="list"
          aria-label="Resolution breakdown"
        >
          {segments.map((seg) => (
            <div
              key={seg.label}
              role="listitem"
              className="flex items-center gap-2"
            >
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: seg.color }}
                aria-hidden="true"
              />
              <span className="text-xs text-text-secondary">{seg.label}</span>
              <span className="ml-auto font-mono text-xs font-semibold text-text-primary">
                {seg.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="font-mono text-[11px] text-text-tertiary">
        {data.total} requests this month
      </p>
    </div>
  );
}
