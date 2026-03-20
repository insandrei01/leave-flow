/**
 * Bot mapping types — maps platform user IDs to LeaveFlow employees.
 * Note: the primary index does NOT lead with tenantId because bot events arrive
 * with platform IDs only; tenant is resolved from this mapping.
 */

export type BotPlatform = 'slack' | 'teams';

export interface BotMapping {
  readonly _id: string;
  readonly tenantId: string;
  readonly platform: BotPlatform;
  readonly platformUserId: string;
  readonly platformTeamId: string;
  readonly employeeId: string;
  readonly conversationReference: Record<string, unknown> | null;
  readonly lastInteractionAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
