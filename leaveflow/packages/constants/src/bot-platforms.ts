/**
 * Supported bot integration platforms.
 */
export const BOT_PLATFORMS = {
  slack: "slack",
  teams: "teams",
} as const;

export type BotPlatform = (typeof BOT_PLATFORMS)[keyof typeof BOT_PLATFORMS];
