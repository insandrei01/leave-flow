/**
 * Mongoose plugin: requireTenantIdPlugin
 *
 * Applied to all tenant-scoped collections. Throws an error if a query
 * (find, findOne, aggregate) does not include a `tenantId` filter.
 *
 * This is the innermost safety net for multi-tenancy (Layer 4 of 5).
 * It catches any accidental omission in repository code.
 *
 * Exceptions:
 * - bot_mappings: must allow queries without tenantId (bot events arrive
 *   without tenant context). That model does NOT use this plugin.
 * - holiday_calendars: tenantId can be null for system-level data, so
 *   the guard is not applied.
 */

import type { Schema } from "mongoose";

/**
 * Checks whether a Mongoose query condition object includes a `tenantId` filter.
 */
function hastenantIdFilter(conditions: Record<string, unknown>): boolean {
  return "tenantId" in conditions;
}

/**
 * Checks whether a MongoDB aggregation pipeline's first $match stage
 * includes a `tenantId` filter.
 */
function pipelineHasTenantId(
  pipeline: Array<Record<string, unknown>>
): boolean {
  if (!Array.isArray(pipeline) || pipeline.length === 0) {
    return false;
  }
  const firstStage = pipeline[0];
  if (!firstStage) return false;
  const matchStage = firstStage["$match"] as Record<string, unknown> | undefined;
  if (!matchStage) return false;
  return "tenantId" in matchStage;
}

const QUERY_GUARD_ERROR =
  "[tenantId guard] Query is missing required tenantId filter. " +
  "All queries on tenant-scoped collections must include tenantId.";

const AGGREGATE_GUARD_ERROR =
  "[tenantId guard] Aggregation pipeline is missing tenantId in first $match stage. " +
  "All aggregations on tenant-scoped collections must filter by tenantId.";

function assertFilterHasTenantId(conditions: Record<string, unknown>): void {
  if (!hastenantIdFilter(conditions)) {
    throw new Error(QUERY_GUARD_ERROR);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function requireTenantIdPlugin(schema: Schema<any>): void {
  // ----------------------------------------------------------------
  // Read hooks
  // ----------------------------------------------------------------

  schema.pre("find", function () {
    assertFilterHasTenantId(this.getFilter() as Record<string, unknown>);
  });

  schema.pre("findOne", function () {
    assertFilterHasTenantId(this.getFilter() as Record<string, unknown>);
  });

  schema.pre("aggregate", function () {
    const pipeline = this.pipeline() as unknown as Array<Record<string, unknown>>;
    if (!pipelineHasTenantId(pipeline)) {
      throw new Error(AGGREGATE_GUARD_ERROR);
    }
  });

  // ----------------------------------------------------------------
  // Write hooks — guard all update and delete operations
  // ----------------------------------------------------------------

  schema.pre("findOneAndUpdate", function () {
    assertFilterHasTenantId(this.getFilter() as Record<string, unknown>);
  });

  schema.pre("updateOne", function () {
    assertFilterHasTenantId(this.getFilter() as Record<string, unknown>);
  });

  schema.pre("updateMany", function () {
    assertFilterHasTenantId(this.getFilter() as Record<string, unknown>);
  });

  schema.pre("deleteOne", function () {
    assertFilterHasTenantId(this.getFilter() as Record<string, unknown>);
  });

  schema.pre("deleteMany", function () {
    assertFilterHasTenantId(this.getFilter() as Record<string, unknown>);
  });
}
