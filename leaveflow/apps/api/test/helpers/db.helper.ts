/**
 * MongoDB in-memory test database helpers.
 *
 * Uses mongodb-memory-server to spin up an ephemeral MongoDB instance for
 * integration tests. Each test suite should call setupTestDb() in beforeAll
 * and teardownTestDb() in afterAll. Call clearAllCollections() in beforeEach
 * to ensure test isolation.
 */

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  TenantModel,
  type ITenant,
} from "../../src/models/index.js";

// Module-level singleton — shared across the test process lifetime.
let mongoServer: MongoMemoryServer | null = null;

/**
 * Starts the in-memory MongoDB server and connects Mongoose to it.
 * Idempotent — safe to call multiple times (subsequent calls are no-ops).
 */
export async function setupTestDb(): Promise<void> {
  if (mongoServer !== null) {
    return;
  }

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri, {
    bufferCommands: false,
  });
}

/**
 * Disconnects Mongoose and stops the in-memory MongoDB server.
 * Should be called once in afterAll for the test suite that owns the setup.
 */
export async function teardownTestDb(): Promise<void> {
  await mongoose.disconnect();

  if (mongoServer !== null) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

/**
 * Drops all documents from every collection in the connected database.
 * Call in beforeEach to achieve test isolation without restarting the server.
 */
export async function clearAllCollections(): Promise<void> {
  const db = mongoose.connection.db;
  if (db === undefined) {
    return;
  }

  const collections = await db.listCollections().toArray();

  await Promise.all(
    collections.map(({ name }) => db.collection(name).deleteMany({}))
  );
}

/**
 * Creates and persists a minimal test tenant document.
 * Returns the saved Mongoose document.
 */
export async function seedTestTenant(
  overrides: Partial<Pick<ITenant, "name" | "slug" | "plan">> = {}
): Promise<ITenant> {
  const defaults = {
    name: "Test Company",
    slug: "test-company",
    plan: "free" as const,
  };

  const doc = new TenantModel({ ...defaults, ...overrides });
  return doc.save();
}
