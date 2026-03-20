"use client";

/**
 * TeamGroup — collapsible section: team name header + employee lanes.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { EmployeeLane } from "./employee-lane";
import { CoverageWarningRow } from "./coverage-warning-row";
import type { CalendarTeam, CalendarAbsence, CoverageWarning } from "@/hooks/use-calendar";
import type { DayColumn } from "./date-header";

/* =========================================================================
   Constants
   ========================================================================= */

const ROW_HEIGHT = 40;

/* =========================================================================
   Types
   ========================================================================= */

interface TeamGroupProps {
  readonly team: CalendarTeam;
  readonly absences: readonly CalendarAbsence[];
  readonly coverageWarnings: readonly CoverageWarning[];
  readonly days: readonly DayColumn[];
  readonly employeeColumnWidth: number;
  readonly onAbsenceClick?: (absenceId: string) => void;
}

/* =========================================================================
   Component
   ========================================================================= */

export function TeamGroup({
  team,
  absences,
  coverageWarnings,
  days,
  employeeColumnWidth,
  onAbsenceClick,
}: TeamGroupProps): React.ReactElement {
  const [collapsed, setCollapsed] = useState(false);

  const teamAbsences = absences.filter((a) => a.teamId === team.teamId);

  return (
    <div
      className="border-b border-white/5"
      role="rowgroup"
      aria-label={`${team.teamName} team`}
    >
      {/* Team header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        aria-controls={`team-${team.teamId}-lanes`}
        className={cn(
          "flex w-full items-center gap-2 border-b border-white/5 bg-surface-secondary/50 px-4 py-2 text-left transition-colors hover:bg-white/5"
        )}
        style={{ height: 36 }}
      >
        {/* Collapse icon */}
        <svg
          viewBox="0 0 12 12"
          fill="none"
          className={cn(
            "h-3 w-3 shrink-0 text-text-tertiary transition-transform duration-400",
            collapsed ? "-rotate-90" : "rotate-0"
          )}
          aria-hidden="true"
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span
          className="font-display text-xs font-semibold text-text-secondary"
          style={{ width: employeeColumnWidth - 24 }}
        >
          {team.teamName}
        </span>

        <span className="ml-2 font-mono text-[10px] text-text-tertiary">
          {team.employees.length} {team.employees.length === 1 ? "member" : "members"}
        </span>

        {/* Absence count badge */}
        {teamAbsences.length > 0 && (
          <span className="ml-auto rounded-full bg-accent-indigo/20 px-2 py-0.5 font-mono text-[9px] text-accent-indigo">
            {teamAbsences.length} away
          </span>
        )}
      </button>

      {/* Employee lanes */}
      {!collapsed && (
        <div
          id={`team-${team.teamId}-lanes`}
          role="presentation"
        >
          {team.employees.map((emp) => {
            const empAbsences = teamAbsences.filter(
              (a) => a.employeeId === emp.id
            );
            return (
              <EmployeeLane
                key={emp.id}
                employeeId={emp.id}
                employeeName={emp.name}
                initials={emp.initials}
                absences={empAbsences}
                days={days}
                employeeColumnWidth={employeeColumnWidth}
                rowHeight={ROW_HEIGHT}
                onAbsenceClick={onAbsenceClick}
              />
            );
          })}

          {/* Coverage warning row */}
          <CoverageWarningRow
            teamId={team.teamId}
            warnings={coverageWarnings}
            days={days}
            employeeColumnWidth={employeeColumnWidth}
          />
        </div>
      )}
    </div>
  );
}
