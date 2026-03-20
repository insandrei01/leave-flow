/**
 * Holiday request/response schemas — Zod validation.
 */

import { z } from "zod";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

// ----------------------------------------------------------------
// Query schemas
// ----------------------------------------------------------------

export const HolidaysQuerySchema = z.object({
  year: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(2000).max(2100)),
  countryCode: z
    .string()
    .regex(COUNTRY_CODE_REGEX, "countryCode must be a 2-letter ISO code (uppercase)")
    .optional(),
});

export type HolidaysQuery = z.infer<typeof HolidaysQuerySchema>;

// ----------------------------------------------------------------
// Body schemas
// ----------------------------------------------------------------

export const AddCustomHolidayBodySchema = z.object({
  date: z
    .string()
    .regex(ISO_DATE_REGEX, "date must be YYYY-MM-DD"),
  name: z
    .string()
    .min(1, "name is required")
    .max(100, "name cannot exceed 100 characters"),
  year: z
    .number()
    .int()
    .min(2000)
    .max(2100),
  countryCode: z
    .string()
    .regex(COUNTRY_CODE_REGEX, "countryCode must be a 2-letter ISO code (uppercase)")
    .optional(),
});

export type AddCustomHolidayBody = z.infer<typeof AddCustomHolidayBodySchema>;

export const DeleteCustomHolidayParamsSchema = z.object({
  date: z
    .string()
    .regex(ISO_DATE_REGEX, "date must be YYYY-MM-DD"),
});

export type DeleteCustomHolidayParams = z.infer<typeof DeleteCustomHolidayParamsSchema>;
