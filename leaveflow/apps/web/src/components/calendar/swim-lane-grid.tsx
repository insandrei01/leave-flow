"use client";

/**
 * SwimLaneGrid — container: date header row + team groups.
 *
 * Renders a horizontal scrollable swim-lane Gantt chart.
 */

import { useRef } from "react";
import { DateHeader, buildDayColumns } from "./date-header";
import { TeamGroup } from "./team-group";
import { CalendarLegend } from "./calendar-legend";
import type { CalendarData } from "@/hooks/use-calendar";

/* =========================================================================
   Constants
   ========================================================================= */

const EMPLOYEE_COLUMN_WIDTH = 180;

/* =========================================================================
   Types
   ========================================================================= */

interface SwimLaneGridProps {
  readonly data: CalendarData;
  readonly month: string;
  readonly onAbsenceClick?: (absenceId: string) => void;
}

/* =========================================================================
   Component
   ========================================================================= */

export function SwimLaneGrid({
  data,
  month,
  onAbsenceClick,
}: SwimLaneGridProps): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);
  const days = buildDayColumns(month);

  /* Collect unique leave types for legend */
  const leaveTypeMap = new Map<string, { name: string; color: string }>();
  for (const absence of data.absences) {
    if (!leaveTypeMap.has(absence.leaveType)) {
      leaveTypeMap.set(absence.leaveType, {
        name: absence.leaveType,
        color: absence.leaveTypeColor,
      });
    }
  }
  const leaveTypes = Array.from(leaveTypeMap.values());

  return (
    <div
      className="glass-card overflow-hidden"
      role="grid"
      aria-label="Absence calendar"
    >
      {/* Sticky date header */}
      <div className="sticky top-0 z-10">
        <DateHeader
          days={days}
          employeeColumnWidth={EMPLOYEE_COLUMN_WIDTH}
        />
      </div>

      {/* Scrollable team groups */}
      <div
        ref={scrollRef}
        className="overflow-y-auto scrollbar-none"
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        {data.teams.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-text-secondary">
              No teams or employees found for this period.
            </p>
          </div>
        ) : (
          data.teams.map((team) => (
            <TeamGroup
              key={team.teamId}
              team={team}
              absences={data.absences}
              coverageWarnings={data.coverageWarnings}
              days={days}
              employeeColumnWidth={EMPLOYEE_COLUMN_WIDTH}
              onAbsenceClick={onAbsenceClick}
            />
          ))
        )}
      </div>

      {/* Footer legend */}
      <CalendarLegend leaveTypes={leaveTypes} />
    </div>
  );
}
