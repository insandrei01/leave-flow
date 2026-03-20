/**
 * Onboarding module tests.
 *
 * All tests are pure unit tests using mocked dependencies.
 * No database connection required.
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from "vitest";

import {
  createOnboardingRepository,
  type OnboardingRepository,
} from "./onboarding.repository.js";
import {
  createOnboardingService,
  type OnboardingServiceDeps,
  type TenantService,
  type LeaveTypeService,
  type WorkflowService,
  type TeamService,
  type EmployeeService,
  type HolidayService,
} from "./onboarding.service.js";
import type { OnboardingProgress } from "./onboarding.types.js";

// ----------------------------------------------------------------
// Test fixtures
// ----------------------------------------------------------------

const TENANT = "tenant-onboard-1";

function makeStep1Data() {
  return {
    stepNumber: 1 as const,
    data: {
      companyName: "Acme Corp",
      country: "US",
      timezone: "America/New_York",
      workWeekDays: [1, 2, 3, 4, 5],
    },
  };
}

function makeStep2Data() {
  return {
    stepNumber: 2 as const,
    data: {
      leaveTypes: [
        {
          name: "Annual Leave",
          slug: "annual-leave",
          isPaid: true,
          requiresApproval: true,
          defaultEntitlementDays: 20,
        },
      ],
    },
  };
}

function makeStep3Data() {
  return {
    stepNumber: 3 as const,
    data: { templateId: "simple-approval", workflowName: "Standard Approval" },
  };
}

function makeStep4Data() {
  return {
    stepNumber: 4 as const,
    data: { teams: [{ name: "Engineering" }] },
  };
}

function makeStep5Data() {
  return {
    stepNumber: 5 as const,
    data: {
      importMethod: "manual" as const,
      employees: [
        { email: "alice@example.com", firstName: "Alice", lastName: "Smith" },
      ],
    },
  };
}

function makeStep6Data() {
  return {
    stepNumber: 6 as const,
    data: { countryCode: "US", year: 2026 },
  };
}

// ----------------------------------------------------------------
// Dependency mocks
// ----------------------------------------------------------------

function makeDeps(): OnboardingServiceDeps {
  return {
    repo: createOnboardingRepository(),
    tenantService: { updateSettings: vi.fn().mockResolvedValue(undefined) } as TenantService,
    leaveTypeService: { create: vi.fn().mockResolvedValue({ id: "lt-1" }) } as LeaveTypeService,
    workflowService: {
      instantiateTemplate: vi.fn().mockResolvedValue({ id: "wf-1" }),
    } as WorkflowService,
    teamService: { create: vi.fn().mockResolvedValue({ id: "team-1" }) } as TeamService,
    employeeService: {
      csvImport: vi.fn().mockResolvedValue({ imported: 0, failed: 0 }),
      createEmployee: vi.fn().mockResolvedValue({ id: "emp-1" }),
    } as EmployeeService,
    holidayService: {
      setCountryDefaults: vi.fn().mockResolvedValue(undefined),
    } as HolidayService,
  };
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("OnboardingService", () => {
  describe("initialize", () => {
    it("creates a progress record with 6 pending steps", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);

      const progress = await service.initialize(TENANT);

      expect(progress.tenantId).toBe(TENANT);
      expect(progress.isComplete).toBe(false);
      expect(progress.currentStep).toBe(1);
      expect(progress.steps).toHaveLength(6);
      expect(progress.steps.every((s) => s.status === "pending")).toBe(true);
    });

    it("is idempotent — second call returns existing progress", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);

      const first = await service.initialize(TENANT);
      const second = await service.initialize(TENANT);

      // Same data; no duplicate record created
      expect(second.createdAt).toEqual(first.createdAt);
    });
  });

  describe("getProgress", () => {
    it("returns null before initialize is called", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);

      const progress = await service.getProgress("no-tenant");
      expect(progress).toBeNull();
    });

    it("returns current progress after initialize", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);

      await service.initialize(TENANT);
      const progress = await service.getProgress(TENANT);

      expect(progress).not.toBeNull();
      expect(progress!.tenantId).toBe(TENANT);
    });
  });

  describe("saveStep", () => {
    it("completes step 1 and calls tenantService.updateSettings", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      const progress = await service.saveStep(TENANT, makeStep1Data());

      const step1 = progress.steps[0]!;
      expect(step1.status).toBe("completed");
      expect(step1.completedAt).toBeInstanceOf(Date);

      const updateSettings = deps.tenantService
        .updateSettings as MockedFunction<TenantService["updateSettings"]>;
      expect(updateSettings).toHaveBeenCalledWith(TENANT, {
        name: "Acme Corp",
        country: "US",
        timezone: "America/New_York",
        workWeekDays: [1, 2, 3, 4, 5],
      });
    });

    it("completes step 2 and calls leaveTypeService.create for each type", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      await service.saveStep(TENANT, makeStep2Data());

      const create = deps.leaveTypeService.create as MockedFunction<
        LeaveTypeService["create"]
      >;
      expect(create).toHaveBeenCalledOnce();
      expect(create.mock.calls[0]![0]).toBe(TENANT);
    });

    it("completes step 3 and calls workflowService.instantiateTemplate", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      await service.saveStep(TENANT, makeStep3Data());

      const inst = deps.workflowService
        .instantiateTemplate as MockedFunction<WorkflowService["instantiateTemplate"]>;
      expect(inst).toHaveBeenCalledWith(TENANT, "simple-approval", "Standard Approval");
    });

    it("completes step 4 and calls teamService.create", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      await service.saveStep(TENANT, makeStep4Data());

      const create = deps.teamService.create as MockedFunction<TeamService["create"]>;
      expect(create).toHaveBeenCalledWith(TENANT, { name: "Engineering", managerEmployeeId: undefined });
    });

    it("completes step 5 (manual import) and calls employeeService.createEmployee", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      await service.saveStep(TENANT, makeStep5Data());

      const createEmployee = deps.employeeService
        .createEmployee as MockedFunction<EmployeeService["createEmployee"]>;
      expect(createEmployee).toHaveBeenCalledOnce();
    });

    it("completes step 5 (csv import) and calls employeeService.csvImport", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      await service.saveStep(TENANT, {
        stepNumber: 5,
        data: { importMethod: "csv", fileKey: "uploads/employees.csv" },
      });

      const csvImport = deps.employeeService.csvImport as MockedFunction<
        EmployeeService["csvImport"]
      >;
      expect(csvImport).toHaveBeenCalledWith(TENANT, "uploads/employees.csv");
    });

    it("completes step 6 and calls holidayService.setCountryDefaults", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      await service.saveStep(TENANT, makeStep6Data());

      const setDefaults = deps.holidayService
        .setCountryDefaults as MockedFunction<HolidayService["setCountryDefaults"]>;
      expect(setDefaults).toHaveBeenCalledWith(TENANT, "US", 2026);
    });

    it("is idempotent — re-saving a completed step does not re-invoke downstream service", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      await service.saveStep(TENANT, makeStep1Data());
      await service.saveStep(TENANT, makeStep1Data()); // second save

      const updateSettings = deps.tenantService
        .updateSettings as MockedFunction<TenantService["updateSettings"]>;
      // Should only be called once despite two saveStep calls
      expect(updateSettings).toHaveBeenCalledOnce();
    });

    it("advances currentStep after saving step 1", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      const progress = await service.saveStep(TENANT, makeStep1Data());

      expect(progress.currentStep).toBe(2);
    });

    it("throws when called before initialize", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);

      await expect(service.saveStep("unknown-tenant", makeStep1Data())).rejects.toThrow(
        /not initialised/i
      );
    });

    it("stores submitted data on the step", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      const progress = await service.saveStep(TENANT, makeStep1Data());
      const step1 = progress.steps[0]!;

      expect(step1.submittedData?.["companyName"]).toBe("Acme Corp");
    });
  });

  describe("skipStep", () => {
    it("marks an optional step as skipped", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      const progress = await service.skipStep(TENANT, 4);
      const step4 = progress.steps[3]!;

      expect(step4.status).toBe("skipped");
      expect(step4.completedAt).toBeInstanceOf(Date);
    });

    it("throws when attempting to skip a required step", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      await expect(service.skipStep(TENANT, 1)).rejects.toThrow(/required/i);
      await expect(service.skipStep(TENANT, 2)).rejects.toThrow(/required/i);
      await expect(service.skipStep(TENANT, 3)).rejects.toThrow(/required/i);
    });

    it("is idempotent — skipping an already-skipped step is safe", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      await service.skipStep(TENANT, 5);
      const progress = await service.skipStep(TENANT, 5);

      const step5 = progress.steps[4]!;
      expect(step5.status).toBe("skipped");
    });
  });

  describe("complete", () => {
    it("marks onboarding as complete after all required steps are done", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      // Complete required steps
      await service.saveStep(TENANT, makeStep1Data());
      await service.saveStep(TENANT, makeStep2Data());
      await service.saveStep(TENANT, makeStep3Data());
      // Skip optional steps
      await service.skipStep(TENANT, 4);
      await service.skipStep(TENANT, 5);
      await service.skipStep(TENANT, 6);

      const progress = await service.complete(TENANT);
      expect(progress.isComplete).toBe(true);
    });

    it("throws when required steps are not completed", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      await service.saveStep(TENANT, makeStep1Data()); // only step 1

      await expect(service.complete(TENANT)).rejects.toThrow(/required steps not done/i);
    });

    it("allows completion with optional steps still pending", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      await service.saveStep(TENANT, makeStep1Data());
      await service.saveStep(TENANT, makeStep2Data());
      await service.saveStep(TENANT, makeStep3Data());
      // Steps 4, 5, 6 remain pending

      const progress = await service.complete(TENANT);
      expect(progress.isComplete).toBe(true);
    });
  });

  describe("canSkipStep", () => {
    it("returns true for optional steps 4, 5, 6", () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);

      expect(service.canSkipStep(4)).toBe(true);
      expect(service.canSkipStep(5)).toBe(true);
      expect(service.canSkipStep(6)).toBe(true);
    });

    it("returns false for required steps 1, 2, 3", () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);

      expect(service.canSkipStep(1)).toBe(false);
      expect(service.canSkipStep(2)).toBe(false);
      expect(service.canSkipStep(3)).toBe(false);
    });
  });

  describe("resume from step 3", () => {
    it("can resume from step 3 after completing steps 1 and 2", async () => {
      const deps = makeDeps();
      const service = createOnboardingService(deps);
      await service.initialize(TENANT);

      await service.saveStep(TENANT, makeStep1Data());
      await service.saveStep(TENANT, makeStep2Data());

      // Simulate app restart — create a new service with same repo
      const service2 = createOnboardingService({ ...deps });

      const progress = await service2.getProgress(TENANT);
      expect(progress!.currentStep).toBe(3);
      expect(progress!.steps[0]!.status).toBe("completed");
      expect(progress!.steps[1]!.status).toBe("completed");
      expect(progress!.steps[2]!.status).toBe("pending");
    });
  });
});
