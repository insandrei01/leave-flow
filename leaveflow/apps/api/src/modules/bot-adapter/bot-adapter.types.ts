/**
 * Platform-agnostic types for bot adapter operations.
 *
 * These types decouple the bot integration logic from any specific
 * platform SDK (Slack Bolt, Bot Framework, etc.).
 */

import type { BotPlatform } from "../../models/bot-mapping.model.js";

// ----------------------------------------------------------------
// Context types (input to adapter methods)
// ----------------------------------------------------------------

/**
 * Context passed when opening a leave request form/modal.
 */
export interface LeaveFormContext {
  /** Platform user ID of the employee requesting leave */
  readonly platformUserId: string;
  /** Platform-specific trigger ID (required for Slack modals) */
  readonly triggerId?: string;
  /** Available leave types for the form dropdown */
  readonly leaveTypes: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
  /** Pre-filled request ID (for editing) */
  readonly prefillRequestId?: string;
}

/**
 * Summary of a leave request used in bot messages.
 */
export interface LeaveRequestSummary {
  readonly requestId: string;
  readonly employeeName: string;
  readonly employeeAvatarUrl?: string;
  readonly leaveTypeName: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly workingDays: number;
  readonly reason: string | null;
  readonly teamName: string;
  readonly balanceAfter: number;
  readonly balanceTotal: number;
  /** Names of other team members on leave during the same period */
  readonly othersOut: readonly string[];
  /** Team coverage percentage 0-100 */
  readonly teamCoverage: number;
  /** Approval chain step names */
  readonly approvalChain: readonly string[];
  /** Index (0-based) of the current step in the chain */
  readonly currentStepIndex: number;
  /** ISO timestamp when the request was submitted */
  readonly submittedAt: string;
  /** Hours until auto-escalation */
  readonly autoEscalateInHours?: number;
}

/**
 * Payload for a plain text direct message or channel message.
 */
export interface NotificationPayload {
  readonly text: string;
  /** Optional structured data for rich rendering */
  readonly data?: Record<string, unknown>;
}

/**
 * Reference to a previously sent message that can be updated.
 * Opaque to callers — only the adapter that created it can interpret it.
 */
export interface MessageReference {
  readonly platform: BotPlatform;
  /** Platform-specific channel/conversation ID */
  readonly channelId: string;
  /** Platform-specific message timestamp or activity ID */
  readonly messageId: string;
  /** For Teams: serialized conversation reference */
  readonly conversationRef?: Record<string, unknown>;
}

/**
 * Update to apply to an existing approval card (after approve/reject).
 */
export interface CardUpdate {
  /** New status text to show */
  readonly status: "approved" | "rejected" | "cancelled";
  /** Name of the person who acted */
  readonly actorName: string;
  /** Timestamp of the action */
  readonly actedAt: string;
  /** Rejection reason (only for rejected status) */
  readonly rejectionReason?: string;
}

/**
 * Reference to a channel for posting announcements.
 */
export interface ChannelReference {
  readonly platform: BotPlatform;
  /** Platform-specific channel ID */
  readonly channelId: string;
}

/**
 * Result of resolving a platform user to a LeaveFlow identity.
 */
export interface ResolvedUser {
  readonly tenantId: string;
  readonly employeeId: string;
  readonly platformUserId: string;
  readonly platform: BotPlatform;
}
