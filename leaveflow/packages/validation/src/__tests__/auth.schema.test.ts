import { describe, it, expect } from 'vitest';
import { registerBodySchema, loginBodySchema } from '../auth.schema.js';

describe('registerBodySchema', () => {
  const validInput = {
    companyName: 'Acme Corp',
    adminEmail: 'alice@acme.com',
    adminName: 'Alice Chen',
    password: 'Password1',
    timezone: 'Europe/London',
  };

  it('accepts valid registration input', () => {
    const result = registerBodySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('defaults timezone to UTC when omitted', () => {
    const input = { ...validInput };
    const { timezone: _tz, ...withoutTz } = input;
    const result = registerBodySchema.safeParse(withoutTz);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timezone).toBe('UTC');
    }
  });

  it('trims and lowercases adminEmail', () => {
    const result = registerBodySchema.safeParse({
      ...validInput,
      adminEmail: '  ALICE@ACME.COM  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.adminEmail).toBe('alice@acme.com');
    }
  });

  it('trims companyName and adminName', () => {
    const result = registerBodySchema.safeParse({
      ...validInput,
      companyName: '  Acme Corp  ',
      adminName: '  Alice Chen  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.companyName).toBe('Acme Corp');
      expect(result.data.adminName).toBe('Alice Chen');
    }
  });

  it('rejects invalid email', () => {
    const result = registerBodySchema.safeParse({ ...validInput, adminEmail: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase letter', () => {
    const result = registerBodySchema.safeParse({ ...validInput, password: 'password1' });
    expect(result.success).toBe(false);
  });

  it('rejects password without number', () => {
    const result = registerBodySchema.safeParse({ ...validInput, password: 'PasswordOnly' });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 chars', () => {
    const result = registerBodySchema.safeParse({ ...validInput, password: 'P1ssw' });
    expect(result.success).toBe(false);
  });

  it('rejects companyName shorter than 2 chars', () => {
    const result = registerBodySchema.safeParse({ ...validInput, companyName: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = registerBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('loginBodySchema', () => {
  it('accepts a non-empty idToken', () => {
    const result = loginBodySchema.safeParse({ idToken: 'some.firebase.token' });
    expect(result.success).toBe(true);
  });

  it('rejects missing idToken', () => {
    const result = loginBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty string idToken', () => {
    const result = loginBodySchema.safeParse({ idToken: '' });
    expect(result.success).toBe(false);
  });
});
