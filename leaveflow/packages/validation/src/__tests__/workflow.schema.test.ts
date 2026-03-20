import { describe, it, expect } from 'vitest';
import {
  workflowStepSchema,
  createWorkflowBodySchema,
} from '../workflow.schema.js';

const VALID_OBJECT_ID = '64f2a1b3c4d5e6f7a8b9c0d1';

describe('workflowStepSchema', () => {
  const validStep = {
    order: 0,
    approverType: 'role_direct_manager' as const,
  };

  it('accepts a minimal valid step', () => {
    const result = workflowStepSchema.safeParse(validStep);
    expect(result.success).toBe(true);
  });

  it('defaults timeoutHours to 48', () => {
    const result = workflowStepSchema.safeParse(validStep);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timeoutHours).toBe(48);
    }
  });

  it('defaults escalationAction to remind', () => {
    const result = workflowStepSchema.safeParse(validStep);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.escalationAction).toBe('remind');
    }
  });

  it('requires approverUserId when approverType is specific_user', () => {
    const result = workflowStepSchema.safeParse({
      ...validStep,
      approverType: 'specific_user',
      approverUserId: null,
    });
    expect(result.success).toBe(false);
  });

  it('accepts specific_user with valid approverUserId', () => {
    const result = workflowStepSchema.safeParse({
      ...validStep,
      approverType: 'specific_user',
      approverUserId: VALID_OBJECT_ID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid approverType', () => {
    const result = workflowStepSchema.safeParse({ ...validStep, approverType: 'anyone' });
    expect(result.success).toBe(false);
  });
});

describe('createWorkflowBodySchema', () => {
  const validInput = {
    name: 'Standard Approval',
    steps: [
      {
        order: 0,
        approverType: 'role_direct_manager',
      },
    ],
  };

  it('accepts valid workflow', () => {
    const result = createWorkflowBodySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('trims workflow name', () => {
    const result = createWorkflowBodySchema.safeParse({
      ...validInput,
      name: '  Standard Approval  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Standard Approval');
    }
  });

  it('rejects empty steps array', () => {
    const result = createWorkflowBodySchema.safeParse({ ...validInput, steps: [] });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = createWorkflowBodySchema.safeParse({ steps: validInput.steps });
    expect(result.success).toBe(false);
  });
});
