/**
 * Onboarding routes.
 *
 * All endpoints are restricted to company_admin role.
 *
 * GET  /onboarding/progress          — current onboarding state
 * PUT  /onboarding/steps/:stepNumber — save step data (1-6), idempotent
 * POST /onboarding/complete          — mark onboarding complete
 */

import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { ForbiddenError, NotFoundError, ValidationError } from "../../lib/errors.js";
import { sendSuccess, sendCreated } from "../../lib/response.js";
import type { OnboardingService } from "./onboarding.service.js";
import {
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
  onboardingStep5Schema,
  onboardingStep6Schema,
  stepParamsSchema,
} from "./onboarding.schema.js";
import type { StepData } from "./onboarding.types.js";

// ----------------------------------------------------------------
// Role guard helper
// ----------------------------------------------------------------

function requireCompanyAdmin(request: FastifyRequest): void {
  if (request.auth?.role !== "company_admin") {
    throw new ForbiddenError("Only company administrators can access onboarding");
  }
}

// ----------------------------------------------------------------
// Step body parsers
// ----------------------------------------------------------------

function parseStepBody(stepNumber: number, rawBody: unknown): StepData {
  switch (stepNumber) {
    case 1: {
      const data = onboardingStep1Schema.parse(rawBody);
      const workWeekDays = Object.entries(data.workWeek)
        .filter(([, enabled]) => enabled)
        .map(([day]) => {
          const dayMap: Record<string, number> = {
            sunday: 0,
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5,
            saturday: 6,
          };
          return dayMap[day] ?? 0;
        });
      return {
        stepNumber: 1,
        data: {
          companyName: data.country, // companyName comes from tenant name set at register
          country: data.country,
          timezone: data.timezone,
          workWeekDays,
        },
      };
    }
    case 2: {
      const data = onboardingStep2Schema.parse(rawBody);
      return {
        stepNumber: 2,
        data: {
          leaveTypes: data.leaveTypes.map((lt) => ({
            name: lt.name,
            slug: lt.name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
            isPaid: lt.isPaid,
            requiresApproval: lt.requiresApproval,
            defaultEntitlementDays: lt.defaultEntitlementDays,
          })),
        },
      };
    }
    case 3: {
      const data = onboardingStep3Schema.parse(rawBody);
      return {
        stepNumber: 3,
        data: {
          templateId: data.templateId ?? "",
          workflowName: data.workflowName,
        },
      };
    }
    case 4: {
      const data = onboardingStep4Schema.parse(rawBody);
      return {
        stepNumber: 4,
        data: {
          teams: data.teams.map((t) => ({ name: t.name })),
        },
      };
    }
    case 5: {
      const data = onboardingStep5Schema.parse(rawBody);
      return {
        stepNumber: 5,
        data: {
          importMethod: "manual" as const,
          employees: data.employees.map((e) => {
            const parts = e.name.split(/\s+/);
            return {
              email: e.email,
              firstName: parts[0] ?? e.name,
              lastName: parts.slice(1).join(" ") || "-",
              role: e.role,
            };
          }),
        },
      };
    }
    case 6: {
      const data = onboardingStep6Schema.parse(rawBody);
      return {
        stepNumber: 6,
        data: { countryCode: data.countryCode, year: data.year },
      };
    }
    default:
      throw new ValidationError(`Invalid step number: ${stepNumber}`);
  }
}

// ----------------------------------------------------------------
// Handlers
// ----------------------------------------------------------------

function makeProgressHandler(onboardingService: OnboardingService) {
  return async function progressHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    requireCompanyAdmin(request);
    const tenantId = request.auth!.tenantId;
    const progress = await onboardingService.getProgress(tenantId);
    if (progress === null) {
      throw new NotFoundError("Onboarding progress");
    }
    sendSuccess(reply, progress);
  };
}

function makeSaveStepHandler(onboardingService: OnboardingService) {
  return async function saveStepHandler(
    request: FastifyRequest<{ Params: { stepNumber: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    requireCompanyAdmin(request);
    const tenantId = request.auth!.tenantId;
    const { stepNumber } = stepParamsSchema.parse(request.params);
    const stepData = parseStepBody(stepNumber, request.body);
    const progress = await onboardingService.saveStep(tenantId, stepData);
    sendSuccess(reply, progress);
  };
}

function makeCompleteHandler(onboardingService: OnboardingService) {
  return async function completeHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    requireCompanyAdmin(request);
    const tenantId = request.auth!.tenantId;
    const progress = await onboardingService.complete(tenantId);
    sendCreated(reply, progress);
  };
}

// ----------------------------------------------------------------
// Route plugin
// ----------------------------------------------------------------

export async function onboardingRoutes(
  fastify: FastifyInstance,
  opts: { onboardingService: OnboardingService }
): Promise<void> {
  const { onboardingService } = opts;

  fastify.get(
    "/onboarding/progress",
    {},
    makeProgressHandler(onboardingService)
  );

  fastify.put(
    "/onboarding/steps/:stepNumber",
    {},
    makeSaveStepHandler(onboardingService)
  );

  fastify.post(
    "/onboarding/complete",
    {},
    makeCompleteHandler(onboardingService)
  );
}
