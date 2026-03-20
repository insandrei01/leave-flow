/**
 * Zod schemas for billing routes.
 */

import { z } from "zod";

export const createCheckoutSessionBodySchema = z.object({
  plan: z.enum(["team", "business", "enterprise"]),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const createPortalSessionBodySchema = z.object({
  returnUrl: z.string().url(),
});

export const stripeWebhookHeadersSchema = z.object({
  "stripe-signature": z.string().min(1, "Missing Stripe-Signature header"),
});

export type CreateCheckoutSessionBody = z.infer<
  typeof createCheckoutSessionBodySchema
>;
export type CreatePortalSessionBody = z.infer<
  typeof createPortalSessionBodySchema
>;
