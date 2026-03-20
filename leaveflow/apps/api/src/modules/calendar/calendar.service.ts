/**
 * Calendar service — swim-lane absence data and coverage calculation.
 *
 * Privacy rule BR-092: leaveTypeName is nullified for non-HR roles.
 * leaveTypeColor is always returned to allow color-coding.
 */

import mongoose from "mongoose";

// ----------------------------------------------------------------
// Model dependency interfaces
// ----------------------------------------------------------------

export interface LeaveRequestModelDep {
  find(query: Record<string, unknown>): {
    sort: (s: Record<string, unknown>) => ReturnType<this["find"]>;
    lean: <T>() => Promise<T[]>;
  };
  aggregate<T>(pipeline: Record<string, unknown>[]): Promise<T[]>;
}

export interface EmployeeModelDep {
  find(query: Record<string, unknown>): {
    select: (fields: string) => ReturnType<this["find"]>;
    lean: <T>() => Promise<T[]>;
  };
  countDocuments(query: Record<string, unknown>): Promise<number>;
}

export interface TeamModelDep {
  find(query: Record<string, unknown>): {
    lean: <T>() => Promise<T[]>;
  };
  findById(id: unknown): {
    lean: <T>() => Promise<T | null>;
  };
}

export interface LeaveTypeModelDep {
  find(query: Record<string, unknown>): {
    lean: <T>() => Promise<T[]>;
  };
}

export interface CalendarDeps {
  leaveRequestModel: LeaveRequestModelDep;
  employeeModel: EmployeeModelDep;
  teamModel: TeamModelDep;
  leaveTypeModel: LeaveTypeModelDep;
}

// ----------------------------------------------------------------
// Output types
// ----------------------------------------------------------------

export interface AbsenceEntry {
  requestId: string;
  startDate: Date;
  endDate: Date;
  workingDays: number;
  status: string;
  leaveTypeName: string | null;
  leaveTypeColor: string;
}

export interface TeamMemberAbsences {
  employeeId: string;
  employeeName: string;
  absences: AbsenceEntry[];
}

export interface CoverageWarning {
  date: string;
  membersOut: number;
  coveragePercent: number;
  belowThreshold: boolean;
}

export interface TeamAbsences {
  teamId: string;
  teamName: string;
  teamSize: number;
  members: TeamMemberAbsences[];
  coverageWarnings: CoverageWarning[];
}

export interface AbsencesResult {
  startDate: Date;
  endDate: Date;
  teams: TeamAbsences[];
}

export interface CoverageDay {
  date: string;
  absentCount: number;
  totalEmployees: number;
  coveragePercent: number;
  belowThreshold: boolean;
}

export interface CoverageResult {
  startDate: Date;
  endDate: Date;
  days: CoverageDay[];
  coverageThresholdPercent: number;
}

// ----------------------------------------------------------------
// Service interface
// ----------------------------------------------------------------

export interface CalendarService {
  getAbsences(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    callerRole: string,
    teamId?: string
  ): Promise<AbsencesResult>;
  getCoverage(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    teamId?: string
  ): Promise<CoverageResult>;
}

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const HR_ROLES = new Set(["hr_admin", "company_admin"]);
const DEFAULT_COVERAGE_THRESHOLD = 50;

// ----------------------------------------------------------------
// Factory
// ----------------------------------------------------------------

export function createCalendarService(deps: CalendarDeps): CalendarService {
  const { leaveRequestModel, employeeModel, teamModel, leaveTypeModel } = deps;

  return {
    async getAbsences(
      tenantId: string,
      startDate: Date,
      endDate: Date,
      callerRole: string,
      teamId?: string
    ): Promise<AbsencesResult> {
      const includeLeaveTypeName = HR_ROLES.has(callerRole);

      // Load teams scoped to the request
      type TeamRow = { _id: mongoose.Types.ObjectId; name: string };
      const teamQuery: Record<string, unknown> = { tenantId };
      if (teamId !== undefined) {
        if (!mongoose.isValidObjectId(teamId)) {
          return { startDate, endDate, teams: [] };
        }
        teamQuery["_id"] = new mongoose.Types.ObjectId(teamId);
      }

      const teams = await teamModel.find(teamQuery).lean<TeamRow[]>();

      if (teams.length === 0) {
        return { startDate, endDate, teams: [] };
      }

      // Load all employees grouped by team
      type EmpRow = {
        _id: mongoose.Types.ObjectId;
        firstName: string;
        lastName: string;
        teamId: mongoose.Types.ObjectId | null;
      };

      const teamIds = teams.map((t) => t._id);
      const employees = await employeeModel
        .find({ tenantId, teamId: { $in: teamIds }, status: "active" })
        .select("_id firstName lastName teamId")
        .lean<EmpRow[]>();

      if (employees.length === 0) {
        return {
          startDate,
          endDate,
          teams: teams.map((t) => ({
            teamId: t._id.toString(),
            teamName: t.name,
            teamSize: 0,
            members: [],
            coverageWarnings: [],
          })),
        };
      }

      const employeeIds = employees.map((e) => e._id);

      // Load leave requests in the date range (approved + pending_approval)
      type LeaveRow = {
        _id: mongoose.Types.ObjectId;
        employeeId: mongoose.Types.ObjectId;
        leaveTypeId: mongoose.Types.ObjectId;
        startDate: Date;
        endDate: Date;
        workingDays: number;
        status: string;
      };

      const leaveRequests = await leaveRequestModel
        .find({
          tenantId,
          employeeId: { $in: employeeIds },
          status: { $in: ["approved", "auto_approved", "pending_approval"] },
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
        })
        .sort({ startDate: 1 })
        .lean<LeaveRow[]>();

      // Load leave types for color/name lookup
      const leaveTypeIds = [...new Set(leaveRequests.map((r) => r.leaveTypeId.toString()))];
      const validLeaveTypeIds = leaveTypeIds.filter((id) => mongoose.isValidObjectId(id));

      type LeaveTypeRow = { _id: mongoose.Types.ObjectId; name: string; color: string };
      const leaveTypes = validLeaveTypeIds.length > 0
        ? await leaveTypeModel
            .find({ _id: { $in: validLeaveTypeIds.map((id) => new mongoose.Types.ObjectId(id)) } })
            .lean<LeaveTypeRow[]>()
        : [];

      const leaveTypeMap = new Map(leaveTypes.map((lt) => [lt._id.toString(), lt]));

      // Build employee map by ID
      const empMap = new Map(employees.map((e) => [e._id.toString(), e]));

      // Group leave requests by employeeId
      const requestsByEmployee = new Map<string, LeaveRow[]>();
      for (const req of leaveRequests) {
        const empId = req.employeeId.toString();
        const existing = requestsByEmployee.get(empId) ?? [];
        requestsByEmployee.set(empId, [...existing, req]);
      }

      // Build result grouped by team
      const teamResults: TeamAbsences[] = teams.map((team) => {
        const teamEmployees = employees.filter(
          (e) => e.teamId?.toString() === team._id.toString()
        );

        const members: TeamMemberAbsences[] = teamEmployees
          .map((emp) => {
            const empId = emp._id.toString();
            const empRequests = requestsByEmployee.get(empId) ?? [];

            const absences: AbsenceEntry[] = empRequests.map((req) => {
              const lt = leaveTypeMap.get(req.leaveTypeId.toString());
              return {
                requestId: req._id.toString(),
                startDate: req.startDate,
                endDate: req.endDate,
                workingDays: req.workingDays,
                status: req.status,
                leaveTypeName: includeLeaveTypeName ? (lt?.name ?? null) : null,
                leaveTypeColor: lt?.color ?? "#818CF8",
              };
            });

            return {
              employeeId: empId,
              employeeName: `${emp.firstName} ${emp.lastName}`,
              absences,
            };
          })
          .filter((m) => m.absences.length > 0);

        const coverageWarnings = computeCoverageWarnings(
          startDate,
          endDate,
          teamEmployees.length,
          leaveRequests.filter((r) =>
            teamEmployees.some((e) => e._id.toString() === r.employeeId.toString())
          ),
          DEFAULT_COVERAGE_THRESHOLD
        );

        return {
          teamId: team._id.toString(),
          teamName: team.name,
          teamSize: teamEmployees.length,
          members,
          coverageWarnings,
        };
      });

      return { startDate, endDate, teams: teamResults };
    },

    async getCoverage(
      tenantId: string,
      startDate: Date,
      endDate: Date,
      teamId?: string
    ): Promise<CoverageResult> {
      const empQuery: Record<string, unknown> = { tenantId, status: "active" };
      if (teamId !== undefined) {
        if (!mongoose.isValidObjectId(teamId)) {
          return {
            startDate,
            endDate,
            days: [],
            coverageThresholdPercent: DEFAULT_COVERAGE_THRESHOLD,
          };
        }
        empQuery["teamId"] = new mongoose.Types.ObjectId(teamId);
      }

      const totalEmployees = await employeeModel.countDocuments(empQuery);

      if (totalEmployees === 0) {
        return {
          startDate,
          endDate,
          days: [],
          coverageThresholdPercent: DEFAULT_COVERAGE_THRESHOLD,
        };
      }

      // Get all approved leave requests in the range
      type LeaveRow = {
        _id: mongoose.Types.ObjectId;
        employeeId: mongoose.Types.ObjectId;
        startDate: Date;
        endDate: Date;
      };

      const leaveQuery: Record<string, unknown> = {
        tenantId,
        status: { $in: ["approved", "auto_approved"] },
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
      };

      if (teamId !== undefined) {
        // Need to scope to team's employee IDs
        type EmpRow = { _id: mongoose.Types.ObjectId };
        const teamEmployees = await employeeModel
          .find({ tenantId, teamId: new mongoose.Types.ObjectId(teamId), status: "active" })
          .select("_id")
          .lean<EmpRow[]>();
        leaveQuery["employeeId"] = { $in: teamEmployees.map((e) => e._id) };
      }

      const leaveRequests = await leaveRequestModel
        .find(leaveQuery)
        .sort({ startDate: 1 })
        .lean<LeaveRow[]>();

      // Build per-day coverage
      const days: CoverageDay[] = [];
      const current = new Date(startDate);

      while (current <= endDate) {
        const dayKey = toDateString(current);
        const absentCount = leaveRequests.filter(
          (r) =>
            new Date(r.startDate) <= endOfDay(current) &&
            new Date(r.endDate) >= startOfDay(current)
        ).length;

        const presentCount = totalEmployees - absentCount;
        const coveragePercent =
          totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 100;

        days.push({
          date: dayKey,
          absentCount,
          totalEmployees,
          coveragePercent,
          belowThreshold: coveragePercent < DEFAULT_COVERAGE_THRESHOLD,
        });

        current.setDate(current.getDate() + 1);
      }

      return {
        startDate,
        endDate,
        days,
        coverageThresholdPercent: DEFAULT_COVERAGE_THRESHOLD,
      };
    },
  };
}

// ----------------------------------------------------------------
// Private helpers
// ----------------------------------------------------------------

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

interface LeaveRowForCoverage {
  startDate: Date;
  endDate: Date;
}

function computeCoverageWarnings(
  rangeStart: Date,
  rangeEnd: Date,
  teamSize: number,
  requests: LeaveRowForCoverage[],
  thresholdPercent: number
): CoverageWarning[] {
  if (teamSize === 0) return [];

  const warnings: CoverageWarning[] = [];
  const current = new Date(rangeStart);

  while (current <= rangeEnd) {
    const membersOut = requests.filter(
      (r) =>
        new Date(r.startDate) <= endOfDay(current) &&
        new Date(r.endDate) >= startOfDay(current)
    ).length;

    const presentCount = teamSize - membersOut;
    const coveragePercent =
      teamSize > 0 ? Math.round((presentCount / teamSize) * 100) : 100;

    if (coveragePercent < thresholdPercent) {
      warnings.push({
        date: toDateString(current),
        membersOut,
        coveragePercent,
        belowThreshold: true,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return warnings;
}
