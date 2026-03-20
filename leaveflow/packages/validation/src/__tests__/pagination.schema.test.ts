import { describe, it, expect } from 'vitest';
import { paginationQuerySchema, dateRangeQuerySchema } from '../pagination.schema.js';

describe('paginationQuerySchema', () => {
  it('parses string query params to numbers', () => {
    const result = paginationQuerySchema.safeParse({ page: '2', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('defaults page to 1 and limit to 20', () => {
    const result = paginationQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('defaults sortOrder to desc', () => {
    const result = paginationQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortOrder).toBe('desc');
    }
  });

  it('accepts asc and desc for sortOrder', () => {
    const asc = paginationQuerySchema.safeParse({ sortOrder: 'asc' });
    const desc = paginationQuerySchema.safeParse({ sortOrder: 'desc' });
    expect(asc.success).toBe(true);
    expect(desc.success).toBe(true);
  });

  it('rejects limit greater than 100', () => {
    const result = paginationQuerySchema.safeParse({ limit: '101' });
    expect(result.success).toBe(false);
  });

  it('rejects page less than 1', () => {
    const result = paginationQuerySchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid sortOrder', () => {
    const result = paginationQuerySchema.safeParse({ sortOrder: 'random' });
    expect(result.success).toBe(false);
  });
});

describe('dateRangeQuerySchema', () => {
  it('accepts valid date range', () => {
    const result = dateRangeQuerySchema.safeParse({
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('accepts same-day range', () => {
    const result = dateRangeQuerySchema.safeParse({
      startDate: '2026-06-01',
      endDate: '2026-06-01',
    });
    expect(result.success).toBe(true);
  });

  it('rejects endDate before startDate', () => {
    const result = dateRangeQuerySchema.safeParse({
      startDate: '2026-12-31',
      endDate: '2026-01-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('endDate');
    }
  });

  it('rejects invalid date format', () => {
    const result = dateRangeQuerySchema.safeParse({
      startDate: '01/01/2026',
      endDate: '12/31/2026',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing dates', () => {
    const result = dateRangeQuerySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
