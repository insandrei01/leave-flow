/**
 * tenant-scope — utility for constructing tenant-scoped Mongoose filters.
 *
 * Always prepends { tenantId } to any filter object, returning a new object.
 * Never mutates the original filter.
 */

/**
 * Merges tenantId into a Mongoose filter object immutably.
 *
 * @param tenantId - The tenant identifier to scope the query to.
 * @param filter   - The existing query filter (may be empty).
 * @returns A new filter object with tenantId prepended.
 *
 * @example
 * const scoped = withTenant('abc', { isActive: true });
 * // => { tenantId: 'abc', isActive: true }
 */
export function withTenant(
  tenantId: string,
  filter: Record<string, unknown>
): Record<string, unknown> {
  return { tenantId, ...filter };
}
