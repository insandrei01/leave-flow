/**
 * Auth module — registration, login, and profile endpoints.
 */

export { authRoutes } from "./auth.routes.js";
export { createAuthService } from "./auth.service.js";
export type {
  AuthService,
  AuthServiceDeps,
  RegisterResult,
  MeResult,
} from "./auth.service.js";
export { registerBodySchema, loginBodySchema } from "./auth.schema.js";
export type { RegisterBody, LoginBody } from "./auth.schema.js";
