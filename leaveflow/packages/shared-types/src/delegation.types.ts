/**
 * Delegation types — approval authority delegation when a manager is OOO.
 */

export interface Delegation {
  readonly _id: string;
  readonly tenantId: string;
  readonly delegatorId: string;
  readonly delegateId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly reason: string | null;
  /** Stored for query efficiency; true if now() is between startDate and endDate. */
  readonly isActive: boolean;
  readonly revokedAt: string | null;
  readonly revokedBy: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
