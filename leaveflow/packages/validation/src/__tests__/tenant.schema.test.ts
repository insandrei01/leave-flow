import { describe, it, expect } from 'vitest';
import { updateTenantBodySchema, tenantSettingsBodySchema } from '../tenant.schema.js';

describe('updateTenantBodySchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateTenantBodySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid partial update', () => {
    const result = updateTenantBodySchema.safeParse({ timezone: 'Europe/London' });
    expect(result.success).toBe(true);
  });

  it('rejects fiscalYearStartMonth outside 1-12', () => {
    const result = updateTenantBodySchema.safeParse({ fiscalYearStartMonth: 13 });
    expect(result.success).toBe(false);
  });

  it('rejects minimumCoveragePercent outside 0-100', () => {
    const tooHigh = updateTenantBodySchema.safeParse({ minimumCoveragePercent: 101 });
    const tooLow = updateTenantBodySchema.safeParse({ minimumCoveragePercent: -1 });
    expect(tooHigh.success).toBe(false);
    expect(tooLow.success).toBe(false);
  });

  it('trims name whitespace', () => {
    const result = updateTenantBodySchema.safeParse({ name: '  Acme Corp  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Acme Corp');
    }
  });

  it('rejects extra unknown fields (strict)', () => {
    const result = updateTenantBodySchema.safeParse({ unknownField: 'value' });
    expect(result.success).toBe(false);
  });
});

describe('tenantSettingsBodySchema', () => {
  const validSettings = {
    timezone: 'America/New_York',
    fiscalYearStartMonth: 4,
    workWeek: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
  };

  it('accepts valid settings', () => {
    const result = tenantSettingsBodySchema.safeParse(validSettings);
    expect(result.success).toBe(true);
  });

  it('defaults coverageMinimumPercent to 50', () => {
    const result = tenantSettingsBodySchema.safeParse(validSettings);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.coverageMinimumPercent).toBe(50);
    }
  });

  it('defaults locale to en', () => {
    const result = tenantSettingsBodySchema.safeParse(validSettings);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.locale).toBe('en');
    }
  });

  it('rejects missing timezone', () => {
    const { timezone: _tz, ...rest } = validSettings;
    const result = tenantSettingsBodySchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
