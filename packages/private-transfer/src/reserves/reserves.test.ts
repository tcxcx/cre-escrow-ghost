import { describe, test, expect, beforeEach, mock } from 'bun:test';

let mockUsdcBalance = 500_000_000n;
let mockUsycBalance = 1_000_000n;
let mockUsdgSupply = 400_000_000n;
const mockFetchJson = mock(() => Promise.resolve({}));
let readContractCallCount = 0;

mock.module('@bu/logger', () => ({
  createLogger: () => ({
    info: () => {}, warn: () => {}, error: () => {}, debug: () => {},
  }),
}));

mock.module('@bu/env/ace', () => ({
  getUsdcAddress: () => '0xUSDC',
  getUsycTokenAddress: () => '0xUSYC',
  getUsdgTokenAddress: () => '0xUSDG',
  getTreasuryWalletAddress: () => '0xTREASURY',
  getAceApiUrl: () => 'https://test-api',
}));

mock.module('@bu/treasury-yield/oracle', () => ({
  getUsycPrice: () => Promise.resolve({ price: 105_000_000n, decimals: 8, updatedAt: 1700000000 }),
  usycToUsdc: (amount: bigint, price: bigint) => (amount * price) / 100_000_000n,
}));

mock.module('@bu/http-client', () => ({
  fetchJson: () => mockFetchJson(),
}));

mock.module('viem', () => ({
  createPublicClient: () => ({
    readContract: async () => {
      const call = readContractCallCount++;
      if (call === 0) return mockUsdcBalance;
      if (call === 1) return mockUsycBalance;
      if (call === 2) return mockUsdgSupply;
      return 0n;
    },
  }),
  http: () => ({}),
  parseAbi: (input: unknown) => input,
}));

mock.module('viem/chains', () => ({
  sepolia: { id: 11155111, name: 'sepolia' },
}));

import { attestReserves, type ReservesContext } from './index';

describe('attestReserves', () => {
  beforeEach(() => {
    mockUsdcBalance = 500_000_000n;
    mockUsycBalance = 1_000_000n;
    mockUsdgSupply = 400_000_000n;
    readContractCallCount = 0;
    mockFetchJson.mockClear();
  });

  test('healthy reserves -> writes attestation', async () => {
    const ctx: ReservesContext = { triggerType: 'deposit' };
    const result = await attestReserves.execute(ctx);
    expect(result.step).toBe('attest-reserves');
    expect(result.detail).toContain('ratio:');
    expect(mockFetchJson).toHaveBeenCalledTimes(1);
  });

  test('non-throwing on API failure', async () => {
    mockFetchJson.mockImplementationOnce(() => Promise.reject(new Error('API down')));
    const ctx: ReservesContext = { triggerType: 'withdraw' };
    const result = await attestReserves.execute(ctx);
    expect(result.step).toBe('attest-reserves');
    expect(result.detail).toContain('failed');
  });

  test('zero USDg supply -> ratio is 0', async () => {
    mockUsdgSupply = 0n;
    const ctx: ReservesContext = { triggerType: 'deposit' };
    const result = await attestReserves.execute(ctx);
    expect(result.detail).toContain('ratio: 0.000000');
  });
});
