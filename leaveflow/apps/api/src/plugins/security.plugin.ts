/**
 * Security plugin — HTTP security hardening.
 *
 * Registers:
 * - @fastify/helmet   — sets secure HTTP response headers
 * - Request size limits — rejects bodies over the configured maximum
 * - Input sanitization hook — strips null bytes from string body fields
 *
 * CSRF is handled at the frontend (SameSite cookie + Authorization header).
 * API endpoints use JWT Bearer tokens, so CSRF tokens are not required.
 */

import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

/** Default maximum request body size: 1 MB */
const DEFAULT_MAX_BODY_BYTES = 1 * 1024 * 1024;

/** Maximum request body size for CSV import: 10 MB */
const CSV_IMPORT_MAX_BODY_BYTES = 10 * 1024 * 1024;

const CSV_IMPORT_PATH = "/employees/import";

// ----------------------------------------------------------------
// Plugin options
// ----------------------------------------------------------------

export interface SecurityPluginOptions {
  /** Maximum body size in bytes for regular requests. Defaults to 1 MB. */
  maxBodyBytes?: number;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/**
 * Strips null bytes from all string values in a plain object.
 * Returns a new object — never mutates the input.
 */
function sanitizeStringFields(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = value.replace(/\0/g, "");
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "object" && item !== null && !Array.isArray(item)
          ? sanitizeStringFields(item as Record<string, unknown>)
          : typeof item === "string"
            ? item.replace(/\0/g, "")
            : item
      );
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      sanitized[key] = sanitizeStringFields(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ----------------------------------------------------------------
// Plugin
// ----------------------------------------------------------------

async function registerSecurityPlugin(
  app: FastifyInstance,
  opts: SecurityPluginOptions
): Promise<void> {
  const maxBodyBytes = opts.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;

  // ----------------------------------------------------------------
  // Helmet — secure HTTP headers
  // ----------------------------------------------------------------

  // Dynamically import @fastify/helmet to keep it optional.
  // If not installed, skip silently (development / test environments).
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const helmet = await import("@fastify/helmet" as any);
    const helmetPlugin = (helmet as { default?: unknown }).default ?? helmet;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await app.register(helmetPlugin as any, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    });
  } catch {
    app.log.warn(
      "[security] @fastify/helmet not available — skipping helmet registration"
    );
  }

  // ----------------------------------------------------------------
  // Request size enforcement
  // ----------------------------------------------------------------

  app.addHook(
    "preValidation",
    async (request: FastifyRequest): Promise<void> => {
      const contentLength = request.headers["content-length"];
      if (contentLength === undefined) return;

      const bodySize = parseInt(contentLength, 10);
      if (isNaN(bodySize)) return;

      // CSV import gets a larger limit
      const limit = request.url.startsWith(CSV_IMPORT_PATH)
        ? CSV_IMPORT_MAX_BODY_BYTES
        : maxBodyBytes;

      if (bodySize > limit) {
        const limitMb = (limit / (1024 * 1024)).toFixed(1);
        throw Object.assign(new Error(`Request body too large. Maximum is ${limitMb} MB.`), {
          statusCode: 413,
          code: "PAYLOAD_TOO_LARGE",
        });
      }
    }
  );

  // ----------------------------------------------------------------
  // Input sanitization — strip null bytes
  // ----------------------------------------------------------------

  app.addHook(
    "preValidation",
    async (request: FastifyRequest): Promise<void> => {
      if (
        typeof request.body === "object" &&
        request.body !== null &&
        !Array.isArray(request.body)
      ) {
        // Replace request.body with sanitized copy (immutable pattern)
        request.body = sanitizeStringFields(
          request.body as Record<string, unknown>
        );
      }
    }
  );
}

export const securityPlugin = fp(registerSecurityPlugin, {
  name: "security-plugin",
  fastify: "5.x",
});

// Export sanitizer for testing
export { sanitizeStringFields };
