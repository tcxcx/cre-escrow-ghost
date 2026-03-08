import { describe, test, expect, beforeAll } from 'bun:test';
import { executePrivateTransfer, getPrivateBalance, getShieldedAddress } from './index';

// Set required env vars for tests
beforeAll(() => {
  process.env.ACE_API_URL = 'https://convergence2026-token-api.cldev.cloud';
  process.env.ACE_VAULT_ADDRESS = '0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13';
  process.env.USDG_TOKEN_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
  process.env.POLICY_ENGINE_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  process.env.TREASURY_WALLET_ID = 'test-treasury-wallet-id';
  process.env.TREASURY_WALLET_ADDRESS = '0x5555555555555555555555555555555555555555';
});

describe('executor', () => {
  test('executePrivateTransfer is exported', () => {
    expect(typeof executePrivateTransfer).toBe('function');
  });

  test('getPrivateBalance is exported', () => {
    expect(typeof getPrivateBalance).toBe('function');
  });

  test('getShieldedAddress is exported', () => {
    expect(typeof getShieldedAddress).toBe('function');
  });
});
