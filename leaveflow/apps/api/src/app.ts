import Fastify from "fastify";
import type { FastifyInstance, FastifyServerOptions } from "fastify";
import { corsPlugin } from "./plugins/cors.plugin.js";
import { errorHandlerPlugin } from "./plugins/error-handler.plugin.js";
import { authPlugin } from "./plugins/auth.plugin.js";
import { tenantPlugin } from "./plugins/tenant.plugin.js";
import { securityPlugin } from "./plugins/security.plugin.js";
import { rateLimiterPlugin } from "./plugins/rate-limiter.plugin.js";
import { requestContextPlugin } from "./middleware/request-context.js";
import { getRedisClient } from "./lib/redis.js";
import { TenantModel } from "./models/tenant.model.js";

// Infrastructure modules (self-contained fp plugins)
import { health } from "./modules/health/index.js";
import { dashboard } from "./modules/dashboard/index.js";
import { calendar } from "./modules/calendar/index.js";
import { audit } from "./modules/audit/index.js";
import { holidays } from "./modules/holiday/index.js";
import { notifications } from "./modules/notification/index.js";

// Auth module
import { authRoutes, createAuthService } from "./modules/auth/index.js";

// Tenant module
import {
  createTenantRepository,
  createTenantService,
  createTenantRoutes,
} from "./modules/tenant/index.js";

// Employee module
import {
  createEmployeeRepository,
  createEmployeeService,
  createEmployeeRoutes,
} from "./modules/employee/index.js";

// Team module
import {
  createTeamRepository,
  createTeamService,
  createTeamRoutes,
} from "./modules/team/index.js";

// Leave type module
import {
  createLeaveTypeRepository,
  createLeaveTypeService,
  createLeaveTypeRoutes,
} from "./modules/leave-type/index.js";

// Workflow module
import {
  createWorkflowRepository,
  createWorkflowService,
  createWorkflowRoutes,
} from "./modules/workflow/index.js";

// Onboarding module
import {
  onboardingRoutes,
  createOnboardingRepository,
  createOnboardingService,
} from "./modules/onboarding/index.js";

// Approval engine module
import {
  approvalRoutes,
  ApprovalEngineService,
} from "./modules/approval-engine/index.js";

// Leave request module
import {
  LeaveRequestRepository,
  LeaveRequestService,
  createLeaveRequestRoutes,
  delegationRoutes,
  createDelegationService,
} from "./modules/leave-request/index.js";

// Balance module
import {
  BalanceRepository,
  BalanceService,
  DefaultAuditService,
  createBalanceRoutes,
} from "./modules/balance/index.js";

// Billing module
import {
  createBillingService,
  createBillingRoutes,
} from "./modules/billing/index.js";

// Holiday service (needed as dep for LeaveRequestService)
import {
  createHolidayService,
  createHolidayRepository,
} from "./modules/holiday/index.js";

// Config
import { loadConfig } from "./lib/config.js";

export interface BuildAppOptions {
  /**
   * Override Fastify logger. Pass `false` to silence logs in tests,
   * or a pino logger instance for production.
   */
  logger?: FastifyServerOptions["logger"];
}

/**
 * Factory function that creates and configures the Fastify application.
 * Does NOT call `.listen()` — that is done in server.ts.
 *
 * Order of plugin registration matters:
 *   1. errorHandlerPlugin   — must be first so it catches errors from all plugins
 *   2. requestContextPlugin — generates X-Request-Id before any processing
 *   3. securityPlugin       — helmet + body size limits + input sanitization
 *   4. rateLimiterPlugin    — per-plan tiered rate limiting
 *   5. corsPlugin           — before routes
 *   6. authPlugin           — before tenantPlugin
 *   7. tenantPlugin         — after authPlugin
 *   8. Routes
 */
export async function buildApp(
  options: BuildAppOptions = {}
): Promise<FastifyInstance> {
  const logger =
    options.logger !== undefined
      ? options.logger
      : process.env["NODE_ENV"] === "test"
        ? false
        : true;

  const app = Fastify({ logger });

  // ----------------------------------------------------------------
  // Core plugins
  // ----------------------------------------------------------------

  await app.register(errorHandlerPlugin);
  await app.register(requestContextPlugin);
  await app.register(securityPlugin);
  await app.register(rateLimiterPlugin, {
    redis: getRedisClient(),
    tenantPlanModel: TenantModel,
  });
  await app.register(corsPlugin);
  await app.register(authPlugin);
  await app.register(tenantPlugin);

  // ----------------------------------------------------------------
  // Feature modules (Phase 1 — infrastructure)
  // ----------------------------------------------------------------

  await app.register(health);

  // ----------------------------------------------------------------
  // Feature modules (Phase 2 — self-contained fp plugins)
  // ----------------------------------------------------------------

  await app.register(dashboard);
  await app.register(calendar);
  await app.register(audit);
  await app.register(holidays);
  await app.register(notifications);

  // ----------------------------------------------------------------
  // Feature modules (Phase 3 — DI-wired route modules)
  // ----------------------------------------------------------------

  // ---- Repositories ----

  const tenantRepo = createTenantRepository();
  const employeeRepo = createEmployeeRepository();
  const teamRepo = createTeamRepository();
  const leaveTypeRepo = createLeaveTypeRepository();
  const workflowRepo = createWorkflowRepository();
  const onboardingRepo = createOnboardingRepository();
  const holidayRepo = createHolidayRepository();
  const leaveRequestRepo = new LeaveRequestRepository();
  const balanceRepo = new BalanceRepository();

  // ---- Leaf services (no cross-service dependencies) ----

  const tenantService = createTenantService({ repo: tenantRepo });
  const holidayService = createHolidayService({ repo: holidayRepo });
  const leaveTypeService = createLeaveTypeService({ repo: leaveTypeRepo });
  const workflowService = createWorkflowService({ repo: workflowRepo });

  const employeeService = createEmployeeService({
    repo: employeeRepo,
    // Structural adapter: TeamExistenceChecker interface
    teamChecker: {
      async teamExists(tenantId: string, teamId: string): Promise<boolean> {
        const team = await teamRepo.findById(tenantId, teamId);
        return team !== null;
      },
    },
  });

  const teamService = createTeamService({
    repo: teamRepo,
    // Structural adapter: EmployeeExistenceChecker interface
    employeeChecker: {
      async isActiveEmployee(tenantId: string, employeeId: string): Promise<boolean> {
        const emp = await employeeRepo.findById(tenantId, employeeId);
        return emp !== null && emp.status === "active";
      },
    },
    // Structural adapter: WorkflowExistenceChecker interface
    workflowChecker: {
      async workflowExists(tenantId: string, workflowId: string): Promise<boolean> {
        const wf = await workflowRepo.findById(tenantId, workflowId);
        return wf !== null;
      },
    },
  });

  // ---- Composite services ----

  const auditService = new DefaultAuditService();
  const balanceService = new BalanceService(balanceRepo, auditService);

  const approvalEngine = new ApprovalEngineService(
    leaveRequestRepo,
    balanceService,
    auditService
  );

  // LeaveRequestService.holidayService expects IHolidayService.countWorkingDays.
  // Adapt the HolidayService (which has calculateWorkingDays) to match.
  const holidayServiceAdapter = {
    async countWorkingDays(
      tenantId: string,
      startDate: Date,
      endDate: Date,
      halfDayStart = false,
      halfDayEnd = false
    ): Promise<number> {
      const tenant = await tenantRepo.findById(tenantId);
      // TenantRecord.settings does not carry country — use a sensible default.
      const workWeek = tenant?.settings?.workWeek ?? [1, 2, 3, 4, 5];
      const countryCode = "US"; // default; can be customised via tenant settings in future
      const result = await holidayService.calculateWorkingDays(
        startDate,
        endDate,
        tenantId,
        { workWeek, countryCode }
      );
      let days = result.workingDays;
      if (halfDayStart) days -= 0.5;
      if (halfDayEnd) days -= 0.5;
      return Math.max(0, days);
    },
  };

  const leaveRequestService = new LeaveRequestService(
    leaveRequestRepo,
    balanceService,
    approvalEngine,
    auditService,
    holidayServiceAdapter
  );

  const delegationService = createDelegationService();

  // Onboarding uses its own structural service interfaces (different method names).
  // Build lightweight adapters that forward to the real services.
  const onboardingService = createOnboardingService({
    repo: onboardingRepo,
    tenantService: {
      updateSettings: (tenantId, settings) =>
        tenantService.updateSettings(tenantId, settings).then(() => undefined),
    },
    leaveTypeService: {
      create: async (tenantId, input) => {
        const record = await leaveTypeService.create(tenantId, input);
        return { id: record.id };
      },
    },
    workflowService: {
      instantiateTemplate: async (tenantId, templateId, name) => {
        const record = await workflowService.createFromTemplate(
          tenantId,
          templateId as "simple" | "standard" | "enterprise",
          name
        );
        return { id: record.id };
      },
    },
    teamService: {
      create: async (tenantId, input) => {
        const record = await teamService.create(tenantId, input);
        return { id: record.id };
      },
    },
    employeeService: {
      csvImport: async (_tenantId, _fileKey) => ({ imported: 0, failed: 0 }),
      createEmployee: async (tenantId, input) => {
        const validRoles = new Set(["company_admin", "hr_admin", "manager", "employee"]);
        const resolvedRole = (
          input.role !== undefined && validRoles.has(input.role)
            ? input.role
            : "employee"
        ) as "company_admin" | "hr_admin" | "manager" | "employee";
        const record = await employeeService.create(tenantId, {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          role: resolvedRole,
          startDate: new Date(),
        });
        return { id: record.id };
      },
    },
    holidayService: {
      setCountryDefaults: async (_tenantId, _countryCode, _year) => {
        // Holiday seeding is handled by a separate seed process.
        // During onboarding we acknowledge the selection but defer seeding.
      },
    },
  });

  const authService = createAuthService({
    tenantService,
    employeeService,
    onboardingService,
    getTenantById: (id: string) => tenantRepo.findById(id),
  });

  // Billing — provide a stub Stripe adapter (real implementation uses env vars).
  const config = loadConfig();
  const stripeStub = {
    async createCustomer() { return { id: "" }; },
    async createCheckoutSession() { return { url: "" }; },
    async createPortalSession() { return { url: "" }; },
    constructWebhookEvent() {
      return { type: "", data: { object: {} } };
    },
    getPriceId() { return ""; },
  };
  const billingService = createBillingService({ tenantRepo, stripe: stripeStub });

  // ---- Route registrations ----

  await app.register(authRoutes, { authService });
  await app.register(onboardingRoutes, { onboardingService });

  await app.register(createTenantRoutes(tenantService));
  await app.register(createEmployeeRoutes(employeeService));
  await app.register(createTeamRoutes(teamService));
  await app.register(createLeaveTypeRoutes(leaveTypeService));
  await app.register(createWorkflowRoutes(workflowService));

  await app.register(createLeaveRequestRoutes(leaveRequestService));
  await app.register(delegationRoutes, { delegationService });
  await app.register(approvalRoutes, { approvalEngine, leaveRequestRepo });

  await app.register(createBalanceRoutes({ service: balanceService, repo: balanceRepo }));
  await app.register(createBillingRoutes(billingService, config));

  return app;
}
