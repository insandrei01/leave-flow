import { describe, it, expect } from "vitest";
import {
  ROLES,
  LEAVE_REQUEST_STATUS,
  TERMINAL_LEAVE_REQUEST_STATUSES,
  APPROVAL_ACTIONS,
  LEDGER_ENTRY_TYPES,
  POSITIVE_LEDGER_ENTRY_TYPES,
  NEGATIVE_LEDGER_ENTRY_TYPES,
  ESCALATION_MODES,
  PLANS,
  PLAN_LIMITS,
  BOT_PLATFORMS,
  NOTIFICATION_CHANNELS,
} from "../index.js";

/**
 * Snapshot tests guard against accidental value changes.
 * If a value changes, the snapshot must be explicitly updated.
 */

describe("ROLES", () => {
  it("matches snapshot", () => {
    expect(ROLES).toMatchInlineSnapshot(`
      {
        "company_admin": "company_admin",
        "employee": "employee",
        "hr_admin": "hr_admin",
        "manager": "manager",
      }
    `);
  });

  it("has exactly 4 roles", () => {
    expect(Object.keys(ROLES)).toHaveLength(4);
  });

  it("key equals value for all entries", () => {
    for (const [key, value] of Object.entries(ROLES)) {
      expect(key).toBe(value);
    }
  });
});

describe("LEAVE_REQUEST_STATUS", () => {
  it("matches snapshot", () => {
    expect(LEAVE_REQUEST_STATUS).toMatchInlineSnapshot(`
      {
        "approved": "approved",
        "auto_approved": "auto_approved",
        "cancelled": "cancelled",
        "pending_approval": "pending_approval",
        "pending_validation": "pending_validation",
        "rejected": "rejected",
        "validation_failed": "validation_failed",
      }
    `);
  });

  it("has exactly 7 statuses", () => {
    expect(Object.keys(LEAVE_REQUEST_STATUS)).toHaveLength(7);
  });

  it("terminal statuses are a subset of all statuses", () => {
    const allStatuses = new Set(Object.values(LEAVE_REQUEST_STATUS));
    for (const status of TERMINAL_LEAVE_REQUEST_STATUSES) {
      expect(allStatuses.has(status)).toBe(true);
    }
  });

  it("pending statuses are not in terminal list", () => {
    const terminalSet = new Set(TERMINAL_LEAVE_REQUEST_STATUSES);
    expect(terminalSet.has(LEAVE_REQUEST_STATUS.pending_validation)).toBe(
      false
    );
    expect(terminalSet.has(LEAVE_REQUEST_STATUS.pending_approval)).toBe(false);
  });
});

describe("APPROVAL_ACTIONS", () => {
  it("matches snapshot", () => {
    expect(APPROVAL_ACTIONS).toMatchInlineSnapshot(`
      {
        "approved": "approved",
        "delegated": "delegated",
        "escalated": "escalated",
        "force_approved": "force_approved",
        "rejected": "rejected",
        "skipped": "skipped",
      }
    `);
  });

  it("has exactly 6 actions", () => {
    expect(Object.keys(APPROVAL_ACTIONS)).toHaveLength(6);
  });

  it("key equals value for all entries", () => {
    for (const [key, value] of Object.entries(APPROVAL_ACTIONS)) {
      expect(key).toBe(value);
    }
  });
});

describe("LEDGER_ENTRY_TYPES", () => {
  it("matches snapshot", () => {
    expect(LEDGER_ENTRY_TYPES).toMatchInlineSnapshot(`
      {
        "accrual": "accrual",
        "carryover": "carryover",
        "carryover_expiry": "carryover_expiry",
        "deduction": "deduction",
        "initial_allocation": "initial_allocation",
        "manual_adjustment": "manual_adjustment",
        "restoration": "restoration",
        "year_end_forfeit": "year_end_forfeit",
      }
    `);
  });

  it("has exactly 8 entry types", () => {
    expect(Object.keys(LEDGER_ENTRY_TYPES)).toHaveLength(8);
  });

  it("positive and negative sets are disjoint", () => {
    const positiveSet = new Set(POSITIVE_LEDGER_ENTRY_TYPES);
    for (const type of NEGATIVE_LEDGER_ENTRY_TYPES) {
      expect(positiveSet.has(type)).toBe(false);
    }
  });

  it("manual_adjustment is in neither positive nor negative set", () => {
    const positiveSet = new Set(POSITIVE_LEDGER_ENTRY_TYPES);
    const negativeSet = new Set(NEGATIVE_LEDGER_ENTRY_TYPES);
    expect(positiveSet.has(LEDGER_ENTRY_TYPES.manual_adjustment)).toBe(false);
    expect(negativeSet.has(LEDGER_ENTRY_TYPES.manual_adjustment)).toBe(false);
  });

  it("positive and negative sets combined with manual_adjustment cover all types", () => {
    const allTypes = new Set(Object.values(LEDGER_ENTRY_TYPES));
    const coveredTypes = new Set([
      ...POSITIVE_LEDGER_ENTRY_TYPES,
      ...NEGATIVE_LEDGER_ENTRY_TYPES,
      LEDGER_ENTRY_TYPES.manual_adjustment,
    ]);
    for (const type of allTypes) {
      expect(coveredTypes.has(type)).toBe(true);
    }
  });
});

describe("ESCALATION_MODES", () => {
  it("matches snapshot", () => {
    expect(ESCALATION_MODES).toMatchInlineSnapshot(`
      {
        "auto_approve": "auto_approve",
        "escalate_next": "escalate_next",
        "notify_hr": "notify_hr",
        "remind": "remind",
      }
    `);
  });

  it("has exactly 4 escalation modes", () => {
    expect(Object.keys(ESCALATION_MODES)).toHaveLength(4);
  });

  it("key equals value for all entries", () => {
    for (const [key, value] of Object.entries(ESCALATION_MODES)) {
      expect(key).toBe(value);
    }
  });
});

describe("PLANS", () => {
  it("matches snapshot", () => {
    expect(PLANS).toMatchInlineSnapshot(`
      {
        "business": "business",
        "enterprise": "enterprise",
        "free": "free",
        "team": "team",
      }
    `);
  });

  it("has exactly 4 plans", () => {
    expect(Object.keys(PLANS)).toHaveLength(4);
  });

  it("every plan has a corresponding limits entry", () => {
    for (const plan of Object.values(PLANS)) {
      expect(PLAN_LIMITS[plan]).toBeDefined();
    }
  });

  it("free plan is the most restrictive", () => {
    expect(PLAN_LIMITS.free.maxEmployees).toBeLessThan(
      PLAN_LIMITS.team.maxEmployees
    );
    expect(PLAN_LIMITS.team.maxEmployees).toBeLessThan(
      PLAN_LIMITS.business.maxEmployees
    );
  });

  it("enterprise plan has unlimited employees", () => {
    expect(PLAN_LIMITS.enterprise.maxEmployees).toBe(Infinity);
  });

  it("plan limits have the required shape", () => {
    for (const limits of Object.values(PLAN_LIMITS)) {
      expect(typeof limits.maxEmployees).toBe("number");
      expect(typeof limits.maxWorkflows).toBe("number");
      expect(typeof limits.maxLeaveTypes).toBe("number");
    }
  });
});

describe("BOT_PLATFORMS", () => {
  it("matches snapshot", () => {
    expect(BOT_PLATFORMS).toMatchInlineSnapshot(`
      {
        "slack": "slack",
        "teams": "teams",
      }
    `);
  });

  it("has exactly 2 platforms", () => {
    expect(Object.keys(BOT_PLATFORMS)).toHaveLength(2);
  });

  it("key equals value for all entries", () => {
    for (const [key, value] of Object.entries(BOT_PLATFORMS)) {
      expect(key).toBe(value);
    }
  });
});

describe("NOTIFICATION_CHANNELS", () => {
  it("matches snapshot", () => {
    expect(NOTIFICATION_CHANNELS).toMatchInlineSnapshot(`
      {
        "email": "email",
        "in_app": "in_app",
        "slack": "slack",
        "teams": "teams",
      }
    `);
  });

  it("has exactly 4 channels", () => {
    expect(Object.keys(NOTIFICATION_CHANNELS)).toHaveLength(4);
  });

  it("includes all bot platforms", () => {
    for (const platform of Object.values(BOT_PLATFORMS)) {
      expect(
        Object.values(NOTIFICATION_CHANNELS).includes(platform as never)
      ).toBe(true);
    }
  });

  it("key equals value for all entries", () => {
    for (const [key, value] of Object.entries(NOTIFICATION_CHANNELS)) {
      expect(key).toBe(value);
    }
  });
});
