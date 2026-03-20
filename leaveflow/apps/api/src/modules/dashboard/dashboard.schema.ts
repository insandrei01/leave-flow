/**
 * Dashboard request/response schemas — Zod validation.
 */

import { z } from "zod";

// ----------------------------------------------------------------
// No query parameters for the summary endpoint
// ----------------------------------------------------------------

export const DashboardSummaryQuerySchema = z.object({}).strict();

// ----------------------------------------------------------------
// Response data types (for documentation / type safety)
// ----------------------------------------------------------------

const OutTodayEmployeeSchema = z.object({
  employeeId: z.string(),
  name: z.string(),
  teamName: z.string(),
  avatarUrl: z.string().nullable(),
  returnDate: z.string(),
});

const OutTodayWidgetSchema = z.object({
  count: z.number().int().min(0),
  employees: z.array(OutTodayEmployeeSchema),
  cacheTtlSeconds: z.number().int().positive(),
});

const PendingApprovalsWidgetSchema = z.object({
  count: z.number().int().min(0),
  staleCount: z.number().int().min(0),
  oldestPendingHours: z.number().min(0),
  cacheTtlSeconds: z.number().int().positive(),
});

const UtilizationRateWidgetSchema = z.object({
  averageUtilizationPercent: z.number().min(0).max(100),
  trend: z.enum(["up", "down", "flat"]),
  trendPercent: z.number(),
  cacheTtlSeconds: z.number().int().positive(),
});

const UpcomingWeekDaySchema = z.object({
  date: z.string(),
  dayName: z.string(),
  absenceCount: z.number().int().min(0),
});

const UpcomingWeekWidgetSchema = z.object({
  days: z.array(UpcomingWeekDaySchema),
  cacheTtlSeconds: z.number().int().positive(),
});

const HeatmapDaySchema = z.object({
  date: z.string(),
  absenceCount: z.number().int().min(0),
  coverageWarning: z.boolean(),
});

const AbsenceHeatmapWidgetSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  days: z.array(HeatmapDaySchema),
  cacheTtlSeconds: z.number().int().positive(),
});

const ResolutionRateWidgetSchema = z.object({
  periodLabel: z.string(),
  approved: z.number().int().min(0),
  pending: z.number().int().min(0),
  rejected: z.number().int().min(0),
  total: z.number().int().min(0),
  approvalRatePercent: z.number().min(0).max(100),
  cacheTtlSeconds: z.number().int().positive(),
});

const ActivityFeedEventSchema = z.object({
  eventId: z.string(),
  type: z.string(),
  actorName: z.string(),
  targetName: z.string(),
  description: z.string(),
  entityId: z.string(),
  entityType: z.string(),
  timestamp: z.string(),
  relativeTime: z.string(),
});

const ActivityFeedWidgetSchema = z.object({
  events: z.array(ActivityFeedEventSchema),
  cacheTtlSeconds: z.number().int().positive(),
});

const NeedsAttentionRequestSchema = z.object({
  requestId: z.string(),
  employeeName: z.string(),
  teamName: z.string(),
  leaveTypeName: z.string(),
  startDate: z.string(),
  workingDays: z.number().int().min(0),
  pendingHours: z.number().min(0),
  isStale: z.boolean(),
  currentApproverName: z.string().nullable(),
  autoEscalateAt: z.string().nullable(),
});

const NeedsAttentionWidgetSchema = z.object({
  requests: z.array(NeedsAttentionRequestSchema),
  cacheTtlSeconds: z.number().int().positive(),
});

const TeamBalanceEntrySchema = z.object({
  leaveTypeName: z.string(),
  leaveTypeColor: z.string(),
  averageAvailableDays: z.number().min(0),
  averageTotalDays: z.number().min(0),
  averageUtilizationPercent: z.number().min(0).max(100),
});

const TeamBalanceSummarySchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  balances: z.array(TeamBalanceEntrySchema),
});

const TeamBalancesWidgetSchema = z.object({
  teams: z.array(TeamBalanceSummarySchema),
  cacheTtlSeconds: z.number().int().positive(),
});

export const DashboardSummaryResponseSchema = z.object({
  generatedAt: z.date(),
  widgets: z.object({
    outToday: OutTodayWidgetSchema,
    pendingApprovals: PendingApprovalsWidgetSchema,
    utilizationRate: UtilizationRateWidgetSchema,
    upcomingWeek: UpcomingWeekWidgetSchema,
    absenceHeatmap: AbsenceHeatmapWidgetSchema,
    resolutionRate: ResolutionRateWidgetSchema,
    activityFeed: ActivityFeedWidgetSchema,
    needsAttention: NeedsAttentionWidgetSchema,
    teamBalances: TeamBalancesWidgetSchema,
  }),
});

export type DashboardSummaryResponse = z.infer<typeof DashboardSummaryResponseSchema>;
