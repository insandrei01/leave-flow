"use client";

/**
 * KpiGrid — bento layout container with varying col/row spans for dashboard widgets.
 */

import type { DashboardSummary } from "@/hooks/use-dashboard";
import { OutTodayCard } from "./out-today-card";
import { PendingApprovalsCard } from "./pending-approvals-card";
import { UtilizationCard } from "./utilization-card";
import { UpcomingWeekCard } from "./upcoming-week-card";
import { AbsenceHeatmap } from "./absence-heatmap";
import { ResolutionRateCard } from "./resolution-rate-card";
import { ActivityFeed } from "./activity-feed";
import { NeedsAttentionCard } from "./needs-attention-card";
import { TeamBalancesCard } from "./team-balances-card";

interface KpiGridProps {
  readonly data: DashboardSummary;
  readonly onRequestClick?: (id: string) => void;
  readonly onDayClick?: (date: string) => void;
  readonly onViewAllPending?: () => void;
}

export function KpiGrid({
  data,
  onRequestClick,
  onDayClick,
  onViewAllPending,
}: KpiGridProps): React.ReactElement {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: "repeat(4, 1fr)",
        gridTemplateRows: "auto",
      }}
      role="region"
      aria-label="Dashboard overview"
    >
      {/* Row 1: 4 KPI cards */}
      <div style={{ gridColumn: "1", gridRow: "1" }}>
        <OutTodayCard data={data.outToday} />
      </div>
      <div style={{ gridColumn: "2", gridRow: "1" }}>
        <PendingApprovalsCard
          data={data.pendingApprovals}
          onViewAll={onViewAllPending}
        />
      </div>
      <div style={{ gridColumn: "3", gridRow: "1" }}>
        <UtilizationCard data={data.utilization} />
      </div>
      <div style={{ gridColumn: "4", gridRow: "1" }}>
        <UpcomingWeekCard data={data.upcomingWeek} />
      </div>

      {/* Row 2-3: Heatmap (span 2 cols) + Resolution (1 col) + Activity (1 col) */}
      <div style={{ gridColumn: "1 / span 2", gridRow: "2 / span 2" }}>
        <AbsenceHeatmap data={data.heatmap} onDayClick={onDayClick} />
      </div>
      <div style={{ gridColumn: "3", gridRow: "2" }}>
        <ResolutionRateCard data={data.resolution} />
      </div>
      <div style={{ gridColumn: "4", gridRow: "2 / span 2" }}>
        <ActivityFeed events={data.recentActivity} />
      </div>
      <div style={{ gridColumn: "3", gridRow: "3" }}>
        <TeamBalancesCard teams={data.teamBalances} />
      </div>

      {/* Row 4: Needs attention (full width) */}
      <div style={{ gridColumn: "1 / span 4", gridRow: "4" }}>
        <NeedsAttentionCard
          requests={data.needsAttention}
          onRequestClick={onRequestClick}
        />
      </div>
    </div>
  );
}
