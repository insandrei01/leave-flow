import { describe, it, expect } from 'vitest';
import { approveBodySchema, rejectBodySchema, forceApproveBodySchema } from '../approval.schema.js';

describe('approveBodySchema', () => {
  it('accepts an empty body (note is optional)', () => {
    const result = approveBodySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBeNull();
    }
  });

  it('accepts a note comment', () => {
    const result = approveBodySchema.safeParse({ note: 'Looks good to me' });
    expect(result.success).toBe(true);
  });

  it('rejects note longer than 500 characters', () => {
    const result = approveBodySchema.safeParse({ note: 'x'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('trims note whitespace', () => {
    const result = approveBodySchema.safeParse({ note: '  Approved  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBe('Approved');
    }
  });
});

describe('rejectBodySchema', () => {
  it('accepts a reason with 10+ non-whitespace characters', () => {
    const result = rejectBodySchema.safeParse({
      reason: 'Insufficient team coverage during peak period.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a reason with fewer than 10 non-whitespace characters', () => {
    const result = rejectBodySchema.safeParse({ reason: 'Too short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? '';
      expect(msg).toContain('10 non-whitespace');
    }
  });

  it('counts only non-whitespace chars for minimum (BR-022)', () => {
    // 10 non-whitespace chars surrounded by spaces — should pass
    const result = rejectBodySchema.safeParse({ reason: '  1234567890  ' });
    expect(result.success).toBe(true);
  });

  it('rejects missing reason', () => {
    const result = rejectBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects reason longer than 500 characters', () => {
    const result = rejectBodySchema.safeParse({ reason: 'A'.repeat(501) });
    expect(result.success).toBe(false);
  });
});

describe('forceApproveBodySchema', () => {
  it('accepts a non-empty reason', () => {
    const result = forceApproveBodySchema.safeParse({ reason: 'Emergency HR override' });
    expect(result.success).toBe(true);
  });

  it('rejects missing reason', () => {
    const result = forceApproveBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty reason string', () => {
    const result = forceApproveBodySchema.safeParse({ reason: '   ' });
    expect(result.success).toBe(false);
  });
});
