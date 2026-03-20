/**
 * Auth service — registration flow and profile retrieval.
 *
 * Responsibilities:
 * - register: create Firebase user, set custom claims, create Tenant + Employee,
 *   initialise onboarding wizard
 * - getMe: return enriched employee profile from auth claims
 */

import admin from "firebase-admin";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import type { TenantService } from "../tenant/tenant.service.js";
import type { EmployeeService } from "../employee/employee.service.js";
import type { OnboardingService } from "../onboarding/onboarding.service.js";
import type { EmployeeRecord } from "../employee/employee.types.js";
import type { TenantRecord } from "../tenant/tenant.types.js";
import type { RegisterBody } from "./auth.schema.js";

// ----------------------------------------------------------------
// Output types
// ----------------------------------------------------------------

export interface RegisterResult {
  readonly tenantId: string;
  readonly employeeId: string;
  readonly firebaseUid: string;
  readonly emailVerificationSent: boolean;
}

export interface MeResult {
  readonly employeeId: string;
  readonly firebaseUid: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly tenantId: string;
  readonly tenantName: string;
  readonly teamId: string | null;
  readonly primaryPlatform: string;
  readonly avatarUrl: string | null;
  readonly createdAt: Date;
}

// ----------------------------------------------------------------
// Service interface
// ----------------------------------------------------------------

export interface AuthService {
  register(input: RegisterBody): Promise<RegisterResult>;
  getMe(uid: string, tenantId: string, employeeId: string): Promise<MeResult>;
}

// ----------------------------------------------------------------
// Dependencies interface
// ----------------------------------------------------------------

export interface AuthServiceDeps {
  tenantService: TenantService;
  employeeService: EmployeeService;
  onboardingService: OnboardingService;
  getTenantById(id: string): Promise<TenantRecord | null>;
}

// ----------------------------------------------------------------
// Slug generation helper
// ----------------------------------------------------------------

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)
    .replace(/^-|-$/g, "") || "company";
}

function ensureFirebaseInitialized(): void {
  if (admin.apps.length === 0) {
    throw new Error("Firebase Admin SDK is not initialized");
  }
}

// ----------------------------------------------------------------
// Factory
// ----------------------------------------------------------------

export function createAuthService(deps: AuthServiceDeps): AuthService {
  const { tenantService, employeeService, onboardingService, getTenantById } =
    deps;

  return {
    async register(input: RegisterBody): Promise<RegisterResult> {
      // Create Firebase user first — if email is taken, Firebase throws
      ensureFirebaseInitialized();

      let firebaseUser: admin.auth.UserRecord;
      try {
        firebaseUser = await admin.auth().createUser({
          email: input.adminEmail,
          password: input.password,
          displayName: input.adminName,
          emailVerified: false,
        });
      } catch (err: unknown) {
        const code =
          err instanceof Error && "errorInfo" in err
            ? (err as { errorInfo?: { code?: string } }).errorInfo?.code
            : undefined;
        if (
          code === "auth/email-already-exists" ||
          (err instanceof Error &&
            err.message.toLowerCase().includes("email already exists"))
        ) {
          throw new ConflictError(
            `Email address already registered: ${input.adminEmail}`,
            "EMAIL_ALREADY_REGISTERED"
          );
        }
        throw err;
      }

      // Generate a URL-safe slug from the company name
      const baseSlug = generateSlug(input.companyName);
      const slug = `${baseSlug}-${firebaseUser.uid.slice(0, 6)}`;

      // Create tenant
      const tenant = await tenantService.createTenant({
        name: input.companyName,
        slug,
        plan: "free",
        timezone: input.timezone,
      });

      // Split adminName into firstName / lastName
      const nameParts = input.adminName.trim().split(/\s+/);
      const firstName = nameParts[0] ?? input.adminName;
      const lastName =
        nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";

      // Create employee record for the admin
      const employee = await employeeService.create(tenant.id, {
        email: input.adminEmail,
        firstName,
        lastName,
        role: "company_admin",
        startDate: new Date(),
        firebaseUid: firebaseUser.uid,
        status: "active",
      });

      // Set Firebase custom claims so subsequent tokens carry tenantId, employeeId, role
      await admin.auth().setCustomUserClaims(firebaseUser.uid, {
        tenantId: tenant.id,
        employeeId: employee.id,
        role: "company_admin",
      });

      // Initialise the 6-step onboarding wizard
      await onboardingService.initialize(tenant.id);

      return Object.freeze({
        tenantId: tenant.id,
        employeeId: employee.id,
        firebaseUid: firebaseUser.uid,
        emailVerificationSent: false, // email verification is handled client-side via Firebase SDK
      });
    },

    async getMe(
      uid: string,
      tenantId: string,
      employeeId: string
    ): Promise<MeResult> {
      let employee: EmployeeRecord;
      try {
        employee = await employeeService.findById(tenantId, employeeId);
      } catch {
        throw new NotFoundError("Employee", employeeId);
      }

      const tenant = await getTenantById(tenantId);
      if (tenant === null) {
        throw new NotFoundError("Tenant", tenantId);
      }

      return Object.freeze({
        employeeId: employee.id,
        firebaseUid: uid,
        name: employee.displayName,
        email: employee.email,
        role: employee.role,
        tenantId: tenant.id,
        tenantName: tenant.name,
        teamId: employee.teamId,
        primaryPlatform: employee.primaryPlatform,
        avatarUrl: employee.profileImageUrl,
        createdAt: employee.createdAt,
      });
    },
  };
}
