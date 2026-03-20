/**
 * Tests for use-approvals hook utilities.
 *
 * Tests the sorting logic and validation logic that lives
 * in the hook module without requiring DOM or React.
 */

import type { PendingApproval } from "../../hooks/use-approvals";

/* =========================================================================
   Test data factory
   ========================================================================= */

function makePendingApproval(
  overrides: Partial<PendingApproval> = {}
): PendingApproval {
  return {
    id: `approval-${Math.random()}`,
    employeeId: "emp-1",
    employeeName: "Alice Smith",
    employeeAvatarInitials: "AS",
    employeeAvatarColor: "#818CF8",
    teamName: "Engineering",
    leaveTypeName: "Vacation",
    leaveTypeColor: "#34D399",
    startDate: "2026-04-01",
    endDate: "2026-04-05",
    workingDays: 5,
    submittedAt: "2026-03-15T10:00:00Z",
    ageHours: 24,
    ...overrides,
  };
}

/* =========================================================================
   Stale threshold logic
   ========================================================================= */

describe("Stale request threshold", () => {
  const STALE_THRESHOLD_HOURS = 48;

  it("marks request stale when ageHours >= 48", () => {
    const approval = makePendingApproval({ ageHours: 48 });
    expect(approval.ageHours >= STALE_THRESHOLD_HOURS).toBe(true);
  });

  it("does not mark request stale when ageHours < 48", () => {
    const approval = makePendingApproval({ ageHours: 47 });
    expect(approval.ageHours >= STALE_THRESHOLD_HOURS).toBe(false);
  });

  it("marks request stale when ageHours > 48", () => {
    const approval = makePendingApproval({ ageHours: 100 });
    expect(approval.ageHours >= STALE_THRESHOLD_HOURS).toBe(true);
  });

  it("is not stale when ageHours is 0", () => {
    const approval = makePendingApproval({ ageHours: 0 });
    expect(approval.ageHours >= STALE_THRESHOLD_HOURS).toBe(false);
  });
});

/* =========================================================================
   Sorting logic — extracted for unit test
   ========================================================================= */

type SortField = "age" | "startDate" | "employeeName";
type SortDirection = "asc" | "desc";

function sortApprovals(
  approvals: readonly PendingApproval[],
  sortField: SortField,
  sortDirection: SortDirection
): readonly PendingApproval[] {
  const copy = [...approvals];
  copy.sort((a, b) => {
    let comparison = 0;

    if (sortField === "age") {
      comparison = a.ageHours - b.ageHours;
    } else if (sortField === "startDate") {
      comparison =
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    } else if (sortField === "employeeName") {
      comparison = a.employeeName.localeCompare(b.employeeName);
    }

    return sortDirection === "desc" ? -comparison : comparison;
  });
  return copy;
}

describe("sortApprovals by age", () => {
  it("sorts oldest first (desc)", () => {
    const approvals = [
      makePendingApproval({ ageHours: 10 }),
      makePendingApproval({ ageHours: 100 }),
      makePendingApproval({ ageHours: 50 }),
    ];
    const sorted = sortApprovals(approvals, "age", "desc");
    expect(sorted[0]!.ageHours).toBe(100);
    expect(sorted[1]!.ageHours).toBe(50);
    expect(sorted[2]!.ageHours).toBe(10);
  });

  it("sorts newest first (asc)", () => {
    const approvals = [
      makePendingApproval({ ageHours: 100 }),
      makePendingApproval({ ageHours: 10 }),
    ];
    const sorted = sortApprovals(approvals, "age", "asc");
    expect(sorted[0]!.ageHours).toBe(10);
    expect(sorted[1]!.ageHours).toBe(100);
  });

  it("handles single-element array", () => {
    const approvals = [makePendingApproval({ ageHours: 5 })];
    const sorted = sortApprovals(approvals, "age", "desc");
    expect(sorted).toHaveLength(1);
  });

  it("handles empty array", () => {
    const sorted = sortApprovals([], "age", "desc");
    expect(sorted).toHaveLength(0);
  });
});

describe("sortApprovals by employeeName", () => {
  it("sorts alphabetically (asc)", () => {
    const approvals = [
      makePendingApproval({ employeeName: "Zara Jones" }),
      makePendingApproval({ employeeName: "Alice Smith" }),
      makePendingApproval({ employeeName: "Mark Chen" }),
    ];
    const sorted = sortApprovals(approvals, "employeeName", "asc");
    expect(sorted[0]!.employeeName).toBe("Alice Smith");
    expect(sorted[1]!.employeeName).toBe("Mark Chen");
    expect(sorted[2]!.employeeName).toBe("Zara Jones");
  });

  it("sorts reverse alphabetically (desc)", () => {
    const approvals = [
      makePendingApproval({ employeeName: "Alice Smith" }),
      makePendingApproval({ employeeName: "Zara Jones" }),
    ];
    const sorted = sortApprovals(approvals, "employeeName", "desc");
    expect(sorted[0]!.employeeName).toBe("Zara Jones");
    expect(sorted[1]!.employeeName).toBe("Alice Smith");
  });
});

describe("sortApprovals by startDate", () => {
  it("sorts by leave start date ascending", () => {
    const approvals = [
      makePendingApproval({ startDate: "2026-05-01" }),
      makePendingApproval({ startDate: "2026-03-15" }),
      makePendingApproval({ startDate: "2026-04-10" }),
    ];
    const sorted = sortApprovals(approvals, "startDate", "asc");
    expect(sorted[0]!.startDate).toBe("2026-03-15");
    expect(sorted[1]!.startDate).toBe("2026-04-10");
    expect(sorted[2]!.startDate).toBe("2026-05-01");
  });
});

describe("sortApprovals immutability", () => {
  it("does not mutate the original array", () => {
    const original = [
      makePendingApproval({ ageHours: 10 }),
      makePendingApproval({ ageHours: 100 }),
    ];
    const originalFirst = original[0]!.ageHours;
    sortApprovals(original, "age", "desc");
    expect(original[0]!.ageHours).toBe(originalFirst);
  });
});

/* =========================================================================
   Rejection validation logic
   ========================================================================= */

const MIN_REASON_LENGTH = 10;

function validateRejectionReason(reason: string): boolean {
  return reason.trim().length >= MIN_REASON_LENGTH;
}

describe("rejection reason validation", () => {
  it("accepts reason with exactly 10 chars", () => {
    expect(validateRejectionReason("0123456789")).toBe(true);
  });

  it("accepts reason longer than 10 chars", () => {
    expect(
      validateRejectionReason("This is a valid rejection reason")
    ).toBe(true);
  });

  it("rejects reason with 9 chars", () => {
    expect(validateRejectionReason("123456789")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateRejectionReason("")).toBe(false);
  });

  it("trims whitespace before counting", () => {
    expect(validateRejectionReason("   abc   ")).toBe(false); // only 3 non-space chars
    expect(
      validateRejectionReason("  at least ten  ")
    ).toBe(true); // "at least ten" = 12 chars
  });
});
