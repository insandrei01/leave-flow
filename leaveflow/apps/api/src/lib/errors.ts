/**
 * Custom application error classes.
 *
 * Each error carries a `statusCode` (HTTP status) and a `code` (machine-readable string)
 * so the error handler plugin can map them to correct HTTP responses without instanceof chains.
 */

// ----------------------------------------------------------------
// Base application error
// ----------------------------------------------------------------

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: unknown;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details: unknown = null
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    // Restore prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ----------------------------------------------------------------
// 400 Validation error (semantic validation — use 422 per API contract)
// ----------------------------------------------------------------

export class ValidationError extends AppError {
  constructor(message: string, details: unknown = null) {
    super(message, 422, "VALIDATION_ERROR", details);
  }
}

// ----------------------------------------------------------------
// 401 Unauthorized
// ----------------------------------------------------------------

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

// ----------------------------------------------------------------
// 403 Forbidden
// ----------------------------------------------------------------

export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403, "FORBIDDEN");
  }
}

// ----------------------------------------------------------------
// 404 Not found
// ----------------------------------------------------------------

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} not found: ${id}`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND");
  }
}

// ----------------------------------------------------------------
// 409 Conflict
// ----------------------------------------------------------------

export class ConflictError extends AppError {
  constructor(message: string, code = "CONFLICT") {
    super(message, 409, code);
  }
}
