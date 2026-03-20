/**
 * Teams bot module — adapter, commands, interactions, OAuth, and Fastify plugin.
 */

export { TeamsBotAdapter } from "./bot-teams.adapter.js";
export type {
  TeamsBotClient,
  TeamsConversationReference,
} from "./bot-teams.adapter.js";

export {
  handleLeaveCommand,
} from "./bot-teams.commands.js";
export type {
  TeamsCommandPayload,
  TeamsCommandsDeps,
} from "./bot-teams.commands.js";

export {
  handleLeaveFormSubmit,
  handleApproveAction,
  handleRejectAction,
} from "./bot-teams.interactions.js";
export type {
  TeamsActionPayload,
  TeamsInteractionsDeps,
} from "./bot-teams.interactions.js";

export {
  handleTeamsOAuthCallback,
  buildTeamsInstallUrl,
} from "./bot-teams.oauth.js";
export type {
  TeamsOAuthCallbackInput,
  TeamsOAuthDeps,
  TeamsInstallParams,
  TeamsOAuthTokenResponse,
} from "./bot-teams.oauth.js";

export { teamsBotPlugin } from "./bot-teams.plugin.js";
export type { TeamsPluginOptions } from "./bot-teams.plugin.js";
