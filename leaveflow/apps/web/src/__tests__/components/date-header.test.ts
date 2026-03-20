/**
 * Tests for calendar date-header utility — buildDayColumns.
 *
 * Tests the pure function that builds day column metadata from a month string.
 */

import { buildDayColumns } from "../../components/calendar/date-header";

describe("buildDayColumns", () => {
  it("returns 31 days for January 2026", () => {
    const days = buildDayColumns("2026-01");
    expect(days).toHaveLength(31);
  });

  it("returns 28 days for February 2026 (non-leap year)", () => {
    const days = buildDayColumns("2026-02");
    expect(days).toHaveLength(28);
  });

  it("returns 29 days for February 2024 (leap year)", () => {
    const days = buildDayColumns("2024-02");
    expect(days).toHaveLength(29);
  });

  it("returns 30 days for April 2026", () => {
    const days = buildDayColumns("2026-04");
    expect(days).toHaveLength(30);
  });

  it("first day has dayOfMonth === 1", () => {
    const days = buildDayColumns("2026-03");
    expect(days[0]!.dayOfMonth).toBe(1);
  });

  it("last day of March has dayOfMonth === 31", () => {
    const days = buildDayColumns("2026-03");
    expect(days[days.length - 1]!.dayOfMonth).toBe(31);
  });

  it("isToday is false for past months", () => {
    // Use a fixed past month
    const days = buildDayColumns("2020-01");
    expect(days.every((d) => !d.isToday)).toBe(true);
  });

  it("returns correct ISO date string for first day of March 2026", () => {
    const days = buildDayColumns("2026-03");
    expect(days[0]!.date).toBe("2026-03-01");
  });

  it("marks weekends correctly (Saturday=6, Sunday=0)", () => {
    // March 2026 — day 1 is a Sunday
    const days = buildDayColumns("2026-03");
    const sunday = days[0]!;
    expect(sunday.isWeekend).toBe(true);
    expect(sunday.dayLabel).toBe("Sun");
  });

  it("marks weekdays as not weekend", () => {
    // March 2, 2026 is a Monday
    const days = buildDayColumns("2026-03");
    const monday = days[1]!;
    expect(monday.isWeekend).toBe(false);
    expect(monday.dayLabel).toBe("Mon");
  });

  it("date strings are zero-padded", () => {
    const days = buildDayColumns("2026-03");
    // Day 5 should be "2026-03-05"
    expect(days[4]!.date).toBe("2026-03-05");
  });

  it("all date strings follow YYYY-MM-DD format", () => {
    const days = buildDayColumns("2026-11");
    for (const day of days) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("does not mutate result between calls", () => {
    const days1 = buildDayColumns("2026-01");
    const days2 = buildDayColumns("2026-01");
    // Different arrays (immutable)
    expect(days1).not.toBe(days2);
    // But same content
    expect(days1[0]!.date).toBe(days2[0]!.date);
  });
});

/* =========================================================================
   Day label correctness
   ========================================================================= */

describe("buildDayColumns day labels", () => {
  it("all day labels are valid short names", () => {
    const validLabels = new Set(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    const days = buildDayColumns("2026-03");
    for (const day of days) {
      expect(validLabels.has(day.dayLabel)).toBe(true);
    }
  });

  it("each week has at most 7 unique dates", () => {
    const days = buildDayColumns("2026-03");
    // Just verify no date is repeated
    const dates = days.map((d) => d.date);
    const uniqueDates = new Set(dates);
    expect(uniqueDates.size).toBe(dates.length);
  });
});
