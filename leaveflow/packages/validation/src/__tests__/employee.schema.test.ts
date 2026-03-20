import { describe, it, expect } from 'vitest';
import {
  createEmployeeBodySchema,
  updateEmployeeBodySchema,
  csvImportBodySchema,
} from '../employee.schema.js';

const VALID_OBJECT_ID = '64f2a1b3c4d5e6f7a8b9c0d1';

describe('createEmployeeBodySchema', () => {
  const validInput = {
    email: 'bob@acme.com',
    name: 'Bob Smith',
    role: 'employee' as const,
    teamId: VALID_OBJECT_ID,
    startDate: '2026-01-20',
  };

  it('accepts valid input', () => {
    const result = createEmployeeBodySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('defaults role to employee', () => {
    const { role: _r, ...rest } = validInput;
    const result = createEmployeeBodySchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('employee');
    }
  });

  it('lowercases and trims email', () => {
    const result = createEmployeeBodySchema.safeParse({
      ...validInput,
      email: '  BOB@ACME.COM  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('bob@acme.com');
    }
  });

  it('rejects invalid email', () => {
    const result = createEmployeeBodySchema.safeParse({ ...validInput, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = createEmployeeBodySchema.safeParse({ ...validInput, role: 'superuser' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid startDate format', () => {
    const result = createEmployeeBodySchema.safeParse({ ...validInput, startDate: '20-01-2026' });
    expect(result.success).toBe(false);
  });

  it('accepts null teamId', () => {
    const result = createEmployeeBodySchema.safeParse({ ...validInput, teamId: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.teamId).toBeNull();
    }
  });
});

describe('updateEmployeeBodySchema', () => {
  it('accepts empty object (all optional)', () => {
    const result = updateEmployeeBodySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid status values', () => {
    const active = updateEmployeeBodySchema.safeParse({ status: 'active' });
    const inactive = updateEmployeeBodySchema.safeParse({ status: 'inactive' });
    expect(active.success).toBe(true);
    expect(inactive.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateEmployeeBodySchema.safeParse({ status: 'suspended' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strict)', () => {
    const result = updateEmployeeBodySchema.safeParse({ unknownField: 'value' });
    expect(result.success).toBe(false);
  });
});

describe('csvImportBodySchema', () => {
  it('defaults sendInvitations to true', () => {
    const result = csvImportBodySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sendInvitations).toBe(true);
    }
  });

  it('accepts explicit false', () => {
    const result = csvImportBodySchema.safeParse({ sendInvitations: false });
    expect(result.success).toBe(true);
  });
});
