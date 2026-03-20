"use client";

/**
 * CalendarLegend — leave type colors + status style explanations.
 */

interface LegendItem {
  readonly label: string;
  readonly color: string;
  readonly variant: "solid" | "dashed" | "strikethrough";
}

const STATUS_LEGEND: readonly LegendItem[] = [
  { label: "Approved", color: "#34D399", variant: "solid" },
  { label: "Pending", color: "#FBBF24", variant: "dashed" },
  { label: "Rejected", color: "#FB7185", variant: "strikethrough" },
];

interface CalendarLegendProps {
  readonly leaveTypes?: readonly { name: string; color: string }[];
}

export function CalendarLegend({
  leaveTypes = [],
}: CalendarLegendProps): React.ReactElement {
  return (
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/5 bg-surface-secondary/50 px-4 py-3"
      aria-label="Calendar legend"
      role="region"
    >
      {/* Status styles */}
      <div className="flex items-center gap-4">
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
          Status
        </span>
        {STATUS_LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="relative h-3 w-8 overflow-hidden rounded-sm"
              style={{
                border:
                  item.variant === "dashed"
                    ? `1.5px dashed ${item.color}`
                    : `1px solid ${item.color}60`,
                backgroundColor:
                  item.variant === "solid" ? `${item.color}40` : "transparent",
              }}
              aria-hidden="true"
            >
              {item.variant === "strikethrough" && (
                <div
                  className="absolute inset-y-1/2 h-px w-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
            </div>
            <span className="text-[11px] text-text-secondary">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Coverage warnings */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
          Coverage
        </span>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-5 rounded-sm bg-accent-amber/50" aria-hidden="true" />
          <span className="text-[11px] text-text-secondary">Below threshold</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-5 rounded-sm bg-accent-rose/50" aria-hidden="true" />
          <span className="text-[11px] text-text-secondary">Critical</span>
        </div>
      </div>

      {/* Leave types */}
      {leaveTypes.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
            Types
          </span>
          {leaveTypes.map((lt) => (
            <div key={lt.name} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: lt.color }}
                aria-hidden="true"
              />
              <span className="text-[11px] text-text-secondary">{lt.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
