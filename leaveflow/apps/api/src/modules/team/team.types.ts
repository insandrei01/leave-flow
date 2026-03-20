/**
 * Service-level types for the team module.
 */

export interface CreateTeamInput {
  name: string;
  managerId?: string | null;
  workflowId?: string | null;
  announcementChannelSlack?: string | null;
  announcementChannelTeams?: string | null;
}

export interface UpdateTeamInput {
  name?: string;
  managerId?: string | null;
  workflowId?: string | null;
  announcementChannelSlack?: string | null;
  announcementChannelTeams?: string | null;
  isActive?: boolean;
}

export interface TeamRecord {
  id: string;
  tenantId: string;
  name: string;
  managerId: string | null;
  workflowId: string | null;
  announcementChannelSlack: string | null;
  announcementChannelTeams: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMemberRecord {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  teamId: string | null;
}
