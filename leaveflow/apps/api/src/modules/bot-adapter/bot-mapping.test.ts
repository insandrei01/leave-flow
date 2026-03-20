/**
 * BotMappingService tests — unit tests with mocked Mongoose model.
 *
 * All Mongoose model methods are replaced with vi.fn() mocks so tests
 * run without a real MongoDB connection.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { BotMappingService } from "./bot-mapping.service.js";

// ----------------------------------------------------------------
// Mock BotMappingModel — use vi.hoisted to avoid hoisting issues
// ----------------------------------------------------------------

const { mockFindOneAndUpdate, mockFindOne, mockFind, mockBulkWrite } = vi.hoisted(() => ({
  mockFindOneAndUpdate: vi.fn(),
  mockFindOne: vi.fn(),
  mockFind: vi.fn(),
  mockBulkWrite: vi.fn(),
}));

vi.mock("../../models/bot-mapping.model.js", () => ({
  BotMappingModel: {
    findOneAndUpdate: mockFindOneAndUpdate,
    findOne: mockFindOne,
    find: mockFind,
    bulkWrite: mockBulkWrite,
  },
}));

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

const TENANT_ID = "tenant-test-001";
const EMPLOYEE_ID = new mongoose.Types.ObjectId();
const PLATFORM_USER_ID = "U12345678";
const PLATFORM_TEAM_ID = "T98765432";

function makeService(): BotMappingService {
  return new BotMappingService();
}

// ----------------------------------------------------------------
// createMapping
// ----------------------------------------------------------------

describe("BotMappingService.createMapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOneAndUpdate.mockResolvedValue({});
  });

  it("upserts a mapping with the correct filter", async () => {
    const service = makeService();

    await service.createMapping({
      tenantId: TENANT_ID,
      employeeId: EMPLOYEE_ID,
      platform: "slack",
      platformUserId: PLATFORM_USER_ID,
      platformTeamId: PLATFORM_TEAM_ID,
    });

    expect(mockFindOneAndUpdate).toHaveBeenCalledOnce();
    const [filter, update, options] = mockFindOneAndUpdate.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
      Record<string, unknown>,
    ];

    expect(filter).toEqual({
      platform: "slack",
      platformUserId: PLATFORM_USER_ID,
      platformTeamId: PLATFORM_TEAM_ID,
    });

    expect((update as { $set: Record<string, unknown> })["$set"]).toMatchObject({
      tenantId: TENANT_ID,
      employeeId: EMPLOYEE_ID,
      conversationReference: null,
    });

    expect(options).toMatchObject({ upsert: true, new: true });
  });

  it("stores conversationReference when provided", async () => {
    const service = makeService();
    const ref = { serviceUrl: "https://teams.example.com", conversationId: "abc" };

    await service.createMapping({
      tenantId: TENANT_ID,
      employeeId: EMPLOYEE_ID,
      platform: "teams",
      platformUserId: PLATFORM_USER_ID,
      platformTeamId: PLATFORM_TEAM_ID,
      conversationReference: ref,
    });

    const [, update] = mockFindOneAndUpdate.mock.calls[0] as [
      unknown,
      { $set: Record<string, unknown> },
    ];
    expect(update["$set"]["conversationReference"]).toEqual(ref);
  });

  it("defaults conversationReference to null when not provided", async () => {
    const service = makeService();

    await service.createMapping({
      tenantId: TENANT_ID,
      employeeId: EMPLOYEE_ID,
      platform: "slack",
      platformUserId: PLATFORM_USER_ID,
      platformTeamId: PLATFORM_TEAM_ID,
    });

    const [, update] = mockFindOneAndUpdate.mock.calls[0] as [
      unknown,
      { $set: Record<string, unknown> },
    ];
    expect(update["$set"]["conversationReference"]).toBeNull();
  });
});

// ----------------------------------------------------------------
// resolveUser
// ----------------------------------------------------------------

describe("BotMappingService.resolveUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no mapping exists", async () => {
    mockFindOne.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    });

    const service = makeService();
    const result = await service.resolveUser("slack", PLATFORM_USER_ID);

    expect(result).toBeNull();
  });

  it("returns resolved mapping when found", async () => {
    const dbMapping = {
      tenantId: TENANT_ID,
      employeeId: EMPLOYEE_ID,
      conversationReference: null,
    };

    mockFindOne.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(dbMapping),
      }),
    });

    const service = makeService();
    const result = await service.resolveUser("slack", PLATFORM_USER_ID);

    expect(result).not.toBeNull();
    expect(result!.tenantId).toBe(TENANT_ID);
    expect(result!.employeeId).toBe(EMPLOYEE_ID.toString());
    expect(result!.conversationReference).toBeNull();
  });

  it("queries by platform and platformUserId only (no tenantId)", async () => {
    mockFindOne.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    });

    const service = makeService();
    await service.resolveUser("teams", "U_TEAMS_99");

    expect(mockFindOne).toHaveBeenCalledWith({
      platform: "teams",
      platformUserId: "U_TEAMS_99",
    });
  });
});

// ----------------------------------------------------------------
// findByEmployee
// ----------------------------------------------------------------

describe("BotMappingService.findByEmployee", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no mappings found", async () => {
    mockFind.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    });

    const service = makeService();
    const result = await service.findByEmployee(TENANT_ID, EMPLOYEE_ID);

    expect(result).toEqual([]);
  });

  it("returns mapped platform connections", async () => {
    const now = new Date();
    const dbMappings = [
      {
        platform: "slack",
        platformUserId: PLATFORM_USER_ID,
        platformTeamId: PLATFORM_TEAM_ID,
        conversationReference: null,
        lastInteractionAt: now,
      },
    ];

    mockFind.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(dbMappings),
      }),
    });

    const service = makeService();
    const result = await service.findByEmployee(TENANT_ID, EMPLOYEE_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      platform: "slack",
      platformUserId: PLATFORM_USER_ID,
      platformTeamId: PLATFORM_TEAM_ID,
      conversationReference: null,
      lastInteractionAt: now,
    });
  });

  it("queries with tenantId and employeeId", async () => {
    mockFind.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    });

    const service = makeService();
    await service.findByEmployee(TENANT_ID, EMPLOYEE_ID);

    expect(mockFind).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      employeeId: EMPLOYEE_ID,
    });
  });
});

// ----------------------------------------------------------------
// syncWorkspaceMembers
// ----------------------------------------------------------------

describe("BotMappingService.syncWorkspaceMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBulkWrite.mockResolvedValue({ ok: 1 });
  });

  it("does nothing when members array is empty", async () => {
    const service = makeService();
    await service.syncWorkspaceMembers(TENANT_ID, "slack", []);

    expect(mockBulkWrite).not.toHaveBeenCalled();
  });

  it("calls bulkWrite with one updateOne per member", async () => {
    const service = makeService();
    const members = [
      {
        platformUserId: "U001",
        platformTeamId: PLATFORM_TEAM_ID,
        employeeId: new mongoose.Types.ObjectId(),
      },
      {
        platformUserId: "U002",
        platformTeamId: PLATFORM_TEAM_ID,
        employeeId: new mongoose.Types.ObjectId(),
      },
    ];

    await service.syncWorkspaceMembers(TENANT_ID, "slack", members);

    expect(mockBulkWrite).toHaveBeenCalledOnce();
    const [ops] = mockBulkWrite.mock.calls[0] as [
      Array<{ updateOne: unknown }>,
      unknown,
    ];
    expect(ops).toHaveLength(2);
    expect(ops[0]).toHaveProperty("updateOne");
    expect(ops[1]).toHaveProperty("updateOne");
  });

  it("uses ordered: false for bulk performance", async () => {
    const service = makeService();

    await service.syncWorkspaceMembers(TENANT_ID, "slack", [
      {
        platformUserId: "U001",
        platformTeamId: PLATFORM_TEAM_ID,
        employeeId: new mongoose.Types.ObjectId(),
      },
    ]);

    const [, options] = mockBulkWrite.mock.calls[0] as [unknown, { ordered: boolean }];
    expect(options.ordered).toBe(false);
  });

  it("sets upsert: true on each bulk operation", async () => {
    const service = makeService();

    await service.syncWorkspaceMembers(TENANT_ID, "slack", [
      {
        platformUserId: "U001",
        platformTeamId: PLATFORM_TEAM_ID,
        employeeId: new mongoose.Types.ObjectId(),
      },
    ]);

    const [ops] = mockBulkWrite.mock.calls[0] as [
      Array<{ updateOne: { upsert: boolean } }>,
      unknown,
    ];
    expect(ops[0].updateOne.upsert).toBe(true);
  });
});
