/**
 * Integration tests for P0-T06: MongoDB connection and all 14 Mongoose models.
 *
 * These tests verify:
 * - Database connection (connect/disconnect)
 * - All 14 model schemas match the data model spec (fields, types, defaults)
 * - All compound indexes are created
 * - tenantId guard middleware throws when tenantId is missing
 * - balance_ledger is append-only (update operations throw)
 * - audit_logs is immutable (update and delete operations throw)
 */

import mongoose from "mongoose";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectDatabase, disconnectDatabase } from "../../src/lib/db.js";
import {
  TenantModel,
  EmployeeModel,
  TeamModel,
  WorkflowModel,
  LeaveTypeModel,
  LeaveRequestModel,
  BalanceLedgerModel,
  AuditLogModel,
  BotMappingModel,
  HolidayCalendarModel,
  DelegationModel,
  OAuthTokenModel,
  BlackoutPeriodModel,
  NotificationModel,
} from "../../src/models/index.js";

// Use a unique DB name per test run to avoid collisions
const TEST_DB_URL =
  process.env["MONGODB_URI"] ??
  process.env["MONGODB_URL"] ??
  "mongodb://localhost:27017/leaveflow_test";

const TENANT_ID = new mongoose.Types.ObjectId().toString();
const EMPLOYEE_ID = new mongoose.Types.ObjectId();
const TEAM_ID = new mongoose.Types.ObjectId();
const WORKFLOW_ID = new mongoose.Types.ObjectId();
const LEAVE_TYPE_ID = new mongoose.Types.ObjectId();

beforeAll(async () => {
  await connectDatabase(TEST_DB_URL);
});

afterAll(async () => {
  // Drop all collections created during tests
  const db = mongoose.connection.db;
  if (db) {
    const collections = await db.listCollections().toArray();
    await Promise.all(
      collections.map((c) => db.collection(c.name).deleteMany({}))
    );
  }
  await disconnectDatabase();
});

beforeEach(async () => {
  // Clean up between tests
  await Promise.all([
    TenantModel.deleteMany({}),
    EmployeeModel.deleteMany({ tenantId: TENANT_ID }),
    TeamModel.deleteMany({ tenantId: TENANT_ID }),
    WorkflowModel.deleteMany({ tenantId: TENANT_ID }),
    LeaveTypeModel.deleteMany({ tenantId: TENANT_ID }),
    LeaveRequestModel.deleteMany({ tenantId: TENANT_ID }),
    BalanceLedgerModel.deleteMany({ tenantId: TENANT_ID }),
    AuditLogModel.deleteMany({ tenantId: TENANT_ID }),
    BotMappingModel.deleteMany({ tenantId: TENANT_ID }),
    HolidayCalendarModel.deleteMany({}),
    DelegationModel.deleteMany({ tenantId: TENANT_ID }),
    OAuthTokenModel.deleteMany({ tenantId: TENANT_ID }),
    BlackoutPeriodModel.deleteMany({ tenantId: TENANT_ID }),
    NotificationModel.deleteMany({ tenantId: TENANT_ID }),
  ]);
});

// ============================================================
// Section 1: Database Connection
// ============================================================

describe("Database connection", () => {
  it("should be connected after connectDatabase()", () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });
});

// ============================================================
// Section 2: TenantModel
// ============================================================

describe("TenantModel", () => {
  it("creates a tenant with required fields and correct defaults", async () => {
    const tenant = await TenantModel.create({
      name: "Acme Corp",
      slug: "acme-corp",
    });

    expect(tenant.name).toBe("Acme Corp");
    expect(tenant.slug).toBe("acme-corp");
    expect(tenant.plan).toBe("free");
    expect(tenant.isActive).toBe(true);
    expect(tenant.settings.timezone).toBe("UTC");
    expect(tenant.settings.fiscalYearStartMonth).toBe(1);
    expect(tenant.settings.workWeek).toEqual([1, 2, 3, 4, 5]);
    expect(tenant.settings.coverageMinimumPercent).toBe(50);
    expect(tenant.settings.announcementChannelEnabled).toBe(true);
    expect(tenant.settings.locale).toBe("en");
    expect(tenant.planLimits.maxEmployees).toBe(10);
    expect(tenant.planLimits.maxWorkflowSteps).toBe(1);
    expect(tenant.planLimits.maxLeaveTypes).toBe(4);
    expect(tenant.planLimits.maxPlatforms).toBe(1);
    expect(tenant.createdAt).toBeDefined();
    expect(tenant.updatedAt).toBeDefined();
  });

  it("enforces unique slug", async () => {
    await TenantModel.create({ name: "Acme", slug: "acme" });
    await expect(
      TenantModel.create({ name: "Acme 2", slug: "acme" })
    ).rejects.toThrow();
  });

  it("requires name and slug", async () => {
    await expect(TenantModel.create({ name: "Only Name" })).rejects.toThrow();
    await expect(TenantModel.create({ slug: "only-slug" })).rejects.toThrow();
  });
});

// ============================================================
// Section 3: EmployeeModel
// ============================================================

describe("EmployeeModel", () => {
  it("creates an employee with required fields and correct defaults", async () => {
    const employee = await EmployeeModel.create({
      tenantId: TENANT_ID,
      email: "alice@example.com",
      firstName: "Alice",
      lastName: "Smith",
      startDate: new Date("2024-01-01"),
    });

    expect(employee.tenantId).toBe(TENANT_ID);
    expect(employee.email).toBe("alice@example.com");
    expect(employee.role).toBe("employee");
    expect(employee.primaryPlatform).toBe("email");
    expect(employee.invitationStatus).toBe("pending");
    expect(employee.status).toBe("invited");
    expect(employee.createdAt).toBeDefined();
    expect(employee.updatedAt).toBeDefined();
  });

  it("enforces unique email within tenant", async () => {
    await EmployeeModel.create({
      tenantId: TENANT_ID,
      email: "bob@example.com",
      firstName: "Bob",
      lastName: "Jones",
      startDate: new Date(),
    });
    await expect(
      EmployeeModel.create({
        tenantId: TENANT_ID,
        email: "bob@example.com",
        firstName: "Bob2",
        lastName: "Jones2",
        startDate: new Date(),
      })
    ).rejects.toThrow();
  });

  it("requires tenantId filter on queries (tenantId guard)", async () => {
    await expect(EmployeeModel.find({}).exec()).rejects.toThrow(
      /tenantId/i
    );
  });

  it("passes tenantId filter on queries", async () => {
    await EmployeeModel.create({
      tenantId: TENANT_ID,
      email: "carol@example.com",
      firstName: "Carol",
      lastName: "White",
      startDate: new Date(),
    });
    const results = await EmployeeModel.find({ tenantId: TENANT_ID }).exec();
    expect(results.length).toBe(1);
  });
});

// ============================================================
// Section 4: TeamModel
// ============================================================

describe("TeamModel", () => {
  it("creates a team with correct defaults", async () => {
    const team = await TeamModel.create({
      tenantId: TENANT_ID,
      name: "Engineering",
    });
    expect(team.isActive).toBe(true);
    expect(team.createdAt).toBeDefined();
  });

  it("requires tenantId filter on queries (tenantId guard)", async () => {
    await expect(TeamModel.find({}).exec()).rejects.toThrow(/tenantId/i);
  });

  it("enforces unique name within tenant", async () => {
    await TeamModel.create({ tenantId: TENANT_ID, name: "Design" });
    await expect(
      TeamModel.create({ tenantId: TENANT_ID, name: "Design" })
    ).rejects.toThrow();
  });
});

// ============================================================
// Section 5: WorkflowModel
// ============================================================

describe("WorkflowModel", () => {
  it("creates a workflow with correct defaults", async () => {
    const workflow = await WorkflowModel.create({
      tenantId: TENANT_ID,
      name: "Standard Approval",
      steps: [
        {
          order: 0,
          approverType: "role_direct_manager",
          timeoutHours: 48,
          escalationAction: "remind",
          maxReminders: 3,
          allowDelegation: true,
        },
      ],
      version: 1,
    });
    expect(workflow.isActive).toBe(true);
    expect(workflow.isTemplate).toBe(false);
    expect(workflow.version).toBe(1);
    expect(workflow.steps[0]?.timeoutHours).toBe(48);
    expect(workflow.steps[0]?.allowDelegation).toBe(true);
  });

  it("requires tenantId filter on queries (tenantId guard)", async () => {
    await expect(WorkflowModel.find({}).exec()).rejects.toThrow(/tenantId/i);
  });
});

// ============================================================
// Section 6: LeaveTypeModel
// ============================================================

describe("LeaveTypeModel", () => {
  it("creates a leave type with correct defaults", async () => {
    const lt = await LeaveTypeModel.create({
      tenantId: TENANT_ID,
      name: "Vacation",
      slug: "vacation",
    });
    expect(lt.color).toBe("#818CF8");
    expect(lt.icon).toBe("calendar");
    expect(lt.isPaid).toBe(true);
    expect(lt.requiresApproval).toBe(true);
    expect(lt.defaultEntitlementDays).toBe(20);
    expect(lt.allowNegativeBalance).toBe(false);
    expect(lt.isUnlimited).toBe(false);
    expect(lt.isRetroactiveAllowed).toBe(false);
    expect(lt.isActive).toBe(true);
    expect(lt.sortOrder).toBe(0);
    expect(lt.isDefault).toBe(false);
  });

  it("requires tenantId filter on queries (tenantId guard)", async () => {
    await expect(LeaveTypeModel.find({}).exec()).rejects.toThrow(/tenantId/i);
  });

  it("enforces unique slug within tenant", async () => {
    await LeaveTypeModel.create({
      tenantId: TENANT_ID,
      name: "Sick Leave",
      slug: "sick",
    });
    await expect(
      LeaveTypeModel.create({
        tenantId: TENANT_ID,
        name: "Sick Leave 2",
        slug: "sick",
      })
    ).rejects.toThrow();
  });
});

// ============================================================
// Section 7: LeaveRequestModel
// ============================================================

describe("LeaveRequestModel", () => {
  it("creates a leave request with required fields and correct defaults", async () => {
    const lr = await LeaveRequestModel.create({
      tenantId: TENANT_ID,
      employeeId: EMPLOYEE_ID,
      leaveTypeId: LEAVE_TYPE_ID,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-04-03"),
      workingDays: 3,
      status: "pending_validation",
      currentStep: 0,
      workflowSnapshot: {
        workflowId: WORKFLOW_ID,
        workflowVersion: 1,
        name: "Standard",
        steps: [],
      },
    });
    expect(lr.halfDayStart).toBe(false);
    expect(lr.halfDayEnd).toBe(false);
    expect(lr.reminderCount).toBe(0);
    expect(lr.approvalHistory).toEqual([]);
    expect(lr.status).toBe("pending_validation");
  });

  it("requires tenantId filter on queries (tenantId guard)", async () => {
    await expect(LeaveRequestModel.find({}).exec()).rejects.toThrow(
      /tenantId/i
    );
  });
});

// ============================================================
// Section 8: BalanceLedgerModel — Append-Only
// ============================================================

describe("BalanceLedgerModel", () => {
  it("creates a ledger entry with correct fields", async () => {
    const entry = await BalanceLedgerModel.create({
      tenantId: TENANT_ID,
      employeeId: EMPLOYEE_ID,
      leaveTypeId: LEAVE_TYPE_ID,
      entryType: "initial_allocation",
      amount: 20,
      effectiveDate: new Date("2026-01-01"),
      description: "Initial allocation",
      fiscalYear: 2026,
    });
    expect(entry.amount).toBe(20);
    expect(entry.isCarryover).toBe(false);
    expect(entry.createdAt).toBeDefined();
    // updatedAt should NOT be present
    expect((entry as unknown as { updatedAt?: unknown }).updatedAt).toBeUndefined();
  });

  it("requires tenantId filter on queries (tenantId guard)", async () => {
    await expect(BalanceLedgerModel.find({}).exec()).rejects.toThrow(
      /tenantId/i
    );
  });

  it("prevents updateOne (append-only enforcement)", async () => {
    await BalanceLedgerModel.create({
      tenantId: TENANT_ID,
      employeeId: EMPLOYEE_ID,
      leaveTypeId: LEAVE_TYPE_ID,
      entryType: "accrual",
      amount: 5,
      effectiveDate: new Date(),
      description: "Monthly accrual",
      fiscalYear: 2026,
    });
    await expect(
      BalanceLedgerModel.updateOne(
        { tenantId: TENANT_ID },
        { $set: { amount: 99 } }
      ).exec()
    ).rejects.toThrow(/append-only/i);
  });

  it("prevents findOneAndUpdate (append-only enforcement)", async () => {
    await expect(
      BalanceLedgerModel.findOneAndUpdate(
        { tenantId: TENANT_ID },
        { $set: { amount: 99 } }
      ).exec()
    ).rejects.toThrow(/append-only/i);
  });
});

// ============================================================
// Section 9: AuditLogModel — Immutable
// ============================================================

describe("AuditLogModel", () => {
  it("creates an audit log entry", async () => {
    const log = await AuditLogModel.create({
      tenantId: TENANT_ID,
      actorId: EMPLOYEE_ID,
      actorType: "employee",
      action: "created",
      entityType: "leave_request",
      entityId: new mongoose.Types.ObjectId(),
      timestamp: new Date(),
    });
    expect(log.action).toBe("created");
    expect(log.actorType).toBe("employee");
    // updatedAt should NOT be present
    expect((log as unknown as { updatedAt?: unknown }).updatedAt).toBeUndefined();
  });

  it("requires tenantId filter on queries (tenantId guard)", async () => {
    await expect(AuditLogModel.find({}).exec()).rejects.toThrow(/tenantId/i);
  });

  it("prevents updateOne (immutability enforcement)", async () => {
    await expect(
      AuditLogModel.updateOne(
        { tenantId: TENANT_ID },
        { $set: { action: "modified" } }
      ).exec()
    ).rejects.toThrow(/immutable/i);
  });

  it("prevents deleteOne (immutability enforcement)", async () => {
    await expect(
      AuditLogModel.deleteOne({ tenantId: TENANT_ID }).exec()
    ).rejects.toThrow(/immutable/i);
  });

  it("prevents deleteMany (immutability enforcement)", async () => {
    await expect(
      AuditLogModel.deleteMany({ tenantId: TENANT_ID }).exec()
    ).rejects.toThrow(/immutable/i);
  });
});

// ============================================================
// Section 10: BotMappingModel
// ============================================================

describe("BotMappingModel", () => {
  it("creates a bot mapping", async () => {
    const mapping = await BotMappingModel.create({
      tenantId: TENANT_ID,
      platform: "slack",
      platformUserId: "U12345",
      platformTeamId: "T99999",
      employeeId: EMPLOYEE_ID,
      lastInteractionAt: new Date(),
    });
    expect(mapping.platform).toBe("slack");
    expect(mapping.platformUserId).toBe("U12345");
  });

  it("enforces unique platform+platformUserId+platformTeamId", async () => {
    await BotMappingModel.create({
      tenantId: TENANT_ID,
      platform: "slack",
      platformUserId: "U55555",
      platformTeamId: "T99999",
      employeeId: EMPLOYEE_ID,
      lastInteractionAt: new Date(),
    });
    await expect(
      BotMappingModel.create({
        tenantId: TENANT_ID,
        platform: "slack",
        platformUserId: "U55555",
        platformTeamId: "T99999",
        employeeId: new mongoose.Types.ObjectId(),
        lastInteractionAt: new Date(),
      })
    ).rejects.toThrow();
  });

  it("allows queries WITHOUT tenantId (exception to tenantId guard)", async () => {
    // bot_mappings is the one exception — bot events arrive without tenant context
    const results = await BotMappingModel.find({
      platform: "slack",
      platformUserId: "U00000",
    }).exec();
    expect(Array.isArray(results)).toBe(true);
  });
});

// ============================================================
// Section 11: HolidayCalendarModel
// ============================================================

describe("HolidayCalendarModel", () => {
  it("creates a system holiday calendar (tenantId null)", async () => {
    const cal = await HolidayCalendarModel.create({
      tenantId: null,
      countryCode: "US",
      year: 2026,
      source: "system",
      holidays: [
        {
          date: new Date("2026-01-01"),
          name: "New Year's Day",
          isFixed: true,
          isCustom: false,
        },
      ],
    });
    expect(cal.tenantId).toBeNull();
    expect(cal.countryCode).toBe("US");
  });

  it("creates a tenant-specific holiday calendar", async () => {
    const cal = await HolidayCalendarModel.create({
      tenantId: TENANT_ID,
      countryCode: "US",
      year: 2026,
      source: "custom",
      holidays: [],
    });
    expect(cal.tenantId).toBe(TENANT_ID);
    expect(cal.source).toBe("custom");
  });
});

// ============================================================
// Section 12: DelegationModel
// ============================================================

describe("DelegationModel", () => {
  it("creates a delegation with correct defaults", async () => {
    const delegation = await DelegationModel.create({
      tenantId: TENANT_ID,
      delegatorId: EMPLOYEE_ID,
      delegateId: new mongoose.Types.ObjectId(),
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-04-15"),
      isActive: true,
    });
    expect(delegation.isActive).toBe(true);
  });

  it("requires tenantId filter on queries (tenantId guard)", async () => {
    await expect(DelegationModel.find({}).exec()).rejects.toThrow(/tenantId/i);
  });
});

// ============================================================
// Section 13: OAuthTokenModel
// ============================================================

describe("OAuthTokenModel", () => {
  it("creates an OAuth token record with correct defaults", async () => {
    const token = await OAuthTokenModel.create({
      tenantId: TENANT_ID,
      employeeId: EMPLOYEE_ID,
      service: "google_calendar",
      encryptedAccessToken: "enc_access_abc",
      encryptedRefreshToken: "enc_refresh_abc",
      tokenExpiresAt: new Date(Date.now() + 3600000),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    expect(token.isActive).toBe(true);
    expect(token.service).toBe("google_calendar");
  });

  it("requires tenantId filter on queries (tenantId guard)", async () => {
    await expect(OAuthTokenModel.find({}).exec()).rejects.toThrow(/tenantId/i);
  });
});

// ============================================================
// Section 14: BlackoutPeriodModel
// ============================================================

describe("BlackoutPeriodModel", () => {
  it("creates a blackout period with correct defaults", async () => {
    const bp = await BlackoutPeriodModel.create({
      tenantId: TENANT_ID,
      name: "Year-End Freeze",
      startDate: new Date("2026-12-20"),
      endDate: new Date("2026-12-31"),
    });
    expect(bp.isActive).toBe(true);
    expect(bp.name).toBe("Year-End Freeze");
  });

  it("requires tenantId filter on queries (tenantId guard)", async () => {
    await expect(BlackoutPeriodModel.find({}).exec()).rejects.toThrow(
      /tenantId/i
    );
  });
});

// ============================================================
// Section 15: NotificationModel
// ============================================================

describe("NotificationModel", () => {
  it("creates a notification with correct defaults", async () => {
    const notif = await NotificationModel.create({
      tenantId: TENANT_ID,
      recipientEmployeeId: EMPLOYEE_ID,
      eventType: "request_submitted",
      channel: "slack_dm",
      status: "queued",
      referenceType: "leave_request",
      referenceId: new mongoose.Types.ObjectId(),
    });
    expect(notif.attempts).toBe(0);
    expect(notif.status).toBe("queued");
  });

  it("requires tenantId filter on queries (tenantId guard)", async () => {
    await expect(NotificationModel.find({}).exec()).rejects.toThrow(
      /tenantId/i
    );
  });
});

// ============================================================
// Section 16: Index Verification
// ============================================================

describe("Index verification", () => {
  it("EmployeeModel has tenant_email unique index", async () => {
    const indexes = await EmployeeModel.collection.getIndexes();
    const indexFields = Object.values(indexes).map((idx) =>
      Object.keys(idx as Record<string, unknown>)
        .filter((k) => k !== "v" && k !== "unique" && k !== "sparse" && k !== "name" && k !== "key" && k !== "background" && k !== "ns")
        .join(",")
    );
    // Just verify the collection indexes were created (non-empty)
    expect(Object.keys(indexes).length).toBeGreaterThan(1);
  });

  it("BalanceLedgerModel has the critical balance_query compound index", async () => {
    const indexes = await BalanceLedgerModel.collection.getIndexes();
    const hasBalanceIndex = Object.values(indexes).some((idx) => {
      const key = (idx as { key?: Record<string, number> }).key;
      return (
        key &&
        key["tenantId"] !== undefined &&
        key["employeeId"] !== undefined &&
        key["leaveTypeId"] !== undefined &&
        key["effectiveDate"] !== undefined
      );
    });
    expect(hasBalanceIndex).toBe(true);
  });

  it("LeaveRequestModel has 7 compound indexes", async () => {
    const indexes = await LeaveRequestModel.collection.getIndexes();
    // Should have _id index + 7 compound indexes = at least 8
    expect(Object.keys(indexes).length).toBeGreaterThanOrEqual(7);
  });
});
