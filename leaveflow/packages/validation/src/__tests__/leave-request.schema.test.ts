import { describe, it, expect } from 'vitest';
import {
  createLeaveRequestBodySchema,
  cancelLeaveRequestBodySchema,
  validateLeaveRequestBodySchema,
} from '../leave-request.schema.js';

const VALID_OBJECT_ID = '64f2a1b3c4d5e6f7a8b9c0d1';

describe('createLeaveRequestBodySchema', () => {
  const validInput = {
    leaveTypeId: VALID_OBJECT_ID,
    startDate: '2026-04-07',
    endDate: '2026-04-11',
    halfDayStart: false,
    halfDayEnd: false,
    reason: 'Spring break',
  };

  it('accepts valid input', () => {
    const result = createLeaveRequestBodySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('defaults halfDayStart and halfDayEnd to false', () => {
    const { halfDayStart: _s, halfDayEnd: _e, ...rest } = validInput;
    const result = createLeaveRequestBodySchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.halfDayStart).toBe(false);
      expect(result.data.halfDayEnd).toBe(false);
    }
  });

  it('allows null reason', () => {
    const result = createLeaveRequestBodySchema.safeParse({ ...validInput, reason: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBeNull();
    }
  });

  it('rejects invalid leaveTypeId', () => {
    const result = createLeaveRequestBodySchema.safeParse({
      ...validInput,
      leaveTypeId: 'not-an-object-id',
    });
    expect(result.success).toBe(false);
  });

  it('rejects endDate before startDate', () => {
    const result = createLeaveRequestBodySchema.safeParse({
      ...validInput,
      startDate: '2026-04-11',
      endDate: '2026-04-07',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('endDate');
    }
  });

  it('accepts same-day request (startDate === endDate)', () => {
    const result = createLeaveRequestBodySchema.safeParse({
      ...validInput,
      startDate: '2026-04-07',
      endDate: '2026-04-07',
    });
    expect(result.success).toBe(true);
  });

  it('rejects reason longer than 500 characters', () => {
    const result = createLeaveRequestBodySchema.safeParse({
      ...validInput,
      reason: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = createLeaveRequestBodySchema.safeParse({
      ...validInput,
      startDate: '07-04-2026',
    });
    expect(result.success).toBe(false);
  });
});

describe('cancelLeaveRequestBodySchema', () => {
  it('accepts empty body (reason is optional)', () => {
    const result = cancelLeaveRequestBodySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBeNull();
    }
  });

  it('accepts an optional reason', () => {
    const result = cancelLeaveRequestBodySchema.safeParse({ reason: 'Plans changed' });
    expect(result.success).toBe(true);
  });
});

describe('validateLeaveRequestBodySchema', () => {
  const validQuery = {
    leaveTypeId: VALID_OBJECT_ID,
    startDate: '2026-04-07',
    endDate: '2026-04-11',
  };

  it('accepts valid query params', () => {
    const result = validateLeaveRequestBodySchema.safeParse(validQuery);
    expect(result.success).toBe(true);
  });

  it('rejects endDate before startDate', () => {
    const result = validateLeaveRequestBodySchema.safeParse({
      ...validQuery,
      startDate: '2026-04-11',
      endDate: '2026-04-07',
    });
    expect(result.success).toBe(false);
  });
});
