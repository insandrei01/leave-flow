/**
 * Route-level Zod schemas for tenant routes.
 * Wraps the shared validation schemas from @leaveflow/validation.
 */

import { z } from "zod";
import {
  updateTenantBodySchema,
  tenantSettingsBodySchema,
} from "@leaveflow/validation";

// Re-export body schemas for use in routes
export { updateTenantBodySchema, tenantSettingsBodySchema };

// Route-level params (none for tenant — uses /current convention)
export const tenantParamsSchema = z.object({});

export type UpdateTenantBody = z.infer<typeof updateTenantBodySchema>;
export type TenantSettingsBody = z.infer<typeof tenantSettingsBodySchema>;
