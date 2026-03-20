/**
 * Delivery channels for notifications.
 */
export const NOTIFICATION_CHANNELS = {
  slack: "slack",
  teams: "teams",
  email: "email",
  in_app: "in_app",
} as const;

export type NotificationChannel =
  (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];
