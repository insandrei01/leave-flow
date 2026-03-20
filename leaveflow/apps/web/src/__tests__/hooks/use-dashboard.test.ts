/**
 * Tests for use-dashboard utility logic.
 *
 * Tests pure helper functions used by dashboard widgets:
 * - stale request detection
 * - coverage calculation
 * - relative time formatting
 * - heatmap intensity mapping
 */

/* =========================================================================
   Stale request detection (>48h)
   ========================================================================= */

const STALE_HOURS = 48;

function isStaleRequest(hoursWaiting: number): boolean {
  return hoursWaiting > STALE_HOURS;
}

describe("isStaleRequest", () => {
  it("returns true when hours > 48", () => {
    expect(isStaleRequest(49)).toBe(true);
  });

  it("returns false when hours === 48", () => {
    expect(isStaleRequest(48)).toBe(false);
  });

  it("returns false when hours < 48", () => {
    expect(isStaleRequest(10)).toBe(false);
  });

  it("returns false for 0 hours", () => {
    expect(isStaleRequest(0)).toBe(false);
  });

  it("returns true for very large values", () => {
    expect(isStaleRequest(1000)).toBe(true);
  });
});

/* =========================================================================
   Coverage percentage calculation
   ========================================================================= */

function computeCoveragePercent(presentCount: number, teamSize: number): number {
  if (teamSize === 0) return 1;
  return presentCount / teamSize;
}

describe("computeCoveragePercent", () => {
  it("returns 1 (100%) when all present", () => {
    expect(computeCoveragePercent(5, 5)).toBe(1);
  });

  it("returns 0 when nobody present", () => {
    expect(computeCoveragePercent(0, 5)).toBe(0);
  });

  it("returns 0.5 for half team present", () => {
    expect(computeCoveragePercent(3, 6)).toBeCloseTo(0.5);
  });

  it("handles team size of 0 safely", () => {
    // Should not divide by zero
    const result = computeCoveragePercent(0, 0);
    expect(isFinite(result)).toBe(true);
  });
});

/* =========================================================================
   Resolution rate calculation
   ========================================================================= */

function computeApprovalRate(
  approved: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((approved / total) * 100);
}

describe("computeApprovalRate", () => {
  it("returns 100 when all approved", () => {
    expect(computeApprovalRate(10, 10)).toBe(100);
  });

  it("returns 0 when none approved", () => {
    expect(computeApprovalRate(0, 10)).toBe(0);
  });

  it("returns 0 when total is 0", () => {
    expect(computeApprovalRate(0, 0)).toBe(0);
  });

  it("rounds to nearest integer", () => {
    // 1/3 ≈ 33.33 → rounds to 33
    expect(computeApprovalRate(1, 3)).toBe(33);
  });

  it("handles partial approval", () => {
    expect(computeApprovalRate(7, 10)).toBe(70);
  });
});

/* =========================================================================
   Heatmap intensity mapping
   ========================================================================= */

type HeatmapIntensity = "none" | "low" | "medium" | "high" | "critical";

function getHeatmapIntensity(
  count: number,
  max: number
): HeatmapIntensity {
  if (count === 0) return "none";
  if (max === 0) return "none";
  const ratio = count / max;
  if (ratio < 0.25) return "low";
  if (ratio < 0.5) return "medium";
  if (ratio < 0.75) return "high";
  return "critical";
}

describe("getHeatmapIntensity", () => {
  it("returns none for 0 count", () => {
    expect(getHeatmapIntensity(0, 10)).toBe("none");
  });

  it("returns none when max is 0", () => {
    expect(getHeatmapIntensity(0, 0)).toBe("none");
  });

  it("returns low for ratio < 0.25", () => {
    expect(getHeatmapIntensity(2, 10)).toBe("low"); // 0.2
  });

  it("returns medium for ratio between 0.25 and 0.5", () => {
    expect(getHeatmapIntensity(3, 10)).toBe("medium"); // 0.3
  });

  it("returns high for ratio between 0.5 and 0.75", () => {
    expect(getHeatmapIntensity(6, 10)).toBe("high"); // 0.6
  });

  it("returns critical for ratio >= 0.75", () => {
    expect(getHeatmapIntensity(8, 10)).toBe("critical"); // 0.8
  });

  it("returns critical for ratio === 1", () => {
    expect(getHeatmapIntensity(10, 10)).toBe("critical");
  });
});

/* =========================================================================
   Waiting time formatting
   ========================================================================= */

function formatWaiting(hours: number): string {
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  return `${days}d ${remainingHours}h`;
}

describe("formatWaiting", () => {
  it("returns <1h for 0 hours", () => {
    expect(formatWaiting(0)).toBe("<1h");
  });

  it("returns <1h for fractional hours < 1", () => {
    expect(formatWaiting(0.5)).toBe("<1h");
  });

  it("returns hours for < 24h", () => {
    expect(formatWaiting(5)).toBe("5h");
    expect(formatWaiting(23)).toBe("23h");
  });

  it("returns days and hours for >= 24h", () => {
    expect(formatWaiting(25)).toBe("1d 1h");
    expect(formatWaiting(48)).toBe("2d 0h");
    expect(formatWaiting(72)).toBe("3d 0h");
  });

  it("handles exactly 24 hours", () => {
    expect(formatWaiting(24)).toBe("1d 0h");
  });
});
