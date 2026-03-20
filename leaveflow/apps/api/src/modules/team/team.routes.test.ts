/**
 * Route-level tests for team routes.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { createTeamRoutes } from "./team.routes.js";
import type { TeamService } from "./team.service.js";
import type { TeamRecord, TeamMemberRecord } from "./team.types.js";

const VALID_MONGO_ID = "507f1f77bcf86cd799439011";

function buildTeamRecord(overrides: Partial<TeamRecord> = {}): TeamRecord {
  return {
    id: VALID_MONGO_ID,
    tenantId: "tenant-001",
    name: "Engineering",
    managerId: null,
    workflowId: null,
    announcementChannelSlack: null,
    announcementChannelTeams: null,
    isActive: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function buildMockService(
  overrides: Partial<TeamService> = {}
): TeamService {
  return {
    findAll: vi.fn().mockResolvedValue([buildTeamRecord()]),
    findById: vi.fn().mockResolvedValue(buildTeamRecord()),
    create: vi.fn().mockResolvedValue(buildTeamRecord()),
    update: vi.fn().mockResolvedValue(buildTeamRecord()),
    delete: vi.fn().mockResolvedValue(undefined),
    findMembers: vi.fn().mockResolvedValue([] as TeamMemberRecord[]),
    ...overrides,
  };
}

async function buildApp(
  service: TeamService,
  role = "hr_admin"
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.addHook("onRequest", async (request) => {
    request.auth = { uid: "uid", tenantId: "tenant-001", employeeId: "emp-1", role };
  });
  await app.register(createTeamRoutes(service));
  await app.ready();
  return app;
}

describe("GET /teams", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(buildMockService());
  });

  afterAll(async () => { await app.close(); });

  it("returns 200 with list", async () => {
    const res = await app.inject({ method: "GET", url: "/teams" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe("GET /teams/:id", () => {
  it("returns 200 with team record", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({ method: "GET", url: `/teams/${VALID_MONGO_ID}` });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("returns 422 for invalid ID", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({ method: "GET", url: "/teams/bad-id" });
    expect(res.statusCode).toBe(422);
    await app.close();
  });

  it("returns 404 when not found", async () => {
    const service = buildMockService({
      findById: vi.fn().mockRejectedValue(new Error(`Team not found: ${VALID_MONGO_ID}`)),
    });
    const app = await buildApp(service);
    const res = await app.inject({ method: "GET", url: `/teams/${VALID_MONGO_ID}` });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

describe("GET /teams/:id/members", () => {
  it("returns 200 with members list", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({ method: "GET", url: `/teams/${VALID_MONGO_ID}/members` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    await app.close();
  });
});

describe("POST /teams", () => {
  it("returns 201 for hr_admin", async () => {
    const app = await buildApp(buildMockService(), "hr_admin");
    const res = await app.inject({
      method: "POST",
      url: "/teams",
      payload: { name: "New Team" },
    });
    expect(res.statusCode).toBe(201);
    await app.close();
  });

  it("returns 403 for employee", async () => {
    const app = await buildApp(buildMockService(), "employee");
    const res = await app.inject({
      method: "POST",
      url: "/teams",
      payload: { name: "New Team" },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it("returns 422 for missing name", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "POST",
      url: "/teams",
      payload: {},
    });
    expect(res.statusCode).toBe(422);
    await app.close();
  });

  it("returns 409 when team name already exists", async () => {
    const service = buildMockService({
      create: vi.fn().mockRejectedValue(
        new Error('Team with name "New Team" already exists for this tenant')
      ),
    });
    const app = await buildApp(service);
    const res = await app.inject({
      method: "POST",
      url: "/teams",
      payload: { name: "New Team" },
    });
    expect(res.statusCode).toBe(409);
    await app.close();
  });
});

describe("PATCH /teams/:id", () => {
  it("returns 200 for hr_admin", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "PATCH",
      url: `/teams/${VALID_MONGO_ID}`,
      payload: { name: "Updated Team" },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("returns 403 for manager", async () => {
    const app = await buildApp(buildMockService(), "manager");
    const res = await app.inject({
      method: "PATCH",
      url: `/teams/${VALID_MONGO_ID}`,
      payload: { name: "Updated" },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});

describe("DELETE /teams/:id", () => {
  it("returns 204 for hr_admin", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({ method: "DELETE", url: `/teams/${VALID_MONGO_ID}` });
    expect(res.statusCode).toBe(204);
    await app.close();
  });

  it("returns 403 for employee", async () => {
    const app = await buildApp(buildMockService(), "employee");
    const res = await app.inject({ method: "DELETE", url: `/teams/${VALID_MONGO_ID}` });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});
