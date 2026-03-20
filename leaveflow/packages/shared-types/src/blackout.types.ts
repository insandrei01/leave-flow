/**
 * BlackoutPeriod types — date ranges when leave cannot be requested.
 * Optionally scoped to specific teams or leave types.
 */

export interface BlackoutPeriod {
  readonly _id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  /** If null, all teams are affected. */
  readonly teamIds: readonly string[] | null;
  /** If null, all leave types are blocked. */
  readonly leaveTypeIds: readonly string[] | null;
  readonly reason: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}
