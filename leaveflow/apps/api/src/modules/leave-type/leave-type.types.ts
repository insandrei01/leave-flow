/**
 * Service-level types for the leave-type module.
 */

export interface CreateLeaveTypeInput {
  name: string;
  color?: string;
  icon?: string;
  isPaid?: boolean;
  requiresApproval?: boolean;
  defaultEntitlementDays: number;
  allowNegativeBalance?: boolean;
  isUnlimited?: boolean;
  isRetroactiveAllowed?: boolean;
  sortOrder?: number;
  isDefault?: boolean;
}

export interface UpdateLeaveTypeInput {
  name?: string;
  color?: string;
  icon?: string;
  isPaid?: boolean;
  requiresApproval?: boolean;
  defaultEntitlementDays?: number;
  allowNegativeBalance?: boolean;
  isUnlimited?: boolean;
  isRetroactiveAllowed?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export interface LeaveTypeRecord {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  isPaid: boolean;
  requiresApproval: boolean;
  defaultEntitlementDays: number;
  allowNegativeBalance: boolean;
  isUnlimited: boolean;
  isRetroactiveAllowed: boolean;
  isActive: boolean;
  sortOrder: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
