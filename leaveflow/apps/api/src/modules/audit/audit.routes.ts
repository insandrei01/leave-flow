/**
 * Audit log routes — read-only API for the immutable audit trail.
 *
 * GET /audit/logs       — paginated, filtered audit log (hr_admin+)
 * GET /audit/logs/export — CSV download stream (company_admin only)
 *
 * No write endpoints — audit entries are created internally by services.
 */

import type { FastifyInstance, FastifyReply } from "fastify";
import { createAuditRepository } from "./audit.repository.js";
import { createAuditService } from "./audit.service.js";
import { AuditLogsQuerySchema, AuditExportQuerySchema } from "./audit.schema.js";
import { sendPaginated } from "../../lib/response.js";
import { ForbiddenError, ValidationError } from "../../lib/errors.js";
import type { AuditEntityType } from "./audit.types.js";

const AUDIT_ROLES = new Set(["hr_admin", "company_admin"]);
const EXPORT_ROLES = new Set(["company_admin"]);

// CSV column headers
const CSV_HEADERS = [
  "logId",
  "timestamp",
  "action",
  "entityType",
  "entityId",
  "actorId",
  "actorType",
  "actorDisplayName",
] as const;

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  const repo = createAuditRepository();
  const service = createAuditService({ repo });

  /**
   * GET /audit/logs
   * Paginated, filtered audit log.
   * Auth: hr_admin, company_admin
   */
  app.get("/audit/logs", async (request, reply) => {
    const role = request.auth?.role ?? "";
    if (!AUDIT_ROLES.has(role)) {
      throw new ForbiddenError("Only hr_admin or company_admin can access audit logs");
    }

    const parsed = AuditLogsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters", parsed.error.issues);
    }

    const q = parsed.data;
    const tenantId = request.tenantId ?? "";

    const filters = {
      entityType: q.entityType as AuditEntityType | undefined,
      entityId: q.entityId,
      actorId: q.actorId,
      action: Array.isArray(q.action) ? q.action[0] : q.action,
      dateFrom: q.startDate !== undefined ? new Date(q.startDate) : undefined,
      dateTo: q.endDate !== undefined ? new Date(q.endDate) : undefined,
    } as const;

    const result = await service.getAuditLog(
      tenantId,
      filters as Parameters<typeof service.getAuditLog>[1],
      { page: q.page, limit: q.limit }
    );

    const serialized = result.items.map((entry) => ({
      logId: String(entry._id),
      action: entry.action,
      entityType: entry.entityType,
      entityId: String(entry.entityId),
      actorId: String(entry.actorId),
      actorType: entry.actorType,
      actorDisplayName: entry.actorDisplayName,
      actorRole: (entry.metadata as Record<string, unknown> | null)?.["actorRole"] ?? null,
      changes: entry.changes,
      metadata: entry.metadata,
      timestamp: entry.timestamp.toISOString(),
    }));

    return sendPaginated(reply, serialized, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  });

  /**
   * GET /audit/logs/export
   * CSV streaming export — company_admin only.
   */
  app.get("/audit/logs/export", async (request, reply) => {
    const role = request.auth?.role ?? "";
    if (!EXPORT_ROLES.has(role)) {
      throw new ForbiddenError("Only company_admin can export audit logs");
    }

    const parsed = AuditExportQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters", parsed.error.issues);
    }

    const q = parsed.data;
    const tenantId = request.tenantId ?? "";

    const filters = {
      entityType: q.entityType as AuditEntityType | undefined,
      entityId: q.entityId,
      actorId: q.actorId,
      action: Array.isArray(q.action) ? q.action[0] : q.action,
      dateFrom: q.startDate !== undefined ? new Date(q.startDate) : undefined,
      dateTo: q.endDate !== undefined ? new Date(q.endDate) : undefined,
    } as const;

    // Stream the CSV response
    await streamCsvExport(
      reply,
      tenantId,
      filters as Parameters<typeof service.getAuditLog>[1],
      service
    );
  });
}

// ----------------------------------------------------------------
// CSV streaming helper
// ----------------------------------------------------------------

type CsvFilters = Parameters<ReturnType<typeof createAuditService>["getAuditLog"]>[1];

async function streamCsvExport(
  reply: FastifyReply,
  tenantId: string,
  filters: CsvFilters,
  service: ReturnType<typeof createAuditService>
): Promise<void> {
  reply.raw.setHeader("Content-Type", "text/csv");
  reply.raw.setHeader(
    "Content-Disposition",
    `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`
  );

  // Write CSV header
  reply.raw.write(CSV_HEADERS.join(",") + "\n");

  const PAGE_SIZE = 200;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await service.getAuditLog(tenantId, filters, {
      page,
      limit: PAGE_SIZE,
    });

    for (const entry of result.items) {
      const row = [
        csvEscape(String(entry._id)),
        csvEscape(entry.timestamp.toISOString()),
        csvEscape(entry.action),
        csvEscape(entry.entityType),
        csvEscape(String(entry.entityId)),
        csvEscape(String(entry.actorId)),
        csvEscape(entry.actorType),
        csvEscape(entry.actorDisplayName),
      ];
      reply.raw.write(row.join(",") + "\n");
    }

    hasMore = page * PAGE_SIZE < result.total;
    page++;
  }

  reply.raw.end();
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
