import { describe, it, expect } from 'vitest';
import { manualAdjustmentBodySchema } from '../balance.schema.js';

const VALID_OBJECT_ID = '64f2a1b3c4d5e6f7a8b9c0d1';

describe('manualAdjustmentBodySchema', () => {
  const validInput = {
    employeeId: VALID_OBJECT_ID,
    leaveTypeId: VALID_OBJECT_ID,
    amount: 5,
    reason: 'Correction for onboarding allocation error',
    effectiveDate: '2026-03-01',
  };

  it('accepts positive amount (credit)', () => {
    const result = manualAdjustmentBodySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts negative amount (debit)', () => {
    const result = manualAdjustmentBodySchema.safeParse({ ...validInput, amount: -3 });
    expect(result.success).toBe(true);
  });

  it('rejects zero amount', () => {
    const result = manualAdjustmentBodySchema.safeParse({ ...validInput, amount: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('zero');
    }
  });

  it('rejects amount exceeding 365 days', () => {
    const result = manualAdjustmentBodySchema.safeParse({ ...validInput, amount: 366 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid employeeId', () => {
    const result = manualAdjustmentBodySchema.safeParse({
      ...validInput,
      employeeId: 'not-an-id',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing reason', () => {
    const { reason: _r, ...withoutReason } = validInput;
    const result = manualAdjustmentBodySchema.safeParse(withoutReason);
    expect(result.success).toBe(false);
  });

  it('rejects invalid effectiveDate format', () => {
    const result = manualAdjustmentBodySchema.safeParse({
      ...validInput,
      effectiveDate: '01-03-2026',
    });
    expect(result.success).toBe(false);
  });
});
