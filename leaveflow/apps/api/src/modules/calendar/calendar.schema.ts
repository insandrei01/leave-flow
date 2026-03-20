/**
 * Calendar request/response schemas — Zod validation.
 */

import { z } from "zod";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ----------------------------------------------------------------
// Query schemas
// ----------------------------------------------------------------

export const CalendarAbsencesQuerySchema = z.object({
  startDate: z
    .string()
    .regex(ISO_DATE_REGEX, "startDate must be YYYY-MM-DD"),
  endDate: z
    .string()
    .regex(ISO_DATE_REGEX, "endDate must be YYYY-MM-DD"),
  teamId: z.string().optional(),
  includeLeaveType: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  status: z
    .union([z.string(), z.array(z.string())])
    .optional(),
});

export type CalendarAbsencesQuery = z.infer<typeof CalendarAbsencesQuerySchema>;

export const CalendarCoverageQuerySchema = z.object({
  startDate: z
    .string()
    .regex(ISO_DATE_REGEX, "startDate must be YYYY-MM-DD"),
  endDate: z
    .string()
    .regex(ISO_DATE_REGEX, "endDate must be YYYY-MM-DD"),
  teamId: z.string().optional(),
});

export type CalendarCoverageQuery = z.infer<typeof CalendarCoverageQuerySchema>;

// ----------------------------------------------------------------
// Validation helpers
// ----------------------------------------------------------------

/**
 * Validates that startDate <= endDate and range <= 31 days.
 */
export function validateDateRange(
  startDate: Date,
  endDate: Date
): { valid: true } | { valid: false; message: string } {
  if (startDate > endDate) {
    return { valid: false, message: "startDate must be before or equal to endDate" };
  }

  const diffDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays > 31) {
    return { valid: false, message: "Date range cannot exceed 31 days" };
  }

  return { valid: true };
}
