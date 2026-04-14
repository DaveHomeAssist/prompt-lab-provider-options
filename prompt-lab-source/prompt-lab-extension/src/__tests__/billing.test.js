import { describe, expect, it } from 'vitest';
import { describeBillingStatus, normalizeBillingState } from '../lib/billing.js';

describe('billing copy', () => {
  it('uses signed in account copy when Clerk identity is present', () => {
    const state = normalizeBillingState({
      plan: 'pro',
      status: 'active',
      clerkUserId: 'user_123',
      customerEmail: 'user@example.com',
    });

    expect(describeBillingStatus(state)).toBe('Prompt Lab Pro is active for this signed in account.');
  });

  it('uses billing email copy when no Clerk identity is present', () => {
    const state = normalizeBillingState({
      plan: 'pro',
      status: 'active',
      customerEmail: 'user@example.com',
    });

    expect(describeBillingStatus(state)).toBe('Prompt Lab Pro is active for this billing email.');
  });

  it('uses neutral unpaid copy', () => {
    const state = normalizeBillingState({
      plan: 'pro',
      status: 'unpaid',
      customerEmail: 'user@example.com',
    });

    expect(describeBillingStatus(state)).toBe('The payment processor reports this subscription as unpaid.');
  });
});
