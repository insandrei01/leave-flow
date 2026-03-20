import type { FastifyInstance, FastifyError } from "fastify";
import fp from "fastify-plugin";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details: unknown;
}

interface ApiErrorResponse {
  readonly success: false;
  readonly data: null;
  readonly error: ApiError;
}

function buildError(
  code: string,
  message: string,
  details: unknown = null
): ApiErrorResponse {
  return Object.freeze({
    success: false as const,
    data: null,
    error: Object.freeze({ code, message, details }),
  });
}

/**
 * Converts a ZodError's issues into a flat array of field-level details
 * suitable for client display.
 */
function formatZodIssues(
  error: ZodError
): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function isAuthRelatedError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes("unauthorized") ||
    msg.includes("unauthenticated") ||
    msg.includes("invalid token") ||
    msg.includes("id token") ||
    msg.includes("firebase")
  );
}

/**
 * Global error handler plugin.
 * All unhandled errors bubble up here and are normalised into the
 * standard `{ success, data, error }` envelope before sending.
 *
 * Mapping priority (first match wins):
 *   1. AppError subclasses (NotFoundError, ConflictError, ForbiddenError, etc.)
 *   2. ZodError → 422 VALIDATION_ERROR
 *   3. Fastify 400 (schema validation, malformed JSON)
 *   4. Mongoose ValidationError → 422
 *   5. Auth-related errors → 401
 *   6. Fastify statusCode pass-through (401/403/404)
 *   7. Everything else → 500
 */
async function registerErrorHandlerPlugin(app: FastifyInstance): Promise<void> {
  app.setErrorHandler(
    (error: FastifyError | Error, _request, reply): void => {
      // AppError subclasses (business errors with explicit statusCode + code)
      if (error instanceof AppError) {
        void reply
          .code(error.statusCode)
          .send(buildError(error.code, error.message, error.details));
        return;
      }

      // Zod validation error → 422 (semantic validation failure, not bad JSON)
      if (error instanceof ZodError) {
        void reply.code(422).send(
          buildError("VALIDATION_ERROR", "Request validation failed", {
            fields: formatZodIssues(error),
          })
        );
        return;
      }

      // Fastify 400 errors (schema validation, malformed JSON)
      if ("statusCode" in error && (error as FastifyError).statusCode === 400) {
        void reply.code(400).send(buildError("BAD_REQUEST", error.message));
        return;
      }

      // Mongoose validation error (duck-type check)
      if (error.name === "ValidationError" && "errors" in error) {
        void reply
          .code(422)
          .send(buildError("VALIDATION_ERROR", "Database validation failed"));
        return;
      }

      // Auth errors → 401
      if (isAuthRelatedError(error)) {
        void reply
          .code(401)
          .send(buildError("UNAUTHORIZED", "Authentication required"));
        return;
      }

      // Fastify 401/403/404 pass-through
      if ("statusCode" in error) {
        const fastifyError = error as FastifyError;
        const status = fastifyError.statusCode ?? 500;
        if (status === 401) {
          void reply
            .code(401)
            .send(buildError("UNAUTHORIZED", "Authentication required"));
          return;
        }
        if (status === 403) {
          void reply.code(403).send(buildError("FORBIDDEN", "Access denied"));
          return;
        }
        if (status === 404) {
          void reply
            .code(404)
            .send(buildError("NOT_FOUND", "Resource not found"));
          return;
        }
      }

      // Everything else → 500 (do NOT leak internal details)
      app.log.error({ err: error }, "Unhandled error");
      void reply
        .code(500)
        .send(buildError("INTERNAL_ERROR", "An unexpected error occurred"));
    }
  );
}

export const errorHandlerPlugin = fp(registerErrorHandlerPlugin, {
  name: "error-handler-plugin",
  fastify: "5.x",
});
