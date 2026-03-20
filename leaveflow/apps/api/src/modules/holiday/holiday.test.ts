/**
 * Unit tests for the holiday service.
 *
 * Uses a mocked repository — no real database connection needed.
 */

import { describe, it, expect, vi } from "vitest";
import { createHolidayService } from "./holiday.service.js";
import type { HolidayRepository } from "./holiday.repository.js";
import type { HolidayCalendarRecord, HolidayRecord } from "./holiday.types.js";

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

function buildHolidayRecord(
  overrides: Partial<HolidayRecord> = {}
): HolidayRecord {
  return {
    date: new Date("2025-01-01"),
    name: "New Year's Day",
    localName: null,
    isFixed: true,
    isCustom: false,
    ...overrides,
  };
}

function buildCalendarRecord(
  overrides: Partial<HolidayCalendarRecord> = {}
): HolidayCalendarRecord {
  return {
    id: "cal-001",
    tenantId: null,
    countryCode: "US",
    year: 2025,
    source: "system",
    holidays: [buildHolidayRecord()],
    lastFetchedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function buildMockRepo(
  overrides: Partial<HolidayRepository> = {}
): HolidayRepository {
  return {
    findByCountryYear: vi.fn().mockResolvedValue(null),
    findTenantCustom: vi.fn().mockResolvedValue(null),
    upsertCustomHolidays: vi.fn().mockResolvedValue(buildCalendarRecord()),
    ...overrides,
  };
}

const TENANT_ID = "tenant-001";
const STANDARD_WORK_WEEK = [1, 2, 3, 4, 5]; // Mon-Fri

// ----------------------------------------------------------------
// getHolidays
// ----------------------------------------------------------------

describe("HolidayService.getHolidays", () => {
  it("returns system holidays when no tenant custom holidays exist", async () => {
    const systemCal = buildCalendarRecord({
      holidays: [buildHolidayRecord({ name: "New Year" })],
    });
    const repo = buildMockRepo({
      findByCountryYear: vi.fn().mockResolvedValue(systemCal),
      findTenantCustom: vi.fn().mockResolvedValue(null),
    });
    const service = createHolidayService({ repo });

    const result = await service.getHolidays(TENANT_ID, "US", 2025);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("New Year");
  });

  it("merges system and custom holidays", async () => {
    const systemCal = buildCalendarRecord({
      holidays: [
        buildHolidayRecord({ date: new Date("2025-01-01"), name: "New Year" }),
        buildHolidayRecord({ date: new Date("2025-07-04"), name: "Independence Day" }),
      ],
    });
    const customCal = buildCalendarRecord({
      source: "custom",
      tenantId: TENANT_ID,
      holidays: [
        buildHolidayRecord({
          date: new Date("2025-12-25"),
          name: "Company Christmas",
          isCustom: true,
        }),
      ],
    });
    const repo = buildMockRepo({
      findByCountryYear: vi.fn().mockResolvedValue(systemCal),
      findTenantCustom: vi.fn().mockResolvedValue(customCal),
    });
    const service = createHolidayService({ repo });

    const result = await service.getHolidays(TENANT_ID, "US", 2025);

    expect(result).toHaveLength(3);
  });

  it("custom holidays override system holidays for the same date", async () => {
    const systemCal = buildCalendarRecord({
      holidays: [
        buildHolidayRecord({
          date: new Date("2025-01-01"),
          name: "New Year System",
        }),
      ],
    });
    const customCal = buildCalendarRecord({
      source: "custom",
      tenantId: TENANT_ID,
      holidays: [
        buildHolidayRecord({
          date: new Date("2025-01-01"),
          name: "New Year Custom",
          isCustom: true,
        }),
      ],
    });
    const repo = buildMockRepo({
      findByCountryYear: vi.fn().mockResolvedValue(systemCal),
      findTenantCustom: vi.fn().mockResolvedValue(customCal),
    });
    const service = createHolidayService({ repo });

    const result = await service.getHolidays(TENANT_ID, "US", 2025);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("New Year Custom");
  });

  it("returns empty array when no calendars exist", async () => {
    const repo = buildMockRepo();
    const service = createHolidayService({ repo });

    const result = await service.getHolidays(TENANT_ID, "US", 2025);

    expect(result).toHaveLength(0);
  });

  it("throws when countryCode is not 2 letters", async () => {
    const repo = buildMockRepo();
    const service = createHolidayService({ repo });

    await expect(service.getHolidays(TENANT_ID, "USA", 2025)).rejects.toThrow(
      /2-letter/i
    );
  });

  it("throws when year is out of range", async () => {
    const repo = buildMockRepo();
    const service = createHolidayService({ repo });

    await expect(service.getHolidays(TENANT_ID, "US", 1999)).rejects.toThrow(
      /2000 and 2100/i
    );
  });
});

// ----------------------------------------------------------------
// upsertCustomHolidays
// ----------------------------------------------------------------

describe("HolidayService.upsertCustomHolidays", () => {
  it("calls repository upsert and returns the calendar", async () => {
    const calendar = buildCalendarRecord({ source: "custom", tenantId: TENANT_ID });
    const repo = buildMockRepo({
      upsertCustomHolidays: vi.fn().mockResolvedValue(calendar),
    });
    const service = createHolidayService({ repo });

    const result = await service.upsertCustomHolidays(TENANT_ID, "US", 2025, [
      { date: new Date("2025-12-26"), name: "Boxing Day", isFixed: true },
    ]);

    expect(result.source).toBe("custom");
    expect(repo.upsertCustomHolidays).toHaveBeenCalledOnce();
  });

  it("throws when tenantId is empty", async () => {
    const repo = buildMockRepo();
    const service = createHolidayService({ repo });

    await expect(
      service.upsertCustomHolidays("", "US", 2025, [])
    ).rejects.toThrow(/tenantId is required/i);
  });

  it("throws when countryCode is invalid", async () => {
    const repo = buildMockRepo();
    const service = createHolidayService({ repo });

    await expect(
      service.upsertCustomHolidays(TENANT_ID, "US1", 2025, [])
    ).rejects.toThrow(/2-letter/i);
  });
});

// ----------------------------------------------------------------
// calculateWorkingDays
// ----------------------------------------------------------------

describe("HolidayService.calculateWorkingDays", () => {
  const OPTIONS = { workWeek: STANDARD_WORK_WEEK, countryCode: "US" };

  it("counts 5 working days for a standard Mon–Fri week with no holidays", async () => {
    const repo = buildMockRepo();
    const service = createHolidayService({ repo });

    // 2025-01-06 (Mon) to 2025-01-10 (Fri)
    const result = await service.calculateWorkingDays(
      new Date("2025-01-06"),
      new Date("2025-01-10"),
      TENANT_ID,
      OPTIONS
    );

    expect(result.workingDays).toBe(5);
    expect(result.excludedDates).toHaveLength(0);
  });

  it("excludes weekends from working day count", async () => {
    const repo = buildMockRepo();
    const service = createHolidayService({ repo });

    // 2025-01-06 (Mon) to 2025-01-12 (Sun) = 5 working + 2 weekend
    const result = await service.calculateWorkingDays(
      new Date("2025-01-06"),
      new Date("2025-01-12"),
      TENANT_ID,
      OPTIONS
    );

    expect(result.workingDays).toBe(5);
    expect(
      result.excludedDates.filter((d) => d.reason === "weekend")
    ).toHaveLength(2);
  });

  it("excludes public holidays from working day count", async () => {
    // 2025-01-01 is New Year's Day (Wednesday)
    const systemCal = buildCalendarRecord({
      holidays: [
        buildHolidayRecord({
          date: new Date("2025-01-01"),
          name: "New Year's Day",
        }),
      ],
    });
    const repo = buildMockRepo({
      findByCountryYear: vi.fn().mockResolvedValue(systemCal),
      findTenantCustom: vi.fn().mockResolvedValue(null),
    });
    const service = createHolidayService({ repo });

    // Mon 2024-12-30 to Wed 2025-01-01 = 3 days but 1 is holiday → 2 working
    const result = await service.calculateWorkingDays(
      new Date("2024-12-30"),
      new Date("2025-01-01"),
      TENANT_ID,
      OPTIONS
    );

    expect(result.workingDays).toBe(2);
    expect(
      result.excludedDates.filter((d) => d.reason === "holiday")
    ).toHaveLength(1);
  });

  it("handles a custom work week (Sun–Thu)", async () => {
    const repo = buildMockRepo();
    const service = createHolidayService({ repo });
    const sunToThu = [0, 1, 2, 3, 4]; // Sun=0, Mon=1, Tue=2, Wed=3, Thu=4

    // 2025-01-05 (Sun) to 2025-01-11 (Sat)
    // Sun, Mon, Tue, Wed, Thu = 5 working; Fri + Sat = 2 weekend
    const result = await service.calculateWorkingDays(
      new Date("2025-01-05"),
      new Date("2025-01-11"),
      TENANT_ID,
      { workWeek: sunToThu, countryCode: "US" }
    );

    expect(result.workingDays).toBe(5);
    expect(
      result.excludedDates.filter((d) => d.reason === "weekend")
    ).toHaveLength(2);
  });

  it("throws when startDate is after endDate", async () => {
    const repo = buildMockRepo();
    const service = createHolidayService({ repo });

    await expect(
      service.calculateWorkingDays(
        new Date("2025-01-10"),
        new Date("2025-01-05"),
        TENANT_ID,
        OPTIONS
      )
    ).rejects.toThrow(/startDate must not be after endDate/i);
  });

  it("returns 1 working day for a single working day", async () => {
    const repo = buildMockRepo();
    const service = createHolidayService({ repo });

    // Monday 2025-01-06
    const result = await service.calculateWorkingDays(
      new Date("2025-01-06"),
      new Date("2025-01-06"),
      TENANT_ID,
      OPTIONS
    );

    expect(result.workingDays).toBe(1);
  });

  it("returns 0 working days for a single weekend day", async () => {
    const repo = buildMockRepo();
    const service = createHolidayService({ repo });

    // Saturday 2025-01-04
    const result = await service.calculateWorkingDays(
      new Date("2025-01-04"),
      new Date("2025-01-04"),
      TENANT_ID,
      OPTIONS
    );

    expect(result.workingDays).toBe(0);
    expect(result.excludedDates).toHaveLength(1);
    expect(result.excludedDates[0]?.reason).toBe("weekend");
  });

  it("excludes both holidays and weekends in the same range", async () => {
    const systemCal = buildCalendarRecord({
      year: 2025,
      holidays: [
        buildHolidayRecord({
          date: new Date("2025-01-01"),
          name: "New Year",
        }),
      ],
    });
    const repo = buildMockRepo({
      findByCountryYear: vi.fn().mockResolvedValue(systemCal),
    });
    const service = createHolidayService({ repo });

    // Dec 30 (Mon), Dec 31 (Tue), Jan 1 (Wed - holiday), Jan 2 (Thu), Jan 3 (Fri)
    // + Jan 4 (Sat - weekend), Jan 5 (Sun - weekend)
    const result = await service.calculateWorkingDays(
      new Date("2024-12-30"),
      new Date("2025-01-05"),
      TENANT_ID,
      OPTIONS
    );

    expect(result.workingDays).toBe(4); // Mon, Tue, Thu, Fri
    expect(
      result.excludedDates.filter((d) => d.reason === "holiday")
    ).toHaveLength(1);
    expect(
      result.excludedDates.filter((d) => d.reason === "weekend")
    ).toHaveLength(2);
  });

  it("preserves immutability: result dates are new Date objects", async () => {
    const repo = buildMockRepo();
    const service = createHolidayService({ repo });

    const startDate = new Date("2025-01-06");
    const endDate = new Date("2025-01-10");

    const result = await service.calculateWorkingDays(
      startDate,
      endDate,
      TENANT_ID,
      OPTIONS
    );

    expect(result.startDate).not.toBe(startDate);
    expect(result.endDate).not.toBe(endDate);
  });
});
