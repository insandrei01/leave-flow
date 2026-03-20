/**
 * API envelope and shared response types.
 * Every response, including errors, uses the ApiEnvelope structure.
 */

export type SortOrder = 'asc' | 'desc';

export interface ValidationErrorDetail {
  readonly field: string;
  readonly message: string;
}

export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details: readonly ValidationErrorDetail[];
}

export interface PaginationMeta {
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPrevPage: boolean;
}

export interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: ApiError | null;
  readonly meta: PaginationMeta | null;
}

export interface PaginatedResponse<T> extends ApiEnvelope<readonly T[]> {
  readonly meta: PaginationMeta;
}

export interface ErrorResponse extends ApiEnvelope<null> {
  readonly success: false;
  readonly data: null;
  readonly error: ApiError;
}
