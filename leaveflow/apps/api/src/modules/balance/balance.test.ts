/**
 * Balance module tests — repository and service.
 *
 * Uses mongodb-memory-server for real aggregation queries.
 * Service tests mock the repository to test business logic in isolation.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import mongoose from "mongoose";
import { setupTestDb, teardownTestDb, clearAllCollections } from "../../../test/helpers/db.helper.js";
import {
  createTestTenant,
  createTestEmployee,
  createTestLeaveType,
  createTestLedgerEntry,
  createTestTeam,
} from "../../../test/helpers/factory.js";
import { BalanceRepository } from "./balance.repository.js";
import { BalanceService } from "./balance.service.js";
import type { IAuditService } from "./balance.service.js";

// ----------------------------------------------------------------
// Repository integration tests (real MongoDB via memory server)
// ----------------------------------------------------------------

describe("BalanceRepository", () => {
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
    it("inserts a ledger entry and returns the saved document", async () => {
      const tenant = await createTestTenant();
      const employee = await createTestEmployee(String(tenant._id));
      const leaveType = await createTestLeaveType(String(tenant._id));

      const repo = new BalanceRepository();
      const entry = await repo.insert({
        tenantId: String(tenant._id),
        employeeId: employee._id as mongoose.Types.ObjectId,
        leaveTypeId: leaveType._id as mongoose.Types.ObjectId,
        entryType: "initial_allocation",
        amount: 20,
        effectiveDate: new Date("2025-01-01"),
        description: "Initial allocation",
        referenceType: "system",
        referenceId: null,
        actorId: null,
        fiscalYear: 2025,
        isCarryover: false,
      });

      expect(entry._id).toBeDefined();
      expect(entry.amount).toBe(20);
      expect(entry.entryType).toBe("initial_allocation");
    });

    it("persists the entry so it is retrievable", async () => {
      const tenant = await createTestTenant();
      const employee = await createTestEmployee(String(tenant._id));
      const leaveType = await createTestLeaveType(String(tenant._id));

      const repo = new BalanceRepository();
      await repo.insert({
        tenantId: String(tenant._id),
        employeeId: employee._id as mongoose.Types.ObjectId,
        leaveTypeId: leaveType._id as mongoose.Types.ObjectId,
        entryType: "initial_allocation",
        amount: 25,
        effectiveDate: new Date("2025-01-01"),
        description: "Test",
        referenceType: "system",
        referenceId: null,
        actorId: null,
        fiscalYear: 2025,
        isCarryover: false,
      });

      const balance = await repo.getBalance(
        String(tenant._id),
        employee._id as mongoose.Types.ObjectId,
        leaveType._id as mongoose.Types.ObjectId
      );

      expect(balance).toBe(25);
    });
  });

  describe("getBalance", () => {
    it("returns 0 when no entries exist", async () => {
      const tenant = await createTestTenant();
      const employee = await createTestEmployee(String(tenant._id));
      const leaveType = await createTestLeaveType(String(tenant._id));

      const repo = new BalanceRepository();
      const balance = await repo.getBalance(
        String(tenant._id),
        employee._id as mongoose.Types.ObjectId,
        leaveType._id as mongoose.Types.ObjectId
      );

      expect(balance).toBe(0);
    });

    it("sums positive and negative entries correctly", async () => {
      const tenant = await createTestTenant();
      const employee = await createTestEmployee(String(tenant._id));
      const leaveType = await createTestLeaveType(String(tenant._id));

      const tenantId = String(tenant._id);
      const employeeId = employee._id as mongoose.Types.ObjectId;
      const leaveTypeId = leaveType._id as mongoose.Types.ObjectId;

      await createTestLedgerEntry(tenantId, employeeId, leaveTypeId, {
        entryType: "initial_allocation",
        amount: 20,
      });
      await createTestLedgerEntry(tenantId, employeeId, leaveTypeId, {
        entryType: "deduction",
        amount: -5,
      });
      await createTestLedgerEntry(tenantId, employeeId, leaveTypeId, {
        entryType: "restoration",
        amount: 2,
      });

      const repo = new BalanceRepository();
      const balance = await repo.getBalance(tenantId, employeeId, leaveTypeId);

      expect(balance).toBe(17);
    });

    it("does not include entries from a different tenant", async () => {
      const tenant1 = await createTestTenant();
      const tenant2 = await createTestTenant();
      const employee1 = await createTestEmployee(String(tenant1._id));
      const employee2 = await createTestEmployee(String(tenant2._id));
      const leaveType1 = await createTestLeaveType(String(tenant1._id));
      const leaveType2 = await createTestLeaveType(String(tenant2._id));

      await createTestLedgerEntry(
        String(tenant1._id),
        employee1._id as mongoose.Types.ObjectId,
        leaveType1._id as mongoose.Types.ObjectId,
        { amount: 20 }
      );
      await createTestLedgerEntry(
        String(tenant2._id),
        employee2._id as mongoose.Types.ObjectId,
        leaveType2._id as mongoose.Types.ObjectId,
        { amount: 30 }
      );

      const repo = new BalanceRepository();
      const balance = await repo.getBalance(
        String(tenant1._id),
        employee1._id as mongoose.Types.ObjectId,
        leaveType1._id as mongoose.Types.ObjectId
      );

      expect(balance).toBe(20);
    });
  });

  describe("getBalances", () => {
    it("returns grouped balances per leave type", async () => {
      const tenant = await createTestTenant();
      const employee = await createTestEmployee(String(tenant._id));
      const leaveType1 = await createTestLeaveType(String(tenant._id));
      const leaveType2 = await createTestLeaveType(String(tenant._id));

      const tenantId = String(tenant._id);
      const employeeId = employee._id as mongoose.Types.ObjectId;

      await createTestLedgerEntry(
        tenantId,
        employeeId,
        leaveType1._id as mongoose.Types.ObjectId,
        { amount: 20 }
      );
      await createTestLedgerEntry(
        tenantId,
        employeeId,
        leaveType2._id as mongoose.Types.ObjectId,
        { amount: 10 }
      );

      const repo = new BalanceRepository();
      const balances = await repo.getBalances(tenantId, employeeId);

      expect(balances).toHaveLength(2);
      const type1Balance = balances.find(
        (b) => b.leaveTypeId.toString() === leaveType1._id.toString()
      );
      const type2Balance = balances.find(
        (b) => b.leaveTypeId.toString() === leaveType2._id.toString()
      );
      expect(type1Balance?.balance).toBe(20);
      expect(type2Balance?.balance).toBe(10);
    });

    it("returns empty array when no entries exist", async () => {
      const tenant = await createTestTenant();
      const employee = await createTestEmployee(String(tenant._id));

      const repo = new BalanceRepository();
      const balances = await repo.getBalances(
        String(tenant._id),
        employee._id as mongoose.Types.ObjectId
      );

      expect(balances).toEqual([]);
    });
  });

  describe("getHistory", () => {
    it("returns paginated ledger entries sorted by effectiveDate descending", async () => {
      const tenant = await createTestTenant();
      const employee = await createTestEmployee(String(tenant._id));
      const leaveType = await createTestLeaveType(String(tenant._id));

      const tenantId = String(tenant._id);
      const employeeId = employee._id as mongoose.Types.ObjectId;
      const leaveTypeId = leaveType._id as mongoose.Types.ObjectId;

      for (let i = 0; i < 5; i++) {
        await createTestLedgerEntry(tenantId, employeeId, leaveTypeId, {
          amount: i + 1,
          effectiveDate: new Date(`2025-01-0${i + 1}`),
        });
      }

      const repo = new BalanceRepository();
      const result = await repo.getHistory(tenantId, employeeId, leaveTypeId, {
        page: 1,
        limit: 3,
      });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(3);
      // Most recent first
      expect(result.items[0]!.effectiveDate.getTime()).toBeGreaterThan(
        result.items[1]!.effectiveDate.getTime()
      );
    });

    it("returns second page correctly", async () => {
      const tenant = await createTestTenant();
      const employee = await createTestEmployee(String(tenant._id));
      const leaveType = await createTestLeaveType(String(tenant._id));

      const tenantId = String(tenant._id);
      const employeeId = employee._id as mongoose.Types.ObjectId;
      const leaveTypeId = leaveType._id as mongoose.Types.ObjectId;

      for (let i = 0; i < 5; i++) {
        await createTestLedgerEntry(tenantId, employeeId, leaveTypeId, {
          amount: i + 1,
        });
      }

      const repo = new BalanceRepository();
      const result = await repo.getHistory(tenantId, employeeId, leaveTypeId, {
        page: 2,
        limit: 3,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.page).toBe(2);
    });
  });

  describe("getTeamBalances", () => {
    it("returns average balance per leave type for all employees in team", async () => {
      const tenant = await createTestTenant();
      const team = await createTestTeam(String(tenant._id));
      const employee1 = await createTestEmployee(String(tenant._id), {
        teamId: team._id as mongoose.Types.ObjectId,
      });
      const employee2 = await createTestEmployee(String(tenant._id), {
        teamId: team._id as mongoose.Types.ObjectId,
      });
      const leaveType = await createTestLeaveType(String(tenant._id));

      const tenantId = String(tenant._id);
      const leaveTypeId = leaveType._id as mongoose.Types.ObjectId;

      // employee1 has 20, employee2 has 10 => average 15
      await createTestLedgerEntry(
        tenantId,
        employee1._id as mongoose.Types.ObjectId,
        leaveTypeId,
        { amount: 20 }
      );
      await createTestLedgerEntry(
        tenantId,
        employee2._id as mongoose.Types.ObjectId,
        leaveTypeId,
        { amount: 10 }
      );

      const repo = new BalanceRepository();
      const result = await repo.getTeamBalances(
        tenantId,
        team._id as mongoose.Types.ObjectId
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.averageBalance).toBe(15);
      expect(result[0]!.employeeCount).toBe(2);
    });
  });
});

// ----------------------------------------------------------------
// Service unit tests (mocked repository)
// ----------------------------------------------------------------

describe("BalanceService", () => {
  const mockRepo = {
    insert: vi.fn(),
    getBalance: vi.fn(),
    getBalances: vi.fn(),
    getHistory: vi.fn(),
    getTeamBalances: vi.fn(),
  };

  const mockAuditService = {
    log: vi.fn(),
  };

  const tenantId = "tenant-abc";
  const employeeId = new mongoose.Types.ObjectId();
  const leaveTypeId = new mongoose.Types.ObjectId();
  const fiscalYear = 2025;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.insert.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
    mockRepo.getBalance.mockResolvedValue(0);
    mockRepo.getBalances.mockResolvedValue([]);
  });

  function makeService(): BalanceService {
    return new BalanceService(
      mockRepo as unknown as BalanceRepository,
      mockAuditService as unknown as IAuditService
    );
  }

  describe("allocateInitial", () => {
    it("inserts an initial_allocation entry with positive amount", async () => {
      const service = makeService();
      await service.allocateInitial(tenantId, employeeId, leaveTypeId, 20, {
        amount: 20,
        fiscalYear,
      });

      expect(mockRepo.insert).toHaveBeenCalledOnce();
      const insertCall = mockRepo.insert.mock.calls[0]![0];
      expect(insertCall.entryType).toBe("initial_allocation");
      expect(insertCall.amount).toBe(20);
      expect(insertCall.tenantId).toBe(tenantId);
    });

    it("throws if amount is not positive", async () => {
      const service = makeService();
      await expect(
        service.allocateInitial(tenantId, employeeId, leaveTypeId, 0, {
          amount: 0,
          fiscalYear,
        })
      ).rejects.toThrow("amount must be positive");
    });
  });

  describe("deduct", () => {
    it("inserts a deduction entry with negative amount", async () => {
      const leaveRequestId = new mongoose.Types.ObjectId();
      const service = makeService();
      await service.deduct(tenantId, employeeId, leaveTypeId, 5, leaveRequestId, {
        amount: 5,
        leaveRequestId,
        fiscalYear,
      });

      expect(mockRepo.insert).toHaveBeenCalledOnce();
      const insertCall = mockRepo.insert.mock.calls[0]![0];
      expect(insertCall.entryType).toBe("deduction");
      expect(insertCall.amount).toBe(-5);
    });

    it("throws if amount is not positive", async () => {
      const leaveRequestId = new mongoose.Types.ObjectId();
      const service = makeService();
      await expect(
        service.deduct(tenantId, employeeId, leaveTypeId, 0, leaveRequestId, {
          amount: 0,
          leaveRequestId,
          fiscalYear,
        })
      ).rejects.toThrow("amount must be positive");
    });
  });

  describe("restore", () => {
    it("inserts a restoration entry with positive amount", async () => {
      const leaveRequestId = new mongoose.Types.ObjectId();
      const service = makeService();
      await service.restore(tenantId, employeeId, leaveTypeId, 5, leaveRequestId, {
        amount: 5,
        leaveRequestId,
        fiscalYear,
      });

      expect(mockRepo.insert).toHaveBeenCalledOnce();
      const insertCall = mockRepo.insert.mock.calls[0]![0];
      expect(insertCall.entryType).toBe("restoration");
      expect(insertCall.amount).toBe(5);
    });
  });

  describe("accrue", () => {
    it("inserts an accrual entry with positive amount", async () => {
      const service = makeService();
      await service.accrue(tenantId, employeeId, leaveTypeId, 1.5, {
        amount: 1.5,
        fiscalYear,
      });

      const insertCall = mockRepo.insert.mock.calls[0]![0];
      expect(insertCall.entryType).toBe("accrual");
      expect(insertCall.amount).toBe(1.5);
    });
  });

  describe("adjustManual", () => {
    it("inserts a manual_adjustment entry with the signed amount", async () => {
      const actorId = new mongoose.Types.ObjectId();
      const service = makeService();
      await service.adjustManual(tenantId, employeeId, leaveTypeId, -3, "Correction", actorId, {
        amount: -3,
        reason: "Correction",
        actorId,
        fiscalYear,
      });

      const insertCall = mockRepo.insert.mock.calls[0]![0];
      expect(insertCall.entryType).toBe("manual_adjustment");
      expect(insertCall.amount).toBe(-3);
      expect(insertCall.actorId).toEqual(actorId);
    });

    it("throws if reason is empty", async () => {
      const actorId = new mongoose.Types.ObjectId();
      const service = makeService();
      await expect(
        service.adjustManual(tenantId, employeeId, leaveTypeId, 5, "", actorId, {
          amount: 5,
          reason: "",
          actorId,
          fiscalYear,
        })
      ).rejects.toThrow("reason is required");
    });
  });

  describe("checkSufficientBalance", () => {
    it("returns true when balance >= required amount", async () => {
      mockRepo.getBalance.mockResolvedValue(10);
      const service = makeService();
      const result = await service.checkSufficientBalance(
        tenantId,
        employeeId,
        leaveTypeId,
        5
      );
      expect(result).toBe(true);
    });

    it("returns false when balance < required amount", async () => {
      mockRepo.getBalance.mockResolvedValue(3);
      const service = makeService();
      const result = await service.checkSufficientBalance(
        tenantId,
        employeeId,
        leaveTypeId,
        5
      );
      expect(result).toBe(false);
    });

    it("returns true when balance exactly equals required amount", async () => {
      mockRepo.getBalance.mockResolvedValue(5);
      const service = makeService();
      const result = await service.checkSufficientBalance(
        tenantId,
        employeeId,
        leaveTypeId,
        5
      );
      expect(result).toBe(true);
    });

    it("always calls getBalance fresh (never cached)", async () => {
      mockRepo.getBalance.mockResolvedValueOnce(10).mockResolvedValueOnce(2);
      const service = makeService();

      const first = await service.checkSufficientBalance(
        tenantId,
        employeeId,
        leaveTypeId,
        5
      );
      const second = await service.checkSufficientBalance(
        tenantId,
        employeeId,
        leaveTypeId,
        5
      );

      expect(first).toBe(true);
      expect(second).toBe(false);
      expect(mockRepo.getBalance).toHaveBeenCalledTimes(2);
    });
  });

  describe("getEmployeeBalances", () => {
    it("delegates to repository getBalances", async () => {
      const mockBalances = [{ leaveTypeId, balance: 15 }];
      mockRepo.getBalances.mockResolvedValue(mockBalances);
      const service = makeService();

      const result = await service.getEmployeeBalances(tenantId, employeeId);

      expect(mockRepo.getBalances).toHaveBeenCalledWith(tenantId, employeeId);
      expect(result).toEqual(mockBalances);
    });
  });

  describe("concurrent deduction safety", () => {
    it("reads fresh balance on every checkSufficientBalance call", async () => {
      // Simulate race: first check sees 10, concurrent deduction reduces to 2,
      // second check correctly sees 2 (no caching).
      mockRepo.getBalance
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2);

      const service = makeService();

      const check1 = await service.checkSufficientBalance(
        tenantId,
        employeeId,
        leaveTypeId,
        5
      );
      // Simulate concurrent deduction happened here
      const check2 = await service.checkSufficientBalance(
        tenantId,
        employeeId,
        leaveTypeId,
        5
      );

      expect(check1).toBe(true);
      expect(check2).toBe(false);
    });
  });
});
