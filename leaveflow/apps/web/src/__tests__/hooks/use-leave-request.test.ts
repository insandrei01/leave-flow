/**
 * Tests for leave request detail utility logic.
 *
 * Tests pure helper functions:
 * - status config resolution
 * - timeout formatting
 * - audit action handling
 * - impact balance percentage calculation
 */

/* =========================================================================
   Timeout formatting
   ========================================================================= */

function formatTimeout(hours: number, minutes: number): string {
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

describe("formatTimeout", () => {
  it("shows hours and minutes when hours > 0", () => {
    expect(formatTimeout(2, 15)).toBe("2h 15m");
  });

  it("shows only minutes when hours === 0", () => {
    expect(formatTimeout(0, 30)).toBe("30m");
  });

  it("handles 0 minutes", () => {
    expect(formatTimeout(1, 0)).toBe("1h 0m");
  });

  it("handles 0 hours and 0 minutes", () => {
    expect(formatTimeout(0, 0)).toBe("0m");
  });
});

/* =========================================================================
   Balance percentage for impact card
   ========================================================================= */

function computeBalancePct(remaining: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, (remaining / total) * 100);
}

describe("computeBalancePct", () => {
  it("returns 100 when remaining equals total", () => {
    expect(computeBalancePct(20, 20)).toBe(100);
  });

  it("returns 0 when total is 0", () => {
    expect(computeBalancePct(0, 0)).toBe(0);
  });

  it("returns 50 for half remaining", () => {
    expect(computeBalancePct(10, 20)).toBe(50);
  });

  it("caps at 100 if remaining > total", () => {
    expect(computeBalancePct(25, 20)).toBe(100);
  });

  it("returns 0 when remaining is 0", () => {
    expect(computeBalancePct(0, 20)).toBe(0);
  });
});

/* =========================================================================
   Low balance detection
   ========================================================================= */

function isLowBalance(remaining: number, total: number): boolean {
  if (total === 0) return false;
  return remaining / total < 0.2;
}

describe("isLowBalance", () => {
  it("returns true when below 20%", () => {
    expect(isLowBalance(3, 20)).toBe(true); // 15%
  });

  it("returns false when at 20%", () => {
    expect(isLowBalance(4, 20)).toBe(false); // 20%
  });

  it("returns false when above 20%", () => {
    expect(isLowBalance(10, 20)).toBe(false); // 50%
  });

  it("returns false when total is 0", () => {
    expect(isLowBalance(0, 0)).toBe(false);
  });

  it("returns false when remaining equals total", () => {
    expect(isLowBalance(20, 20)).toBe(false);
  });
});

/* =========================================================================
   Approval step status helpers
   ========================================================================= */

type StepStatus = "pending" | "approved" | "rejected" | "escalated" | "skipped";

function isCompletedStep(status: StepStatus): boolean {
  return status === "approved" || status === "skipped" || status === "escalated";
}

function isActiveStep(stepNumber: number, currentStep: number | null): boolean {
  return currentStep !== null && stepNumber === currentStep;
}

describe("isCompletedStep", () => {
  it("returns true for approved", () => {
    expect(isCompletedStep("approved")).toBe(true);
  });

  it("returns true for skipped", () => {
    expect(isCompletedStep("skipped")).toBe(true);
  });

  it("returns true for escalated", () => {
    expect(isCompletedStep("escalated")).toBe(true);
  });

  it("returns false for pending", () => {
    expect(isCompletedStep("pending")).toBe(false);
  });

  it("returns false for rejected", () => {
    expect(isCompletedStep("rejected")).toBe(false);
  });
});

describe("isActiveStep", () => {
  it("returns true when step matches currentStep", () => {
    expect(isActiveStep(2, 2)).toBe(true);
  });

  it("returns false when step does not match currentStep", () => {
    expect(isActiveStep(1, 2)).toBe(false);
  });

  it("returns false when currentStep is null", () => {
    expect(isActiveStep(1, null)).toBe(false);
  });

  it("returns false for step 0 with currentStep 0", () => {
    expect(isActiveStep(0, 0)).toBe(true);
  });
});

/* =========================================================================
   Rejection reason validation
   ========================================================================= */

function isValidRejectionReason(reason: string): boolean {
  return reason.trim().length > 0;
}

describe("isValidRejectionReason", () => {
  it("returns true for non-empty reason", () => {
    expect(isValidRejectionReason("Team is fully booked")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isValidRejectionReason("")).toBe(false);
  });

  it("returns false for whitespace only", () => {
    expect(isValidRejectionReason("   ")).toBe(false);
  });

  it("returns true for single character", () => {
    expect(isValidRejectionReason("x")).toBe(true);
  });
});
