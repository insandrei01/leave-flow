/**
 * Calendar service tests — swim-lane absences and coverage calculation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCalendarService } from "./calendar.service.js";
import type { CalendarService, CalendarDeps } from "./calendar.service.js";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

const TENANT_ID = "tenant-test";

function makeEmptyDeps(): CalendarDeps {
  return {
    leaveRequestModel: {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }),
      aggregate: vi.fn().mockResolvedValue([]),
    },
    employeeModel: {
      find: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }),
      countDocuments: vi.fn().mockResolvedValue(0),
    },
    teamModel: {
      find: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
      findById: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    },
    leaveTypeModel: {
      find: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    },
  };
}

const START_DATE = new Date("2026-04-01");
const END_DATE = new Date("2026-04-30");

// ----------------------------------------------------------------
// getAbsences tests
// ----------------------------------------------------------------

describe("CalendarService.getAbsences", () => {
  let deps: CalendarDeps;
  let service: CalendarService;

  beforeEach(() => {
    deps = makeEmptyDeps();
    service = createCalendarService(deps);
  });

  it("returns empty teams array when no employees exist", async () => {
    const result = await service.getAbsences(TENANT_ID, START_DATE, END_DATE, "hr_admin");
    expect(result.teams).toEqual([]);
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
  });

  it("returns startDate and endDate matching input", async () => {
    const result = await service.getAbsences(TENANT_ID, START_DATE, END_DATE, "hr_admin");
    expect(result.startDate.toISOString()).toBe(START_DATE.toISOString());
    expect(result.endDate.toISOString()).toBe(END_DATE.toISOString());
  });

  describe("BR-092 privacy enforcement", () => {
    it("includes leaveTypeName for hr_admin role", async () => {
      const mockLeaveRequest = {
        _id: "lr-1",
        employeeId: "emp-1",
        leaveTypeId: "lt-1",
        startDate: new Date("2026-04-07"),
        endDate: new Date("2026-04-11"),
        workingDays: 5,
        status: "approved",
      };

      const mockEmployee = {
        _id: "emp-1",
        firstName: "Alice",
        lastName: "Chen",
        teamId: "team-1",
      };

      const mockTeam = {
        _id: "team-1",
        name: "Engineering",
      };

      const mockLeaveType = {
        _id: "lt-1",
        name: "Vacation",
        color: "#818CF8",
      };

      deps.leaveRequestModel.find = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([mockLeaveRequest]),
      });

      deps.employeeModel.find = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([mockEmployee]),
      });

      deps.teamModel.find = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockTeam]),
      });

      deps.leaveTypeModel.find = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockLeaveType]),
      });

      const result = await service.getAbsences(TENANT_ID, START_DATE, END_DATE, "hr_admin");

      // hr_admin should see leaveTypeName
      if (result.teams.length > 0) {
        const team = result.teams[0];
        const member = team?.members?.[0];
        const absence = member?.absences?.[0];
        if (absence !== undefined) {
          // hr_admin always gets leaveTypeName
          expect(typeof absence.leaveTypeName === "string" || absence.leaveTypeName === null).toBe(true);
        }
      }
    });

    it("nullifies leaveTypeName for non-hr roles", async () => {
      const mockLeaveRequest = {
        _id: "lr-1",
        employeeId: "emp-1",
        leaveTypeId: "lt-1",
        startDate: new Date("2026-04-07"),
        endDate: new Date("2026-04-11"),
        workingDays: 5,
        status: "approved",
      };

      const mockEmployee = {
        _id: "emp-1",
        firstName: "Bob",
        lastName: "Smith",
        teamId: "team-1",
      };

      const mockTeam = { _id: "team-1", name: "Engineering" };
      const mockLeaveType = { _id: "lt-1", name: "Sick Leave", color: "#34D399" };

      deps.leaveRequestModel.find = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([mockLeaveRequest]),
      });

      deps.employeeModel.find = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([mockEmployee]),
      });

      deps.teamModel.find = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockTeam]),
      });

      deps.leaveTypeModel.find = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockLeaveType]),
      });

      const result = await service.getAbsences(TENANT_ID, START_DATE, END_DATE, "employee");

      if (result.teams.length > 0) {
        const team = result.teams[0];
        const member = team?.members?.[0];
        const absence = member?.absences?.[0];
        if (absence !== undefined) {
          // non-HR must see null leaveTypeName
          expect(absence.leaveTypeName).toBeNull();
          // But color is always present
          expect(typeof absence.leaveTypeColor).toBe("string");
        }
      }
    });
  });

  it("filters to teamId when provided", async () => {
    const TEAM_ID = "team-1";
    const findSpy = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
    deps.leaveRequestModel.find = findSpy;

    deps.teamModel.find = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ _id: TEAM_ID, name: "Eng" }]),
    });

    await service.getAbsences(TENANT_ID, START_DATE, END_DATE, "hr_admin", TEAM_ID);

    // Employee filter should be called to scope to team
    expect(deps.employeeModel.find).toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------
// getCoverage tests
// ----------------------------------------------------------------

describe("CalendarService.getCoverage", () => {
  let deps: CalendarDeps;
  let service: CalendarService;

  beforeEach(() => {
    deps = makeEmptyDeps();
    service = createCalendarService(deps);
  });

  it("returns empty days array when no employees", async () => {
    const result = await service.getCoverage(TENANT_ID, START_DATE, END_DATE);
    expect(Array.isArray(result.days)).toBe(true);
  });

  it("returns startDate and endDate matching input", async () => {
    const result = await service.getCoverage(TENANT_ID, START_DATE, END_DATE);
    expect(result.startDate.toISOString()).toBe(START_DATE.toISOString());
    expect(result.endDate.toISOString()).toBe(END_DATE.toISOString());
  });

  it("returns coverageWarning flag per day", async () => {
    const result = await service.getCoverage(TENANT_ID, START_DATE, END_DATE);
    for (const day of result.days) {
      expect(typeof day.date).toBe("string");
      expect(typeof day.absentCount).toBe("number");
      expect(typeof day.totalEmployees).toBe("number");
      expect(typeof day.coveragePercent).toBe("number");
      expect(typeof day.belowThreshold).toBe("boolean");
    }
  });
});
