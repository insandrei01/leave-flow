/**
 * Employee entity types — every user within a tenant workspace.
 */

export type EmployeeRole = 'company_admin' | 'hr_admin' | 'manager' | 'employee';

export type EmployeeStatus = 'active' | 'inactive' | 'invited';

export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export type PrimaryPlatform = 'slack' | 'teams' | 'email';

export interface Employee {
  readonly _id: string;
  readonly tenantId: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly displayName: string;
  readonly role: EmployeeRole;
  readonly teamId: string | null;
  readonly firebaseUid: string | null;
  readonly startDate: string;
  readonly primaryPlatform: PrimaryPlatform;
  readonly timezone: string;
  readonly profileImageUrl: string | null;
  readonly invitationToken: string | null;
  readonly invitationExpiresAt: string | null;
  readonly invitationStatus: InvitationStatus;
  readonly status: EmployeeStatus;
  readonly deactivatedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
