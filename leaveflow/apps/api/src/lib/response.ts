/**
 * Response helper functions.
 *
 * Every route handler should use these helpers to ensure ALL responses use
 * the standard envelope:
 *   { success: boolean, data: T | null, error: {...} | null, meta?: {...} | null }
 */

import type { FastifyReply } from "fastify";

// ----------------------------------------------------------------
// Envelope types
// ----------------------------------------------------------------

export interface PaginationMeta {
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPrevPage: boolean;
}

interface SuccessEnvelope<T> {
  readonly success: true;
  readonly data: T;
  readonly error: null;
  readonly meta: PaginationMeta | null;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/**
 * 200 OK — generic success with optional meta.
 */
export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  meta: PaginationMeta | null = null
): ReturnType<FastifyReply["send"]> {
  const envelope: SuccessEnvelope<T> = Object.freeze({
    success: true as const,
    data,
    error: null,
    meta,
  });
  return reply.code(200).send(envelope);
}

/**
 * 201 Created.
 */
export function sendCreated<T>(
  reply: FastifyReply,
  data: T
): ReturnType<FastifyReply["send"]> {
  const envelope: SuccessEnvelope<T> = Object.freeze({
    success: true as const,
    data,
    error: null,
    meta: null,
  });
  return reply.code(201).send(envelope);
}

/**
 * 204 No Content — sends an empty body.
 */
export function sendNoContent(
  reply: FastifyReply
): ReturnType<FastifyReply["send"]> {
  return reply.code(204).send();
}

/**
 * 200 OK — paginated list response.
 * Constructs the meta block from the provided pagination parameters.
 */
export function sendPaginated<T>(
  reply: FastifyReply,
  data: T[],
  pagination: { total: number; page: number; limit: number }
): ReturnType<FastifyReply["send"]> {
  const { total, page, limit } = pagination;
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

  const meta: PaginationMeta = Object.freeze({
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  });

  const envelope: SuccessEnvelope<T[]> = Object.freeze({
    success: true as const,
    data,
    error: null,
    meta,
  });

  return reply.code(200).send(envelope);
}
