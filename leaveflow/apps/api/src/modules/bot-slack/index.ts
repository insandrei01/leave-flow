/**
 * Slack bot module — adapter, commands, interactions, OAuth, and Fastify plugin.
 */

export { SlackBotAdapter } from "./bot-slack.adapter.js";
export type { SlackWebClient } from "./bot-slack.adapter.js";

export {
  handleLeaveCommand,
} from "./bot-slack.commands.js";
export type {
  SlackCommandPayload,
  SlackCommandsDeps,
} from "./bot-slack.commands.js";

export {
  handleLeaveFormSubmission,
  handleApproveAction,
  handleRejectAction,
  handleRejectReasonSubmission,
} from "./bot-slack.interactions.js";
export type {
  SlackViewSubmissionPayload,
  SlackBlockActionPayload,
  SlackInteractionsDeps,
} from "./bot-slack.interactions.js";

export {
  handleSlackOAuthCallback,
  buildSlackInstallUrl,
} from "./bot-slack.oauth.js";
export type {
  SlackOAuthCallbackInput,
  SlackOAuthDeps,
  SlackInstallParams,
  SlackOAuthTokenResponse,
} from "./bot-slack.oauth.js";

export { slackBotPlugin } from "./bot-slack.plugin.js";
export type { SlackPluginOptions } from "./bot-slack.plugin.js";
