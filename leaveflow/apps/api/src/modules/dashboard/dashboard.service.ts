/**
 * Dashboard service — aggregates all 9 widget payloads in one call.
 *
 * All widget queries run in parallel via Promise.all to meet the 3s load target.
 * Each widget carries a cacheTtlSeconds hint for the frontend.
 */

import mongoose from "mongoose";

// ----------------------------------------------------------------
// Model interfaces (loose coupling via duck-typing)
// ----------------------------------------------------------------

export interface LeaveRequestModelDep {
  countDocuments(query: Record<string, unknown>): Promise<number>;
  find(query: Record<string, unknown>): {
    sort: (s: Record<string, unknown>) => ReturnType<this["find"]>;
    limit: (n: number) => ReturnType<this["find"]>;
    lean: <T>() => Promise<T[]>;
  };
  aggregate<T>(pipeline: Record<string, unknown>[]): Promise<T[]>;
}

export interface EmployeeModelDep {
  countDocuments(query: Record<string, unknown>): Promise<number>;
  find(query: Record<string, unknown>): {
    select: (fields: string) => ReturnType<this["find"]>;
    lean: <T>() => Promise<T[]>;
  };
  aggregate<T>(pipeline: Record<string, unknown>[]): Promise<T[]>;
}

export interface BalanceLedgerModelDep {
  aggregate<T>(pipeline: Record<string, unknown>[]): Promise<T[]>;
}

export interface AuditLogModelDep {
  find(query: Record<string, unknown>): {
    sort: (s: Record<string, unknown>) => ReturnType<this["find"]>;
    limit: (n: number) => ReturnType<this["find"]>;
    lean: <T>() => Promise<T[]>;
  };
}

export interface TeamModelDep {
  find(query: Record<string, unknown>): {
    lean: <T>() => Promise<T[]>;
  };
}

export interface DashboardDeps {
  leaveRequestModel: LeaveRequestModelDep;
  employeeModel: EmployeeModelDep;
  balanceLedgerModel: BalanceLedgerModelDep;
  auditLogModel: AuditLogModelDep;
  teamModel: TeamModelDep;
}

// ----------------------------------------------------------------
// Widget types
// ----------------------------------------------------------------

export interface OutTodayEmployee {
  employeeId: string;
  name: string;
  teamName: string;
  avatarUrl: string | null;
  returnDate: string;
}

export interface OutTodayWidget {
  count: number;
  employees: OutTodayEmployee[];
  cacheTtlSeconds: number;
}

export interface PendingApprovalsWidget {
  count: number;
  staleCount: number;
  oldestPendingHours: number;
  cacheTtlSeconds: number;
}

export interface UtilizationRateWidget {
  averageUtilizationPercent: number;
  trend: "up" | "down" | "flat";
  trendPercent: number;
  cacheTtlSeconds: number;
}

export interface UpcomingWeekDay {
  date: string;
  dayName: string;
  absenceCount: number;
}

export interface UpcomingWeekWidget {
  days: UpcomingWeekDay[];
  cacheTtlSeconds: number;
}

export interface HeatmapDay {
  date: string;
  absenceCount: number;
  coverageWarning: boolean;
}

export interface AbsenceHeatmapWidget {
  year: number;
  month: number;
  days: HeatmapDay[];
  cacheTtlSeconds: number;
}

export interface ResolutionRateWidget {
  periodLabel: string;
  approved: number;
  pending: number;
  rejected: number;
  total: number;
  approvalRatePercent: number;
  cacheTtlSeconds: number;
}

export interface ActivityFeedEvent {
  eventId: string;
  type: string;
  actorName: string;
  targetName: string;
  description: string;
  entityId: string;
  entityType: string;
  timestamp: string;
  relativeTime: string;
}

export interface ActivityFeedWidget {
  events: ActivityFeedEvent[];
  cacheTtlSeconds: number;
}

export interface NeedsAttentionRequest {
  requestId: string;
  employeeName: string;
  teamName: string;
  leaveTypeName: string;
  startDate: string;
  workingDays: number;
  pendingHours: number;
  isStale: boolean;
  currentApproverName: string | null;
  autoEscalateAt: string | null;
}

export interface NeedsAttentionWidget {
  requests: NeedsAttentionRequest[];
  cacheTtlSeconds: number;
}

export interface TeamBalanceEntry {
  leaveTypeName: string;
  leaveTypeColor: string;
  averageAvailableDays: number;
  averageTotalDays: number;
  averageUtilizationPercent: number;
}

export interface TeamBalanceSummary {
  teamId: string;
  teamName: string;
  balances: TeamBalanceEntry[];
}

export interface TeamBalancesWidget {
  teams: TeamBalanceSummary[];
  cacheTtlSeconds: number;
}

export interface DashboardSummary {
  generatedAt: Date;
  widgets: {
    outToday: OutTodayWidget;
    pendingApprovals: PendingApprovalsWidget;
    utilizationRate: UtilizationRateWidget;
    upcomingWeek: UpcomingWeekWidget;
    absenceHeatmap: AbsenceHeatmapWidget;
    resolutionRate: ResolutionRateWidget;
    activityFeed: ActivityFeedWidget;
    needsAttention: NeedsAttentionWidget;
    teamBalances: TeamBalancesWidget;
  };
}

// ----------------------------------------------------------------
// Service interface
// ----------------------------------------------------------------

export interface DashboardService {
  getSummary(tenantId: string): Promise<DashboardSummary>;
}

// ----------------------------------------------------------------
// Factory
// ----------------------------------------------------------------

export function createDashboardService(deps: DashboardDeps): DashboardService {
  const {
    leaveRequestModel,
    employeeModel,
    balanceLedgerModel,
    auditLogModel,
    teamModel,
  } = deps;

  return {
    async getSummary(tenantId: string): Promise<DashboardSummary> {
      const now = new Date();

      // Run all 9 widget queries in parallel
      const [
        outToday,
        pendingApprovals,
        utilizationRate,
        upcomingWeek,
        absenceHeatmap,
        resolutionRate,
        activityFeed,
        needsAttention,
        teamBalances,
      ] = await Promise.all([
        buildOutToday(tenantId, now, leaveRequestModel, employeeModel),
        buildPendingApprovals(tenantId, now, leaveRequestModel),
        buildUtilizationRate(tenantId, balanceLedgerModel),
        buildUpcomingWeek(tenantId, now, leaveRequestModel),
        buildAbsenceHeatmap(tenantId, now, leaveRequestModel),
        buildResolutionRate(tenantId, now, leaveRequestModel),
        buildActivityFeed(tenantId, auditLogModel, employeeModel),
        buildNeedsAttention(tenantId, now, leaveRequestModel),
        buildTeamBalances(tenantId, teamModel, balanceLedgerModel),
      ]);

      return {
        generatedAt: now,
        widgets: {
          outToday,
          pendingApprovals,
          utilizationRate,
          upcomingWeek,
          absenceHeatmap,
          resolutionRate,
          activityFeed,
          needsAttention,
          teamBalances,
        },
      };
    },
  };
}

// ----------------------------------------------------------------
// Widget builders (private helpers)
// ----------------------------------------------------------------

const STALE_THRESHOLD_HOURS = 48;
const MS_PER_HOUR = 3_600_000;

async function buildOutToday(
  tenantId: string,
  now: Date,
  leaveRequestModel: LeaveRequestModelDep,
  employeeModel: EmployeeModelDep
): Promise<OutTodayWidget> {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  type AbsenceRow = { employeeId: mongoose.Types.ObjectId; endDate: Date };

  const absences = await leaveRequestModel.aggregate<AbsenceRow>([
    {
      $match: {
        tenantId,
        status: { $in: ["approved", "auto_approved"] },
        startDate: { $lte: todayEnd },
        endDate: { $gte: todayStart },
      },
    },
    {
      $group: {
        _id: "$employeeId",
        employeeId: { $first: "$employeeId" },
        endDate: { $max: "$endDate" },
      },
    },
  ]);

  if (absences.length === 0) {
    return { count: 0, employees: [], cacheTtlSeconds: 60 };
  }

  const employeeIds = absences.map((a) => a.employeeId);

  type EmpRow = {
    _id: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
    teamId: mongoose.Types.ObjectId | null;
  };

  const employees = await employeeModel
    .find({ tenantId, _id: { $in: employeeIds } })
    .select("_id firstName lastName teamId")
    .lean<EmpRow[]>();

  const empMap = new Map(employees.map((e) => [e._id.toString(), e]));

  const employeeList: OutTodayEmployee[] = absences.map((a) => {
    const emp = empMap.get(a.employeeId.toString());
    return {
      employeeId: a.employeeId.toString(),
      name: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
      teamName: "",
      avatarUrl: null,
      returnDate: toDateString(new Date(a.endDate.getTime() + 86_400_000)),
    };
  });

  return {
    count: employeeList.length,
    employees: employeeList,
    cacheTtlSeconds: 60,
  };
}

async function buildPendingApprovals(
  tenantId: string,
  now: Date,
  leaveRequestModel: LeaveRequestModelDep
): Promise<PendingApprovalsWidget> {
  const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_HOURS * MS_PER_HOUR);

  type CountRow = {
    _id: null;
    count: number;
    staleCount: number;
    oldest: Date | null;
  };

  const rows = await leaveRequestModel.aggregate<CountRow>([
    {
      $match: { tenantId, status: "pending_approval" },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        staleCount: {
          $sum: {
            $cond: [{ $lte: ["$currentStepStartedAt", staleThreshold] }, 1, 0],
          },
        },
        oldest: { $min: "$currentStepStartedAt" },
      },
    },
  ]);

  const row = rows[0];
  if (row === undefined) {
    return { count: 0, staleCount: 0, oldestPendingHours: 0, cacheTtlSeconds: 30 };
  }

  const oldestHours = row.oldest
    ? Math.floor((now.getTime() - new Date(row.oldest).getTime()) / MS_PER_HOUR)
    : 0;

  return {
    count: row.count,
    staleCount: row.staleCount,
    oldestPendingHours: oldestHours,
    cacheTtlSeconds: 30,
  };
}

async function buildUtilizationRate(
  tenantId: string,
  balanceLedgerModel: BalanceLedgerModelDep
): Promise<UtilizationRateWidget> {
  type UtilRow = { averageUtilization: number };

  const rows = await balanceLedgerModel.aggregate<UtilRow>([
    { $match: { tenantId } },
    {
      $group: {
        _id: { employeeId: "$employeeId", leaveTypeId: "$leaveTypeId" },
        total: { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
        used: { $sum: { $cond: [{ $lt: ["$amount", 0] }, { $abs: "$amount" }, 0] } },
      },
    },
    {
      $project: {
        utilization: {
          $cond: [
            { $gt: ["$total", 0] },
            { $divide: ["$used", "$total"] },
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        averageUtilization: { $avg: "$utilization" },
      },
    },
  ]);

  const avgPercent = rows[0]
    ? Math.round(rows[0].averageUtilization * 100)
    : 0;

  return {
    averageUtilizationPercent: avgPercent,
    trend: "flat",
    trendPercent: 0,
    cacheTtlSeconds: 3600,
  };
}

async function buildUpcomingWeek(
  tenantId: string,
  now: Date,
  leaveRequestModel: LeaveRequestModelDep
): Promise<UpcomingWeekWidget> {
  const workDays = nextFiveWorkingDays(now);
  const rangeStart = workDays[0] ?? now;
  const rangeEnd = workDays[workDays.length - 1] ?? now;

  type LeaveRow = { startDate: Date; endDate: Date };

  // Fetch all approved requests overlapping the upcoming week range
  const requests = await leaveRequestModel.aggregate<LeaveRow>([
    {
      $match: {
        tenantId,
        status: { $in: ["approved", "auto_approved"] },
        startDate: { $lte: endOfDay(rangeEnd) },
        endDate: { $gte: startOfDay(rangeStart) },
      },
    },
    {
      $project: { startDate: 1, endDate: 1 },
    },
  ]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

  const days: UpcomingWeekDay[] = workDays.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const absenceCount = requests.filter(
      (r) => new Date(r.startDate) <= dayEnd && new Date(r.endDate) >= dayStart
    ).length;

    return {
      date: toDateString(day),
      dayName: dayNames[day.getDay()] ?? "",
      absenceCount,
    };
  });

  return { days, cacheTtlSeconds: 300 };
}

async function buildAbsenceHeatmap(
  tenantId: string,
  now: Date,
  leaveRequestModel: LeaveRequestModelDep
): Promise<AbsenceHeatmapWidget> {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  type LeaveRow = { startDate: Date; endDate: Date };

  // Fetch all approved requests overlapping this month
  const requests = await leaveRequestModel.aggregate<LeaveRow>([
    {
      $match: {
        tenantId,
        status: { $in: ["approved", "auto_approved"] },
        startDate: { $lte: endOfDay(monthEnd) },
        endDate: { $gte: startOfDay(monthStart) },
      },
    },
    { $project: { startDate: 1, endDate: 1 } },
  ]);

  const daysInMonth = monthEnd.getDate();
  const days: HeatmapDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const absenceCount = requests.filter(
      (r) => new Date(r.startDate) <= dayEnd && new Date(r.endDate) >= dayStart
    ).length;

    days.push({
      date: toDateString(date),
      absenceCount,
      coverageWarning: false,
    });
  }

  return { year, month, days, cacheTtlSeconds: 300 };
}

async function buildResolutionRate(
  tenantId: string,
  now: Date,
  leaveRequestModel: LeaveRequestModelDep
): Promise<ResolutionRateWidget> {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  type StatusRow = { _id: string; count: number };

  const rows = await leaveRequestModel.aggregate<StatusRow>([
    {
      $match: {
        tenantId,
        createdAt: {
          $gte: startOfDay(monthStart),
          $lte: endOfDay(monthEnd),
        },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  let approved = 0;
  let pending = 0;
  let rejected = 0;

  for (const row of rows) {
    if (row._id === "approved" || row._id === "auto_approved") {
      approved += row.count;
    } else if (row._id === "pending_approval" || row._id === "pending_validation") {
      pending += row.count;
    } else if (row._id === "rejected") {
      rejected += row.count;
    }
  }

  const total = approved + pending + rejected;
  const approvalRatePercent = total > 0 ? Math.round((approved / total) * 100) : 0;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ] as const;
  const periodLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  return {
    periodLabel,
    approved,
    pending,
    rejected,
    total,
    approvalRatePercent,
    cacheTtlSeconds: 300,
  };
}

async function buildActivityFeed(
  tenantId: string,
  auditLogModel: AuditLogModelDep,
  _employeeModel: EmployeeModelDep
): Promise<ActivityFeedWidget> {
  type AuditRow = {
    _id: mongoose.Types.ObjectId;
    action: string;
    entityType: string;
    entityId: string;
    actorId: string;
    actorType: string;
    timestamp: Date;
    metadata: Record<string, unknown> | null;
  };

  const entries = await auditLogModel
    .find({ tenantId })
    .sort({ timestamp: -1 })
    .limit(10)
    .lean<AuditRow[]>();

  const events: ActivityFeedEvent[] = entries.map((entry) => ({
    eventId: entry._id.toString(),
    type: entry.action,
    actorName: entry.actorType === "system" ? "System" : String(entry.actorId),
    targetName: "",
    description: actionToDescription(entry.action),
    entityId: String(entry.entityId),
    entityType: entry.entityType,
    timestamp: entry.timestamp.toISOString(),
    relativeTime: toRelativeTime(entry.timestamp, new Date()),
  }));

  return { events, cacheTtlSeconds: 30 };
}

async function buildNeedsAttention(
  tenantId: string,
  now: Date,
  leaveRequestModel: LeaveRequestModelDep
): Promise<NeedsAttentionWidget> {
  const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_HOURS * MS_PER_HOUR);

  type RequestRow = {
    _id: mongoose.Types.ObjectId;
    employeeId: mongoose.Types.ObjectId;
    leaveTypeId: mongoose.Types.ObjectId;
    startDate: Date;
    workingDays: number;
    currentStepStartedAt: Date | null;
    currentApproverEmployeeId: mongoose.Types.ObjectId | null;
  };

  const requests = await leaveRequestModel.aggregate<RequestRow>([
    {
      $match: { tenantId, status: "pending_approval" },
    },
    { $sort: { currentStepStartedAt: 1 } },
    { $limit: 20 },
  ]);

  const needsAttentionRequests: NeedsAttentionRequest[] = requests.map((req) => {
    const startedAt = req.currentStepStartedAt;
    const pendingHours = startedAt
      ? Math.floor((now.getTime() - startedAt.getTime()) / MS_PER_HOUR)
      : 0;
    const isStale = startedAt !== null && startedAt < staleThreshold;

    return {
      requestId: req._id.toString(),
      employeeName: req.employeeId.toString(),
      teamName: "",
      leaveTypeName: req.leaveTypeId.toString(),
      startDate: toDateString(req.startDate),
      workingDays: req.workingDays,
      pendingHours,
      isStale,
      currentApproverName: req.currentApproverEmployeeId?.toString() ?? null,
      autoEscalateAt: null,
    };
  });

  return { requests: needsAttentionRequests, cacheTtlSeconds: 30 };
}

async function buildTeamBalances(
  tenantId: string,
  teamModel: TeamModelDep,
  balanceLedgerModel: BalanceLedgerModelDep
): Promise<TeamBalancesWidget> {
  type TeamRow = { _id: mongoose.Types.ObjectId; name: string };

  const teams = await teamModel
    .find({ tenantId })
    .lean<TeamRow[]>();

  if (teams.length === 0) {
    return { teams: [], cacheTtlSeconds: 3600 };
  }

  // Single aggregate across all teams — group by (teamId via employee join)
  type BalanceAggRow = {
    _id: { leaveTypeId: mongoose.Types.ObjectId; teamId: mongoose.Types.ObjectId };
    averageBalance: number;
    averageTotal: number;
  };

  const teamIds = teams.map((t) => t._id);

  const balanceRows = await balanceLedgerModel.aggregate<BalanceAggRow>([
    { $match: { tenantId } },
    {
      $lookup: {
        from: "employees",
        localField: "employeeId",
        foreignField: "_id",
        as: "employee",
      },
    },
    { $unwind: "$employee" },
    {
      $match: {
        "employee.teamId": { $in: teamIds },
        "employee.tenantId": tenantId,
      },
    },
    {
      $group: {
        _id: {
          leaveTypeId: "$leaveTypeId",
          teamId: "$employee.teamId",
          employeeId: "$employeeId",
        },
        employeeBalance: { $sum: "$amount" },
        employeeTotal: {
          $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] },
        },
      },
    },
    {
      $group: {
        _id: {
          leaveTypeId: "$_id.leaveTypeId",
          teamId: "$_id.teamId",
        },
        averageBalance: { $avg: "$employeeBalance" },
        averageTotal: { $avg: "$employeeTotal" },
      },
    },
  ]);

  // Build a lookup map: teamId -> leaveTypeId -> balance
  const teamMap = new Map(teams.map((t) => [t._id.toString(), t]));
  const teamBalanceMap = new Map<string, BalanceAggRow[]>();

  for (const row of balanceRows) {
    const teamId = row._id.teamId.toString();
    const existing = teamBalanceMap.get(teamId) ?? [];
    teamBalanceMap.set(teamId, [...existing, row]);
  }

  const teamSummaries: TeamBalanceSummary[] = teams.map((team) => {
    const teamId = team._id.toString();
    const teamBalances = teamBalanceMap.get(teamId) ?? [];

    return {
      teamId,
      teamName: teamMap.get(teamId)?.name ?? team.name,
      balances: teamBalances.map((b) => ({
        leaveTypeName: b._id.leaveTypeId.toString(),
        leaveTypeColor: "#818CF8",
        averageAvailableDays: Math.max(0, b.averageBalance),
        averageTotalDays: b.averageTotal,
        averageUtilizationPercent:
          b.averageTotal > 0
            ? Math.round(
                ((b.averageTotal - Math.max(0, b.averageBalance)) / b.averageTotal) * 100
              )
            : 0,
      })),
    };
  });

  return { teams: teamSummaries, cacheTtlSeconds: 3600 };
}

// ----------------------------------------------------------------
// Private date/time helpers
// ----------------------------------------------------------------

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nextFiveWorkingDays(from: Date): Date[] {
  const result: Date[] = [];
  let current = new Date(from);
  current.setDate(current.getDate() + 1); // start tomorrow

  while (result.length < 5) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      // Skip weekends
      result.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return result;
}

function toRelativeTime(past: Date, now: Date): string {
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  return "just now";
}

function actionToDescription(action: string): string {
  const map: Record<string, string> = {
    "leave_request.submitted": "Submitted a leave request",
    "leave_request.approved": "Approved a leave request",
    "leave_request.rejected": "Rejected a leave request",
    "leave_request.cancelled": "Cancelled a leave request",
    "leave_request.escalated": "Escalated a leave request",
    "employee.created": "Created an employee",
    "employee.updated": "Updated an employee",
    "employee.deactivated": "Deactivated an employee",
    "workflow.created": "Created a workflow",
    "workflow.updated": "Updated a workflow",
    "balance.adjusted": "Adjusted a balance",
  };
  return map[action] ?? action;
}
