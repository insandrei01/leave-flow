/**
 * Billing routes.
 *
 * GET  /billing                          — current plan + usage
 * POST /billing/create-checkout-session  — initiate Stripe checkout (company_admin)
 * POST /billing/create-portal-session    — open Stripe customer portal (company_admin)
 * POST /billing/webhooks                 — Stripe webhook receiver (public)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { BillingService } from "./billing.service.js";
import type { AppConfig } from "../../lib/config.js";
import {
  createCheckoutSessionBodySchema,
  createPortalSessionBodySchema,
  stripeWebhookHeadersSchema,
} from "./billing.schema.js";
import { sendSuccess, sendCreated } from "../../lib/response.js";
import {
  AppError,
  ForbiddenError,
  ValidationError,
} from "../../lib/errors.js";

// ----------------------------------------------------------------
// Auth helpers
// ----------------------------------------------------------------

const ADMIN_ROLES = new Set(["company_admin"]);

function assertAdmin(request: FastifyRequest): void {
  const role = request.auth?.role ?? "";
  if (!ADMIN_ROLES.has(role)) {
    throw new ForbiddenError("Only company_admin can manage billing");
  }
}

// ----------------------------------------------------------------
// Route factory
// ----------------------------------------------------------------

export function createBillingRoutes(
  service: BillingService,
  config: Pick<AppConfig, "stripe">
) {
  return async function billingRoutes(app: FastifyInstance): Promise<void> {
    // GET /billing
    app.get(
      "/billing",
      async (request: FastifyRequest, reply: FastifyReply) => {
        assertAdmin(request);
        const tenantId = request.auth!.tenantId;
        const status = await service.getBillingStatus(tenantId);
        return sendSuccess(reply, status);
      }
    );

    // POST /billing/create-checkout-session
    app.post(
      "/billing/create-checkout-session",
      async (request: FastifyRequest, reply: FastifyReply) => {
        assertAdmin(request);
        const tenantId = request.auth!.tenantId;

        const parsed = createCheckoutSessionBodySchema.safeParse(request.body);
        if (!parsed.success) {
          throw new ValidationError(
            "Invalid request body",
            parsed.error.issues
          );
        }

        const session = await service.createCheckoutSession({
          tenantId,
          plan: parsed.data.plan,
          successUrl: parsed.data.successUrl,
          cancelUrl: parsed.data.cancelUrl,
        });

        return sendCreated(reply, { url: session.url });
      }
    );

    // POST /billing/create-portal-session
    app.post(
      "/billing/create-portal-session",
      async (request: FastifyRequest, reply: FastifyReply) => {
        assertAdmin(request);
        const tenantId = request.auth!.tenantId;

        const parsed = createPortalSessionBodySchema.safeParse(request.body);
        if (!parsed.success) {
          throw new ValidationError(
            "Invalid request body",
            parsed.error.issues
          );
        }

        const session = await service.createPortalSession({
          tenantId,
          returnUrl: parsed.data.returnUrl,
        });

        return sendSuccess(reply, { url: session.url });
      }
    );

    // POST /billing/webhooks — public route, verified by Stripe signature
    app.post(
      "/billing/webhooks",
      {
        config: { public: true },
        // Raw body needed for Stripe signature verification
        // @fastify/rawbody or content-type-parser for text/plain handles this
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        const webhookSecret = config.stripe.webhookSecret;
        if (webhookSecret === undefined || webhookSecret === "") {
          return reply.code(500).send({
            success: false,
            data: null,
            error: {
              code: "CONFIGURATION_ERROR",
              message: "Stripe webhook secret is not configured",
              details: null,
            },
            meta: null,
          });
        }

        const headersParsed = stripeWebhookHeadersSchema.safeParse(
          request.headers
        );
        if (!headersParsed.success) {
          throw new ValidationError("Missing Stripe-Signature header");
        }

        const signature = headersParsed.data["stripe-signature"];
        const rawBody = (request as unknown as { rawBody?: string }).rawBody;
        if (rawBody === undefined || rawBody === "") {
          throw new AppError(
            "Webhook payload verification failed: rawBody not available",
            500,
            "WEBHOOK_RAW_BODY_MISSING"
          );
        }
        const payload = rawBody;

        await service.handleWebhook({
          payload,
          signature,
          webhookSecret,
        });

        return sendSuccess(reply, { received: true });
      }
    );
  };
}
