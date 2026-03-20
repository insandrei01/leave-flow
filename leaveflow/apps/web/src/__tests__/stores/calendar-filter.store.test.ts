/**
 * Tests for calendar filter store utility logic.
 *
 * Tests the month navigation helpers extracted from the store:
 * - shiftMonth
 * - getCurrentMonth format
 */

/* =========================================================================
   Month shifting logic (extracted from store)
   ========================================================================= */

function shiftMonth(month: string, delta: number): string {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const m = Number(monthStr) - 1 + delta;
  const date = new Date(year, m, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

describe("shiftMonth — forward navigation", () => {
  it("advances one month", () => {
    expect(shiftMonth("2026-01", 1)).toBe("2026-02");
  });

  it("advances across year boundary", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("advances by 6 months", () => {
    expect(shiftMonth("2026-01", 6)).toBe("2026-07");
  });

  it("advances by 12 months (full year)", () => {
    expect(shiftMonth("2026-01", 12)).toBe("2027-01");
  });
});

describe("shiftMonth — backward navigation", () => {
  it("goes back one month", () => {
    expect(shiftMonth("2026-03", -1)).toBe("2026-02");
  });

  it("goes back across year boundary", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("goes back by 3 months", () => {
    expect(shiftMonth("2026-04", -3)).toBe("2026-01");
  });
});

describe("shiftMonth — output format", () => {
  it("always returns YYYY-MM format", () => {
    const result = shiftMonth("2026-09", 1);
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });

  it("zero-pads single-digit months", () => {
    expect(shiftMonth("2026-08", 1)).toBe("2026-09");
    expect(shiftMonth("2026-09", 1)).toBe("2026-10");
  });

  it("handles month 01 (January)", () => {
    expect(shiftMonth("2026-02", -1)).toBe("2026-01");
  });

  it("handles month 12 (December)", () => {
    expect(shiftMonth("2026-11", 1)).toBe("2026-12");
  });
});

describe("shiftMonth — zero delta", () => {
  it("returns same month when delta is 0", () => {
    expect(shiftMonth("2026-06", 0)).toBe("2026-06");
  });
});

/* =========================================================================
   Calendar filter state — initial values
   ========================================================================= */

interface CalendarFilterState {
  selectedMonth: string;
  selectedTeamId: string | null;
  viewMode: "month" | "week";
  searchQuery: string;
}

function createInitialState(overrides?: Partial<CalendarFilterState>): CalendarFilterState {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return {
    selectedMonth: currentMonth,
    selectedTeamId: null,
    viewMode: "month",
    searchQuery: "",
    ...overrides,
  };
}

describe("createInitialState", () => {
  it("defaults to current month in YYYY-MM format", () => {
    const state = createInitialState();
    expect(state.selectedMonth).toMatch(/^\d{4}-\d{2}$/);
  });

  it("defaults teamId to null", () => {
    expect(createInitialState().selectedTeamId).toBeNull();
  });

  it("defaults viewMode to month", () => {
    expect(createInitialState().viewMode).toBe("month");
  });

  it("defaults searchQuery to empty string", () => {
    expect(createInitialState().searchQuery).toBe("");
  });

  it("applies overrides without mutating defaults", () => {
    const state1 = createInitialState({ selectedTeamId: "team-1" });
    const state2 = createInitialState();
    expect(state1.selectedTeamId).toBe("team-1");
    expect(state2.selectedTeamId).toBeNull();
  });

  it("accepts custom initial month", () => {
    const state = createInitialState({ selectedMonth: "2026-06" });
    expect(state.selectedMonth).toBe("2026-06");
  });
});

/* =========================================================================
   CSV parsing helpers (from step-employees)
   ========================================================================= */

interface ParsedCsvRow {
  firstName: string;
  lastName: string;
  email: string;
  teamId: string;
}

function parseCsvLine(
  headers: string[],
  values: string[]
): ParsedCsvRow {
  function getField(name: string): string {
    const idx = headers.indexOf(name.toLowerCase());
    return idx >= 0 ? (values[idx] ?? "").trim() : "";
  }

  return {
    firstName: getField("firstname"),
    lastName: getField("lastname"),
    email: getField("email"),
    teamId: getField("teamid"),
  };
}

describe("parseCsvLine", () => {
  const headers = ["firstname", "lastname", "email", "teamid"];

  it("extracts all fields correctly", () => {
    const row = parseCsvLine(headers, ["Alice", "Smith", "alice@example.com", "team-1"]);
    expect(row.firstName).toBe("Alice");
    expect(row.lastName).toBe("Smith");
    expect(row.email).toBe("alice@example.com");
    expect(row.teamId).toBe("team-1");
  });

  it("returns empty string for missing field", () => {
    const row = parseCsvLine(headers, ["Alice", "", "alice@example.com", ""]);
    expect(row.lastName).toBe("");
    expect(row.teamId).toBe("");
  });

  it("trims whitespace from values", () => {
    const row = parseCsvLine(headers, ["  Alice  ", "Smith", "alice@example.com", ""]);
    expect(row.firstName).toBe("Alice");
  });

  it("handles missing column gracefully", () => {
    const headersNoTeam = ["firstname", "lastname", "email"];
    const row = parseCsvLine(headersNoTeam, ["Alice", "Smith", "alice@example.com"]);
    expect(row.teamId).toBe("");
  });
});
