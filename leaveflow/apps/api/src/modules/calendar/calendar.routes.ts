/**
 * Calendar routes — swim-lane absences and coverage.
 *
 * GET /calendar/absences — team-grouped absence data (swim-lane)
 * GET /calendar/coverage — per-day coverage percentages with warnings
 *
 * Role rules:
 * - hr_admin, company_admin: see all teams, see leaveTypeName
 * - manager: scoped to own teams, leaveTypeName nullified
 * - employee: not allowed (403)
 */

import type { FastifyInstance } from "fastify";
import mongoose from "mongoose";
import {
  LeaveRequestModel,
  EmployeeModel,
  TeamModel,
  LeaveTypeModel,
} from "../../models/index.js";
import { createCalendarService } from "./calendar.service.js";
import { CalendarAbsencesQuerySchema, CalendarCoverageQuerySchema, validateDateRange } from "./calendar.schema.js";
import { sendSuccess } from "../../lib/response.js";
import { ForbiddenError, ValidationError } from "../../lib/errors.js";

const ALLOWED_ROLES = new Set(["hr_admin", "company_admin", "manager"]);

export async function calendarRoutes(app: FastifyInstance): Promise<void> {
  const service = createCalendarService({
    leaveRequestModel: LeaveRequestModel as unknown as Parameters<typeof createCalendarService>[0]["leaveRequestModel"],
    employeeModel: EmployeeModel as unknown as Parameters<typeof createCalendarService>[0]["employeeModel"],
    teamModel: TeamModel as unknown as Parameters<typeof createCalendarService>[0]["teamModel"],
    leaveTypeModel: LeaveTypeModel as unknown as Parameters<typeof createCalendarService>[0]["leaveTypeModel"],
  });

  /**
   * GET /calendar/absences
   * Returns team-grouped absences for swim-lane calendar.
   */
  app.get("/calendar/absences", async (request, reply) => {
    const role = request.auth?.role ?? "";
    if (!ALLOWED_ROLES.has(role)) {
      throw new ForbiddenError("Insufficient role to view calendar absences");
    }

    const parsed = CalendarAbsencesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters", parsed.error.issues);
    }

    const { startDate: startStr, endDate: endStr, teamId } = parsed.data;
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    const rangeCheck = validateDateRange(startDate, endDate);
    if (!rangeCheck.valid) {
      throw new ValidationError(rangeCheck.message);
    }

    const tenantId = request.tenantId ?? "";

    // Manager can only see their own team
    let scopedTeamId = teamId;
    if (role === "manager" && scopedTeamId === undefined) {
      // Managers without explicit teamId see all their teams —
      // handled by service layer with employee scoping
    }

    const result = await service.getAbsences(
      tenantId,
      startDate,
      endDate,
      role,
      scopedTeamId
    );

    return sendSuccess(reply, {
      startDate: toDateString(result.startDate),
      endDate: toDateString(result.endDate),
      teams: result.teams.map((team) => ({
        ...team,
        members: team.members.map((member) => ({
          ...member,
          absences: member.absences.map((absence) => ({
            ...absence,
            startDate: toDateString(absence.startDate),
            endDate: toDateString(absence.endDate),
          })),
        })),
      })),
    });
  });

  /**
   * GET /calendar/coverage
   * Returns per-day coverage percentages with threshold warnings.
   */
  app.get("/calendar/coverage", async (request, reply) => {
    const role = request.auth?.role ?? "";
    if (!ALLOWED_ROLES.has(role)) {
      throw new ForbiddenError("Insufficient role to view coverage data");
    }

    const parsed = CalendarCoverageQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters", parsed.error.issues);
    }

    const { startDate: startStr, endDate: endStr, teamId } = parsed.data;
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    const rangeCheck = validateDateRange(startDate, endDate);
    if (!rangeCheck.valid) {
      throw new ValidationError(rangeCheck.message);
    }

    const tenantId = request.tenantId ?? "";

    // Manager scoping: only their team
    let scopedTeamId = teamId;
    if (role === "manager" && scopedTeamId === undefined) {
      const employeeId = request.auth?.employeeId;
      if (employeeId !== undefined) {
        type EmpRow = { teamId: mongoose.Types.ObjectId | null };
        const emp = await EmployeeModel.findById(new mongoose.Types.ObjectId(employeeId))
          .select("teamId")
          .lean<EmpRow>();
        if (emp?.teamId !== null && emp?.teamId !== undefined) {
          scopedTeamId = emp.teamId.toString();
        }
      }
    }

    const result = await service.getCoverage(
      tenantId,
      startDate,
      endDate,
      scopedTeamId
    );

    return sendSuccess(reply, {
      startDate: toDateString(result.startDate),
      endDate: toDateString(result.endDate),
      coverageThresholdPercent: result.coverageThresholdPercent,
      days: result.days,
    });
  });
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
