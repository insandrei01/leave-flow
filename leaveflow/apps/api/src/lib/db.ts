/**
 * MongoDB connection management via Mongoose.
 *
 * Provides connect/disconnect with retry logic (3 attempts, exponential backoff).
 * Registers graceful shutdown handlers for SIGINT and SIGTERM.
 */

import mongoose from "mongoose";

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

let isConnected = false;

/**
 * Connects to MongoDB with exponential backoff retry.
 * Idempotent — calling when already connected is a no-op.
 */
export async function connectDatabase(uri?: string): Promise<void> {
  if (isConnected) {
    return;
  }

  const connectionUri =
    uri ??
    process.env["MONGODB_URI"] ??
    process.env["MONGODB_URL"] ??
    "mongodb://localhost:27017/leaveflow";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(connectionUri, {
        // Disable Mongoose buffering to surface connection errors immediately
        bufferCommands: false,
      });

      isConnected = true;

      mongoose.connection.on("disconnected", () => {
        isConnected = false;
      });

      mongoose.connection.on("error", (err: Error) => {
        console.error("[db] Mongoose connection error:", err.message);
        isConnected = false;
      });

      return;
    } catch (err) {
      const isLastAttempt = attempt === MAX_RETRIES;
      if (isLastAttempt) {
        throw new Error(
          `[db] Failed to connect to MongoDB after ${MAX_RETRIES} attempts: ${String(err)}`
        );
      }
      const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(
        `[db] Connection attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${delayMs}ms...`
      );
      await sleep(delayMs);
    }
  }
}

/**
 * Gracefully disconnects from MongoDB.
 * Idempotent — safe to call when already disconnected.
 */
export async function disconnectDatabase(): Promise<void> {
  if (!isConnected && mongoose.connection.readyState === 0) {
    return;
  }
  await mongoose.disconnect();
  isConnected = false;
}

/**
 * Registers process signal handlers for graceful shutdown.
 * Call once at application startup (in server.ts).
 */
export function registerShutdownHandlers(): void {
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[db] Received ${signal}. Disconnecting from MongoDB...`);
    await disconnectDatabase();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
