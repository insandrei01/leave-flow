import { describe, it, expect, vi, beforeEach } from "vitest";

const mockVerifyIdToken = vi.fn();
const mockSetCustomUserClaims = vi.fn();
const mockAuth = {
  verifyIdToken: mockVerifyIdToken,
  setCustomUserClaims: mockSetCustomUserClaims,
};

vi.mock("firebase-admin", () => ({
  default: {
    apps: [] as unknown[],
    initializeApp: vi.fn(),
    credential: {
      cert: vi.fn().mockReturnValue({}),
    },
    auth: vi.fn().mockReturnValue(mockAuth),
  },
}));

describe("firebase-admin lib", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifyIdToken resolves with uid and claims on success", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: "user-123",
      tenantId: "tenant-abc",
      employeeId: "emp-1",
      role: "manager",
    });

    const { verifyIdToken } = await import("./firebase-admin.js");
    const result = await verifyIdToken("valid-token");

    expect(result.uid).toBe("user-123");
    expect(result.tenantId).toBe("tenant-abc");
    expect(result.role).toBe("manager");
  });

  it("verifyIdToken throws when firebase rejects the token", async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error("ID token has expired"));

    const { verifyIdToken } = await import("./firebase-admin.js");
    await expect(verifyIdToken("expired-token")).rejects.toThrow("ID token has expired");
  });

  it("setCustomClaims calls setCustomUserClaims with correct args", async () => {
    mockSetCustomUserClaims.mockResolvedValueOnce(undefined);

    const { setCustomClaims } = await import("./firebase-admin.js");
    await setCustomClaims("user-123", { tenantId: "t1", role: "hr_admin" });

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("user-123", {
      tenantId: "t1",
      role: "hr_admin",
    });
  });
});
