"use client";

/**
 * EmployeeLane — single employee row with positioned absence bars.
 */

import { cn } from "@/lib/utils";
import { AbsenceBar } from "./absence-bar";
import type { CalendarAbsence, AbsenceStatus } from "@/hooks/use-calendar";
import type { DayColumn } from "./date-header";

/* =========================================================================
   Types
   ========================================================================= */

interface EmployeeLaneProps {
  readonly employeeId: string;
  readonly employeeName: string;
  readonly initials: string;
  readonly absences: readonly CalendarAbsence[];
  readonly days: readonly DayColumn[];
  readonly employeeColumnWidth: number;
  readonly rowHeight: number;
  readonly onAbsenceClick?: (absenceId: string) => void;
}

/* =========================================================================
   Helpers
   ========================================================================= */

function dateToIndex(
  isoDate: string,
  days: readonly DayColumn[]
): number {
  return days.findIndex((d) => d.date === isoDate);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getStatusLabel(status: AbsenceStatus): string {
  switch (status) {
    case "approved": return "Approved";
    case "pending_approval": return "Pending";
    case "rejected": return "Rejected";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}

/* =========================================================================
   Component
   ========================================================================= */

export function EmployeeLane({
  employeeName,
  initials,
  absences,
  days,
  employeeColumnWidth,
  rowHeight,
  onAbsenceClick,
}: EmployeeLaneProps): React.ReactElement {
  return (
    <div
      className="flex items-center border-b border-white/3 hover:bg-white/2 transition-colors"
      style={{ height: rowHeight }}
      role="row"
      aria-label={employeeName}
    >
      {/* Employee name column */}
      <div
        className="flex shrink-0 items-center gap-2 border-r border-white/5 px-3"
        style={{ width: employeeColumnWidth, height: rowHeight }}
      >
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-indigo/20 font-mono text-[9px] font-semibold text-accent-indigo"
          aria-hidden="true"
        >
          {initials}
        </div>
        <span className="truncate text-xs text-text-secondary">{employeeName}</span>
      </div>

      {/* Timeline area */}
      <div
        className="relative flex-1"
        style={{ height: rowHeight }}
        role="gridcell"
        aria-label={`${employeeName} absence timeline`}
      >
        {/* Weekend column shading */}
        {days.map((day, i) => (
          day.isWeekend ? (
            <div
              key={day.date}
              className="absolute inset-y-0 bg-white/2"
              style={{
                left: `${(i / days.length) * 100}%`,
                width: `${(1 / days.length) * 100}%`,
              }}
              aria-hidden="true"
            />
          ) : null
        ))}

        {/* Today highlight */}
        {days.map((day, i) =>
          day.isToday ? (
            <div
              key={`today-${day.date}`}
              className="absolute inset-y-0 bg-accent-indigo/8"
              style={{
                left: `${(i / days.length) * 100}%`,
                width: `${(1 / days.length) * 100}%`,
              }}
              aria-hidden="true"
            />
          ) : null
        )}

        {/* Absence bars */}
        {absences.map((absence) => {
          const startIdx = dateToIndex(absence.startDate, days);
          const endIdx = dateToIndex(absence.endDate, days);

          if (startIdx === -1 && endIdx === -1) return null;

          const clampedStart = clamp(startIdx === -1 ? 0 : startIdx, 0, days.length - 1);
          const clampedEnd = clamp(endIdx === -1 ? days.length - 1 : endIdx, 0, days.length - 1);
          const spanDays = clampedEnd - clampedStart + 1;

          return (
            <AbsenceBar
              key={absence.id}
              label={absence.leaveType}
              color={absence.leaveTypeColor}
              status={absence.status}
              startOffset={clampedStart}
              spanDays={spanDays}
              totalDays={days.length}
              tooltip={`${absence.leaveType} — ${getStatusLabel(absence.status)} — ${absence.startDate} to ${absence.endDate}`}
              onClick={
                onAbsenceClick
                  ? () => onAbsenceClick(absence.id)
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
