/**
 * Team entity types — organizational units within a tenant.
 */

export interface Team {
  readonly _id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly managerId: string | null;
  readonly workflowId: string | null;
  readonly announcementChannelSlack: string | null;
  readonly announcementChannelTeams: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}
