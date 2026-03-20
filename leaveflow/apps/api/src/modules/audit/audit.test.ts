/**
 * Audit Trail tests — repository and service.
 *
 * Uses mongodb-memory-server for real Mongoose integration tests.
 * Service-layer tests use mocked repository to stay fast and isolated.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";

import {
  setupTestDb,
  teardownTestDb,
  clearAllCollections,
} from "../../../test/helpers/db.helper.js";

import { AuditLogModel } from "../../models/audit-log.model.js";
import { createAuditRepository } from "./audit.repository.js";
import { createAuditService } from "./audit.service.js";
import type { AuditRepository } from "./audit.repository.js";
import type { IAuditLog } from "../../models/audit-log.model.js";
import type { CreateAuditEntryInput, PaginatedResult } from "./audit.types.js";

// ----------------------------------------------------------------
// Shared test fixtures
// ----------------------------------------------------------------

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function makeEntry(overrides: Partial<CreateAuditEntryInput> = {}): CreateAuditEntryInput {
  return {
    tenantId: TENANT_A,
    actorId: "actor-001",
    actorType: "employee",
    action: "leave_request.submitted",
    entityType: "leave_request",
    entityId: "lr-001",
    changes: null,
    metadata: null,
    ...overrides,
  };
}

// ----------------------------------------------------------------
// Repository integration tests (real MongoDB)
// ----------------------------------------------------------------

describe("AuditRepository", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearAllCollections();
  });

  describe("insert", () => {
    it("creates a new audit log entry", async () => {
      const repo = createAuditRepository();
      const entry = await repo.insert(makeEntry());

      expect(entry._id).toBeDefined();
      expect(entry.tenantId).toBe(TENANT_A);
      expect(entry.actorId).toBe("actor-001");
      expect(entry.action).toBe("leave_request.submitted");
      expect(entry.entityType).toBe("leave_request");
      expect(entry.entityId).toBe("lr-001");
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it("stores changes and metadata when provided", async () => {
      const repo = createAuditRepository();
      const entry = await repo.insert(
        makeEntry({
          changes: { status: { from: "pending", to: "approved" } },
          metadata: { ip: "127.0.0.1" },
        })
      );

      expect(entry.changes).toEqual({ status: { from: "pending", to: "approved" } });
      expect(entry.metadata).toEqual({ ip: "127.0.0.1" });
    });

    it("is scoped to the provided tenantId", async () => {
      const repo = createAuditRepository();
      await repo.insert(makeEntry({ tenantId: TENANT_A }));
      await repo.insert(makeEntry({ tenantId: TENANT_B }));

      const countA = await AuditLogModel.countDocuments({ tenantId: TENANT_A });
      const countB = await AuditLogModel.countDocuments({ tenantId: TENANT_B });
      expect(countA).toBe(1);
      expect(countB).toBe(1);
    });
  });

  describe("immutability enforcement", () => {
    it("does NOT expose an update method on the repository", () => {
      const repo = createAuditRepository();

      // The repository object must not have update/delete methods
      expect("update" in repo).toBe(false);
      expect("updateById" in repo).toBe(false);
      expect("delete" in repo).toBe(false);
      expect("deleteById" in repo).toBe(false);
      expect("remove" in repo).toBe(false);
    });

    it("throws when attempting updateOne on the Mongoose model directly", async () => {
      const repo = createAuditRepository();
      await repo.insert(makeEntry());

      await expect(
        AuditLogModel.updateOne({ tenantId: TENANT_A }, { $set: { action: "mutated" } })
      ).rejects.toThrow(/immutable/i);
    });
  });

  describe("findByTenant", () => {
    beforeEach(async () => {
      const repo = createAuditRepository();
      // Insert 5 entries with different timestamps (oldest first)
      for (let i = 0; i < 5; i++) {
        await repo.insert(
          makeEntry({
            entityId: `lr-00${i}`,
            metadata: { seq: i },
          })
        );
        // Slight offset so timestamps differ reliably
        await new Promise((r) => setTimeout(r, 2));
      }
    });

    it("returns paginated results in reverse chronological order", async () => {
      const repo = createAuditRepository();
      const result = await repo.findByTenant(TENANT_A, { page: 1, limit: 3 });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(3);

      // Newest should come first
      const timestamps = result.items.map((e) => e.timestamp.getTime());
      expect(timestamps[0]).toBeGreaterThanOrEqual(timestamps[1] ?? 0);
    });

    it("does not leak entries from another tenant", async () => {
      const repo = createAuditRepository();
      await repo.insert(makeEntry({ tenantId: TENANT_B }));

      const result = await repo.findByTenant(TENANT_B, { page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
    });

    it("filters by date range when provided", async () => {
      const repo = createAuditRepository();
      const now = new Date();
      const future = new Date(now.getTime() + 60_000);

      const result = await repo.findByTenant(TENANT_A, { page: 1, limit: 10 }, {
        dateFrom: new Date(0),
        dateTo: future,
      });

      expect(result.total).toBe(5);
    });
  });

  describe("findByEntity", () => {
    it("returns only entries for the specified entity", async () => {
      const repo = createAuditRepository();
      await repo.insert(makeEntry({ entityId: "lr-AAA" }));
      await repo.insert(makeEntry({ entityId: "lr-BBB" }));
      await repo.insert(makeEntry({ entityId: "lr-AAA", action: "leave_request.approved" }));

      const result = await repo.findByEntity(TENANT_A, "leave_request", "lr-AAA", {
        page: 1,
        limit: 10,
      });

      expect(result.total).toBe(2);
      expect(result.items.every((e) => e.entityId === "lr-AAA")).toBe(true);
    });
  });

  describe("findByActor", () => {
    it("returns only entries for the specified actor", async () => {
      const repo = createAuditRepository();
      await repo.insert(makeEntry({ actorId: "user-X" }));
      await repo.insert(makeEntry({ actorId: "user-Y" }));
      await repo.insert(makeEntry({ actorId: "user-X", action: "leave_request.approved" }));

      const result = await repo.findByActor(TENANT_A, "user-X", { page: 1, limit: 10 });

      expect(result.total).toBe(2);
      expect(result.items.every((e) => String(e.actorId) === "user-X")).toBe(true);
    });
  });

  describe("getActivityFeed", () => {
    it("returns the last N events for a tenant", async () => {
      const repo = createAuditRepository();
      for (let i = 0; i < 10; i++) {
        await repo.insert(makeEntry({ entityId: `lr-${i}` }));
        await new Promise((r) => setTimeout(r, 1));
      }

      const feed = await repo.getActivityFeed(TENANT_A, 5);

      expect(feed).toHaveLength(5);
    });

    it("respects tenant isolation", async () => {
      const repo = createAuditRepository();
      await repo.insert(makeEntry({ tenantId: TENANT_B }));
      for (let i = 0; i < 3; i++) {
        await repo.insert(makeEntry({ entityId: `lr-${i}` }));
      }

      const feed = await repo.getActivityFeed(TENANT_A, 10);
      expect(feed.every((e) => e.tenantId === TENANT_A)).toBe(true);
    });
  });
});

// ----------------------------------------------------------------
// Service unit tests (mocked repository)
// ----------------------------------------------------------------

describe("AuditService", () => {
  function makeRepoMock(): AuditRepository {
    return {
      insert: vi.fn(),
      findByTenant: vi.fn(),
      findByEntity: vi.fn(),
      findByActor: vi.fn(),
      getActivityFeed: vi.fn(),
    };
  }

  describe("log", () => {
    it("calls repo.insert with correct fields", async () => {
      const repo = makeRepoMock();
      const insertMock = repo.insert as MockedFunction<AuditRepository["insert"]>;
      const fakeEntry = makeEntry() as unknown as IAuditLog;
      insertMock.mockResolvedValue(fakeEntry);

      const service = createAuditService({ repo });
      const result = await service.log({
        tenantId: TENANT_A,
        actorId: "user-1",
        actorRole: "employee",
        action: "leave_request.submitted",
        entityType: "leave_request",
        entityId: "lr-001",
      });

      expect(insertMock).toHaveBeenCalledOnce();
      const callArg = insertMock.mock.calls[0]![0];
      expect(callArg.tenantId).toBe(TENANT_A);
      expect(callArg.actorId).toBe("user-1");
      expect(callArg.action).toBe("leave_request.submitted");
      expect(result).toBe(fakeEntry);
    });

    it("includes actorRole in metadata", async () => {
      const repo = makeRepoMock();
      const insertMock = repo.insert as MockedFunction<AuditRepository["insert"]>;
      insertMock.mockResolvedValue({} as IAuditLog);

      const service = createAuditService({ repo });
      await service.log({
        tenantId: TENANT_A,
        actorId: "user-1",
        actorRole: "manager",
        action: "leave_request.approved",
        entityType: "leave_request",
        entityId: "lr-001",
      });

      const callArg = insertMock.mock.calls[0]![0];
      expect(callArg.metadata?.["actorRole"]).toBe("manager");
    });

    it("defaults actorType to 'employee' when not specified", async () => {
      const repo = makeRepoMock();
      const insertMock = repo.insert as MockedFunction<AuditRepository["insert"]>;
      insertMock.mockResolvedValue({} as IAuditLog);

      const service = createAuditService({ repo });
      await service.log({
        tenantId: TENANT_A,
        actorId: "user-1",
        actorRole: "employee",
        action: "leave_request.submitted",
        entityType: "leave_request",
        entityId: "lr-001",
      });

      const callArg = insertMock.mock.calls[0]![0];
      expect(callArg.actorType).toBe("employee");
    });
  });

  describe("getAuditLog", () => {
    it("delegates to repo.findByTenant and returns enriched items", async () => {
      const repo = makeRepoMock();
      const findMock = repo.findByTenant as MockedFunction<AuditRepository["findByTenant"]>;

      const fakeItems = [
        { actorId: "user-1", actorType: "employee", tenantId: TENANT_A } as IAuditLog,
      ];
      const fakeResult: PaginatedResult<IAuditLog> = {
        items: fakeItems,
        total: 1,
        page: 1,
        limit: 10,
      };
      findMock.mockResolvedValue(fakeResult);

      const service = createAuditService({ repo });
      const result = await service.getAuditLog(TENANT_A, {}, { page: 1, limit: 10 });

      expect(findMock).toHaveBeenCalledWith(TENANT_A, { page: 1, limit: 10 }, {});
      expect(result.items).toHaveLength(1);
      // actorDisplayName is resolved (no employee map → "[Deleted User]")
      expect(result.items[0]?.actorDisplayName).toBe("[Deleted User]");
    });
  });

  describe("getEntityHistory", () => {
    it("delegates to repo.findByEntity", async () => {
      const repo = makeRepoMock();
      const findMock = repo.findByEntity as MockedFunction<AuditRepository["findByEntity"]>;
      findMock.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });

      const service = createAuditService({ repo });
      await service.getEntityHistory(TENANT_A, "leave_request", "lr-001");

      expect(findMock).toHaveBeenCalledWith(
        TENANT_A,
        "leave_request",
        "lr-001",
        { page: 1, limit: 50 }
      );
    });
  });

  describe("resolveActorNames", () => {
    it("maps known actor IDs to display names", () => {
      const service = createAuditService({ repo: makeRepoMock() });
      const entries = [
        { actorId: "abc123", actorType: "employee" } as IAuditLog,
        { actorId: "def456", actorType: "employee" } as IAuditLog,
      ];
      const map = { abc123: "Alice Smith", def456: "Bob Jones" };

      const enriched = service.resolveActorNames(entries, map);

      expect(enriched[0]?.actorDisplayName).toBe("Alice Smith");
      expect(enriched[1]?.actorDisplayName).toBe("Bob Jones");
    });

    it("falls back to '[Deleted User]' for missing actor IDs (GDPR)", () => {
      const service = createAuditService({ repo: makeRepoMock() });
      const entries = [{ actorId: "deleted-id", actorType: "employee" } as IAuditLog];

      const enriched = service.resolveActorNames(entries, {});

      expect(enriched[0]?.actorDisplayName).toBe("[Deleted User]");
    });

    it("uses 'System' for system actor type regardless of ID", () => {
      const service = createAuditService({ repo: makeRepoMock() });
      const entries = [{ actorId: "sys-job", actorType: "system" } as IAuditLog];

      const enriched = service.resolveActorNames(entries, {});

      expect(enriched[0]?.actorDisplayName).toBe("System");
    });

    it("uses 'Bot' for bot actor type", () => {
      const service = createAuditService({ repo: makeRepoMock() });
      const entries = [{ actorId: "slack-bot", actorType: "bot" } as IAuditLog];

      const enriched = service.resolveActorNames(entries, {});

      expect(enriched[0]?.actorDisplayName).toBe("Bot");
    });

    it("does not mutate the original entries", () => {
      const service = createAuditService({ repo: makeRepoMock() });
      const original = { actorId: "x", actorType: "employee" } as IAuditLog;
      const entries = [original];

      service.resolveActorNames(entries, { x: "Xavier" });

      // Original object must not have been modified
      expect((original as Record<string, unknown>)["actorDisplayName"]).toBeUndefined();
    });
  });
});
