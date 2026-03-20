/**
 * Tests for use-onboarding utility logic.
 *
 * Tests pure data-transformation functions extracted from the hook:
 * - step validation
 * - progress calculation
 * - work week logic
 */

/* =========================================================================
   Work week helper
   ========================================================================= */

type WorkWeekDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

function toggleWorkDay(
  current: readonly WorkWeekDay[],
  day: WorkWeekDay
): readonly WorkWeekDay[] {
  if (current.includes(day)) {
    return current.filter((d) => d !== day);
  }
  return [...current, day];
}

describe("toggleWorkDay", () => {
  it("adds a day when not present", () => {
    const result = toggleWorkDay(["monday", "tuesday"], "wednesday");
    expect(result).toContain("wednesday");
    expect(result).toHaveLength(3);
  });

  it("removes a day when already present", () => {
    const result = toggleWorkDay(["monday", "tuesday", "wednesday"], "tuesday");
    expect(result).not.toContain("tuesday");
    expect(result).toHaveLength(2);
  });

  it("does not mutate original array", () => {
    const original: WorkWeekDay[] = ["monday", "tuesday"];
    const originalLength = original.length;
    toggleWorkDay(original, "wednesday");
    expect(original).toHaveLength(originalLength);
    expect(original).not.toContain("wednesday");
  });

  it("handles empty array", () => {
    const result = toggleWorkDay([], "monday");
    expect(result).toEqual(["monday"]);
  });

  it("handles removing last day", () => {
    const result = toggleWorkDay(["monday"], "monday");
    expect(result).toHaveLength(0);
  });
});

/* =========================================================================
   Progress calculation
   ========================================================================= */

function calculateProgress(
  completedSteps: readonly number[],
  totalSteps: number
): number {
  return (completedSteps.length / totalSteps) * 100;
}

describe("calculateProgress", () => {
  it("returns 0 when no steps completed", () => {
    expect(calculateProgress([], 6)).toBe(0);
  });

  it("returns 100 when all steps completed", () => {
    expect(calculateProgress([1, 2, 3, 4, 5, 6], 6)).toBe(100);
  });

  it("returns 50 when half steps completed", () => {
    expect(calculateProgress([1, 2, 3], 6)).toBeCloseTo(50);
  });

  it("returns correct value for single completed step", () => {
    const result = calculateProgress([1], 6);
    expect(result).toBeCloseTo(16.67, 1);
  });
});

/* =========================================================================
   Step completion logic
   ========================================================================= */

function addCompletedStep(
  current: readonly number[],
  step: number
): readonly number[] {
  return Array.from(new Set([...current, step])).sort((a, b) => a - b);
}

describe("addCompletedStep", () => {
  it("adds a new step", () => {
    expect(addCompletedStep([1, 2], 3)).toContain(3);
  });

  it("does not duplicate steps", () => {
    const result = addCompletedStep([1, 2, 3], 2);
    const count = result.filter((s) => s === 2).length;
    expect(count).toBe(1);
  });

  it("does not mutate original", () => {
    const original = [1, 2];
    addCompletedStep(original, 3);
    expect(original).toHaveLength(2);
  });

  it("returns sorted steps", () => {
    const result = addCompletedStep([3, 1], 2);
    expect(result).toEqual([1, 2, 3]);
  });
});

/* =========================================================================
   Company name validation
   ========================================================================= */

function validateCompanyName(name: string): string {
  if (!name.trim()) return "Company name is required.";
  if (name.trim().length < 2) return "Company name must be at least 2 characters.";
  if (name.trim().length > 100) return "Company name must be at most 100 characters.";
  return "";
}

describe("validateCompanyName", () => {
  it("accepts a valid company name", () => {
    expect(validateCompanyName("Acme Corp")).toBe("");
  });

  it("rejects empty string", () => {
    expect(validateCompanyName("")).not.toBe("");
  });

  it("rejects whitespace only", () => {
    expect(validateCompanyName("   ")).not.toBe("");
  });

  it("rejects single character", () => {
    expect(validateCompanyName("A")).not.toBe("");
  });

  it("rejects name over 100 characters", () => {
    expect(validateCompanyName("A".repeat(101))).not.toBe("");
  });

  it("accepts name of exactly 2 characters", () => {
    expect(validateCompanyName("AB")).toBe("");
  });
});

/* =========================================================================
   Leave type defaults deduplication
   ========================================================================= */

interface LeaveTypeEntry {
  id: string;
  name: string;
  color: string;
  paid: boolean;
  entitlementDays: number;
}

function mergeLeaveTypes(
  existing: readonly LeaveTypeEntry[],
  newType: LeaveTypeEntry
): readonly LeaveTypeEntry[] {
  const alreadyExists = existing.some((lt) => lt.id === newType.id);
  if (alreadyExists) return existing;
  return [...existing, newType];
}

describe("mergeLeaveTypes", () => {
  it("adds a new leave type", () => {
    const existing: LeaveTypeEntry[] = [
      { id: "vac", name: "Vacation", color: "#818CF8", paid: true, entitlementDays: 20 },
    ];
    const newType: LeaveTypeEntry = {
      id: "sick",
      name: "Sick",
      color: "#34D399",
      paid: true,
      entitlementDays: 10,
    };
    const result = mergeLeaveTypes(existing, newType);
    expect(result).toHaveLength(2);
    expect(result.find((lt) => lt.id === "sick")).toBeDefined();
  });

  it("does not duplicate if id already exists", () => {
    const type: LeaveTypeEntry = {
      id: "vac",
      name: "Vacation",
      color: "#818CF8",
      paid: true,
      entitlementDays: 20,
    };
    const result = mergeLeaveTypes([type], type);
    expect(result).toHaveLength(1);
  });

  it("does not mutate original array", () => {
    const existing: LeaveTypeEntry[] = [
      { id: "vac", name: "Vacation", color: "#818CF8", paid: true, entitlementDays: 20 },
    ];
    const newType: LeaveTypeEntry = {
      id: "sick",
      name: "Sick",
      color: "#34D399",
      paid: true,
      entitlementDays: 10,
    };
    mergeLeaveTypes(existing, newType);
    expect(existing).toHaveLength(1);
  });
});
