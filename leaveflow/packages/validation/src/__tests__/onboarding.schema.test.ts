import { describe, it, expect } from 'vitest';
import {
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
  onboardingStep5Schema,
  onboardingStep6Schema,
} from '../onboarding.schema.js';

const WORK_WEEK = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
};

describe('onboardingStep1Schema', () => {
  const valid = {
    timezone: 'Europe/London',
    fiscalYearStartMonth: 1,
    workWeek: WORK_WEEK,
    country: 'GB',
  };

  it('accepts valid step 1 input', () => {
    expect(onboardingStep1Schema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid country code', () => {
    expect(onboardingStep1Schema.safeParse({ ...valid, country: 'GBR' }).success).toBe(false);
    expect(onboardingStep1Schema.safeParse({ ...valid, country: 'gb' }).success).toBe(false);
  });

  it('rejects fiscalYearStartMonth outside 1-12', () => {
    expect(onboardingStep1Schema.safeParse({ ...valid, fiscalYearStartMonth: 0 }).success).toBe(false);
    expect(onboardingStep1Schema.safeParse({ ...valid, fiscalYearStartMonth: 13 }).success).toBe(false);
  });
});

describe('onboardingStep2Schema', () => {
  const valid = {
    leaveTypes: [
      {
        name: 'Vacation',
        isPaid: true,
        requiresApproval: true,
        defaultEntitlementDays: 25,
      },
    ],
  };

  it('accepts valid step 2 input', () => {
    expect(onboardingStep2Schema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty leaveTypes array', () => {
    expect(onboardingStep2Schema.safeParse({ leaveTypes: [] }).success).toBe(false);
  });

  it('rejects leave type with missing isPaid', () => {
    const result = onboardingStep2Schema.safeParse({
      leaveTypes: [{ name: 'Test', requiresApproval: true, defaultEntitlementDays: 10 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('onboardingStep3Schema', () => {
  it('accepts template-based step 3', () => {
    const result = onboardingStep3Schema.safeParse({
      templateId: 'template_simple',
      workflowName: 'Default Approval Workflow',
      customSteps: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts custom steps step 3', () => {
    const result = onboardingStep3Schema.safeParse({
      templateId: null,
      workflowName: 'Custom Workflow',
      customSteps: [
        {
          order: 0,
          approverType: 'role_direct_manager',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects when both templateId and customSteps are null/missing', () => {
    const result = onboardingStep3Schema.safeParse({
      workflowName: 'Missing Everything',
      templateId: null,
      customSteps: null,
    });
    expect(result.success).toBe(false);
  });
});

describe('onboardingStep4Schema', () => {
  it('accepts valid teams', () => {
    const result = onboardingStep4Schema.safeParse({
      teams: [{ name: 'Engineering' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty teams array', () => {
    expect(onboardingStep4Schema.safeParse({ teams: [] }).success).toBe(false);
  });
});

describe('onboardingStep5Schema', () => {
  it('accepts valid employees', () => {
    const result = onboardingStep5Schema.safeParse({
      employees: [
        {
          email: 'bob@acme.com',
          name: 'Bob Smith',
          startDate: '2026-01-01',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty employees array (optional step)', () => {
    expect(onboardingStep5Schema.safeParse({ employees: [] }).success).toBe(true);
  });

  it('rejects employee with invalid email', () => {
    const result = onboardingStep5Schema.safeParse({
      employees: [{ email: 'bad-email', name: 'Bob', startDate: '2026-01-01' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('onboardingStep6Schema', () => {
  const valid = {
    countryCode: 'GB',
    year: 2026,
  };

  it('accepts valid step 6 input', () => {
    expect(onboardingStep6Schema.safeParse(valid).success).toBe(true);
  });

  it('defaults customHolidays to empty array', () => {
    const result = onboardingStep6Schema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customHolidays).toEqual([]);
    }
  });

  it('accepts custom holidays', () => {
    const result = onboardingStep6Schema.safeParse({
      ...valid,
      customHolidays: [{ date: '2026-12-24', name: 'Company Day Off' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid country code', () => {
    expect(onboardingStep6Schema.safeParse({ ...valid, countryCode: 'GBR' }).success).toBe(false);
  });

  it('rejects year before 2020', () => {
    expect(onboardingStep6Schema.safeParse({ ...valid, year: 2019 }).success).toBe(false);
  });
});
