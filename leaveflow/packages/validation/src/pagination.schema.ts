/**
 * Pagination and date range query parameter schemas.
 * All list endpoints support page + limit cursor-less pagination.
 */

import { z } from 'zod';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Standard pagination query parameters.
 * Query params arrive as strings — coerce to numbers.
 */
export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((v) => parseInt(v, 10))
    .pipe(
      z
        .number()
        .int('Page must be an integer')
        .min(1, 'Page must be 1 or greater'),
    ),

  limit: z
    .string()
    .optional()
    .default('20')
    .transform((v) => parseInt(v, 10))
    .pipe(
      z
        .number()
        .int('Limit must be an integer')
        .min(1, 'Limit must be at least 1')
        .max(100, 'Limit must not exceed 100'),
    ),

  sortBy: z.string().optional(),

  sortOrder: z
    .enum(['asc', 'desc'], {
      errorMap: () => ({ message: "Sort order must be 'asc' or 'desc'" }),
    })
    .optional()
    .default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * Date range query parameters for calendar/reporting endpoints.
 */
export const dateRangeQuerySchema = z
  .object({
    startDate: z
      .string({ required_error: 'Start date is required' })
      .regex(DATE_REGEX, 'Start date must be in YYYY-MM-DD format'),

    endDate: z
      .string({ required_error: 'End date is required' })
      .regex(DATE_REGEX, 'End date must be in YYYY-MM-DD format'),
  })
  .refine(
    (q) => q.startDate <= q.endDate,
    { message: 'End date must be on or after start date', path: ['endDate'] },
  );

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
