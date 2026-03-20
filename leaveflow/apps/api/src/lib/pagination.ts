/**
 * Pagination helpers — parse and build pagination data for list endpoints.
 *
 * parsePagination: extracts and validates page/limit/sortBy/sortOrder from query.
 * buildPaginatedResponse: constructs the standard PaginationMeta envelope.
 */

import { paginationQuerySchema } from "@leaveflow/validation";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface ParsedPagination {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: string | undefined;
  readonly sortOrder: "asc" | "desc";
}

export interface PaginationMeta {
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  readonly success: true;
  readonly data: T[];
  readonly error: null;
  readonly meta: PaginationMeta;
}

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const DEFAULT_SORT_ORDER = "desc" as const;

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/**
 * Extracts pagination params from query string with safe defaults.
 * Falls back to defaults on validation failure instead of throwing.
 */
export function parsePagination(
  query: Record<string, string | string[] | undefined>
): ParsedPagination {
  const rawPage =
    typeof query["page"] === "string" ? query["page"] : String(DEFAULT_PAGE);
  const rawLimit =
    typeof query["limit"] === "string"
      ? query["limit"]
      : String(DEFAULT_LIMIT);
  const rawSortBy =
    typeof query["sortBy"] === "string" ? query["sortBy"] : undefined;
  const rawSortOrder =
    typeof query["sortOrder"] === "string" ? query["sortOrder"] : undefined;

  const result = paginationQuerySchema.safeParse({
    page: rawPage,
    limit: rawLimit,
    sortBy: rawSortBy,
    sortOrder: rawSortOrder,
  });

  if (!result.success) {
    return {
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
      sortBy: undefined,
      sortOrder: DEFAULT_SORT_ORDER,
    };
  }

  return {
    page: result.data.page,
    limit: result.data.limit,
    sortBy: result.data.sortBy,
    sortOrder: result.data.sortOrder as "asc" | "desc",
  };
}

/**
 * Builds the standard paginated response envelope.
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  pagination: ParsedPagination
): PaginatedResponse<T> {
  const { page, limit } = pagination;
  const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };

  return Object.freeze({
    success: true as const,
    data,
    error: null,
    meta,
  });
}

/**
 * Builds a simple (non-paginated) success response envelope.
 */
export function buildSuccessResponse<T>(data: T): {
  readonly success: true;
  readonly data: T;
  readonly error: null;
  readonly meta: null;
} {
  return Object.freeze({
    success: true as const,
    data,
    error: null,
    meta: null,
  });
}
