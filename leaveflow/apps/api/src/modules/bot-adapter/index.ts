/**
 * Bot adapter module — exports interface, types, and mapping service.
 */

export type { BotAdapter } from "./bot-adapter.interface.js";
export type {
  LeaveFormContext,
  LeaveRequestSummary,
  NotificationPayload,
  MessageReference,
  CardUpdate,
  ChannelReference,
  ResolvedUser,
} from "./bot-adapter.types.js";
export { BotMappingService } from "./bot-mapping.service.js";
export type {
  CreateMappingInput,
  ResolvedMapping,
  EmployeePlatformMapping,
  WorkspaceMember,
} from "./bot-mapping.service.js";
