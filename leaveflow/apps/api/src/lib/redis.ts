/**
 * Redis connection management using ioredis.
 *
 * Provides a singleton ioredis client configured from REDIS_URL.
 * Exports getRedisClient() and disconnectRedis() for lifecycle management.
 */

import Redis from "ioredis";

let client: Redis | null = null;

/**
 * Returns the singleton Redis client.
 * Creates the connection on first call using REDIS_URL from environment.
 */
export function getRedisClient(): Redis {
  if (client !== null) {
    return client;
  }

  const url = process.env["REDIS_URL"] ?? "redis://localhost:6379";

  client = new Redis(url, {
    // Lazy connect — only connects when the first command is issued.
    // This avoids blocking at module import time and allows the connection
    // to be configured before it is used.
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    // Reconnect with backoff: attempt * 50ms, capped at 2 seconds
    retryStrategy: (times: number) => {
      if (times > 10) {
        return null; // Stop retrying after 10 attempts
      }
      return Math.min(times * 50, 2000);
    },
  });

  client.on("error", (err: Error) => {
    console.error("[redis] Connection error:", err.message);
  });

  client.on("connect", () => {
    console.log("[redis] Connected");
  });

  client.on("close", () => {
    console.log("[redis] Connection closed");
  });

  return client;
}

/**
 * Gracefully disconnects the Redis client.
 * Idempotent — safe to call when already disconnected.
 */
export async function disconnectRedis(): Promise<void> {
  if (client === null) {
    return;
  }
  await client.quit();
  client = null;
}
