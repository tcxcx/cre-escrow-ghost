/**
 * KYC/KYB gate unit tests.
 */
import { describe, test, expect, beforeEach, mock } from 'bun:test';

let mockIsAllowed = true;

mock.module('@bu/logger', () => ({
  createLogger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));

mock.module('@bu/env/ace', () => ({
  getPolicyEngineAddress: () => '0xPOLICY',
}));

mock.module('viem', () => ({
  createPublicClient: () => ({
    readContract: async () => mockIsAllowed,
  }),
  http: () => ({}),
}));

mock.module('viem/chains', () => ({
  sepolia: { id: 11155111, name: 'sepolia' },
}));

import { kycGate, KycPendingError, type KycContext } from './index';

function makeCtx(overrides?: Partial<KycContext>): KycContext {
  return {
    walletAddress: '0xUSER',
    kycStatus: 'approved',
    isTeamWallet: false,
    ...overrides,
  };
}

describe('kycGate', () => {
  beforeEach(() => {
    mockIsAllowed = true;
  });

  test('approved KYC + on AllowList → passes', async () => {
    const ctx = makeCtx({ kycStatus: 'approved' });
    const result = await kycGate.execute(ctx);
    expect(result.step).toBe('kyc-gate');
    expect(result.detail).toBe('kyc verified');
    expect(ctx.pendingKyc).toBeUndefined();
  });

  test('pending KYC → throws KycPendingError', async () => {
    const ctx = makeCtx({ kycStatus: 'pending' });
    try {
      await kycGate.execute(ctx);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(KycPendingError);
      const e = error as KycPendingError;
      expect(e.verificationType).toBe('kyc');
      expect(e.personaInquiryUrl).toContain('withpersona.com');
    }
    expect(ctx.pendingKyc).toBe(true);
    expect(ctx.verificationType).toBe('kyc');
  });

  test('team wallet with no KYB → throws with kyb type', async () => {
    const ctx = makeCtx({
      isTeamWallet: true,
      kybStatus: undefined,
      kycStatus: 'approved',
    });
    try {
      await kycGate.execute(ctx);
      expect(true).toBe(false);
    } catch (error) {
      const e = error as KycPendingError;
      expect(e.verificationType).toBe('kyb');
    }
  });

  test('team wallet with approved KYB → passes', async () => {
    const ctx = makeCtx({
      isTeamWallet: true,
      kybStatus: 'approved',
    });
    const result = await kycGate.execute(ctx);
    expect(result.detail).toBe('kyb verified');
  });

  test('approved but NOT on AllowList → still passes (logs warning)', async () => {
    mockIsAllowed = false;
    const ctx = makeCtx({ kycStatus: 'approved' });
    const result = await kycGate.execute(ctx);
    expect(result.step).toBe('kyc-gate');
  });

  test('declined KYC → throws', async () => {
    const ctx = makeCtx({ kycStatus: 'declined' });
    try {
      await kycGate.execute(ctx);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(KycPendingError);
    }
  });
});
