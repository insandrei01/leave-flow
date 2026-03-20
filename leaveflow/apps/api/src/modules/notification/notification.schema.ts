/**
 * Notification request schemas — Zod validation.
 */

import { z } from "zod";

// ----------------------------------------------------------------
// Query schemas
// ----------------------------------------------------------------

export const NotificationsQuerySchema = z.object({
  read: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  page: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1))
    .optional()
    .default("1"),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default("20"),
});

export type NotificationsQuery = z.infer<typeof NotificationsQuerySchema>;

// ----------------------------------------------------------------
// Params schemas
// ----------------------------------------------------------------

export const NotificationIdParamsSchema = z.object({
  id: z.string().min(1, "Notification ID is required"),
});

export type NotificationIdParams = z.infer<typeof NotificationIdParamsSchema>;
