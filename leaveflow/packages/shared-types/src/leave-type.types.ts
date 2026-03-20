/**
 * LeaveType entity types — leave type configuration per tenant.
 */

export type AccrualType = 'front_loaded' | 'monthly' | 'quarterly' | 'custom' | 'none';

export interface CustomScheduleEntry {
  readonly month: number;
  readonly day: number;
  readonly amount: number;
}

export interface AccrualRule {
  readonly type: AccrualType;
  readonly dayOfMonth: number | null;
  readonly customSchedule: readonly CustomScheduleEntry[] | null;
}

export interface CarryoverRule {
  readonly enabled: boolean;
  readonly maxDays: number | null;
  readonly expiryMonths: number | null;
}

export interface LeaveType {
  readonly _id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly slug: string;
  readonly color: string;
  readonly icon: string;
  readonly isPaid: boolean;
  readonly requiresApproval: boolean;
  readonly defaultEntitlementDays: number;
  readonly allowNegativeBalance: boolean;
  readonly accrualRule: AccrualRule;
  readonly carryoverRule: CarryoverRule;
  readonly isUnlimited: boolean;
  readonly isRetroactiveAllowed: boolean;
  readonly isActive: boolean;
  readonly sortOrder: number;
  readonly isDefault: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}
