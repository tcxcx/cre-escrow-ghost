/**
 * Withdraw flow unit tests.
 *
 * Mocks all external deps (Circle SDK, CRE API, viem, teller, etc.)
 * but lets the real pipeline executor and BigInt amount parser run.
 */
import { describe, test, expect, beforeAll, beforeEach, mock } from 'bun:test';

// ── Shared mock state ────────────────────────────────────────
let mockUsdcBalance = 0n;
const mockCreateContractExecution = mock(() =>
  Promise.resolve({ data: { id: 'tx-mock-id' } }),
);
const mockRedeemUsyc = mock((_sdk: unknown, _amount: string) => Promise.resolve('teller-tx-id'));

// ── mock.module() — BEFORE importing module under test ───────

mock.module('@bu/logger', () => ({
  createLogger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));

mock.module('@bu/env/ace', () => ({
  getUsdgTokenAddress: () => '0xUSDG',
  getUsdcAddress: () => '0xUSDC',
  getAceVaultAddress: () => '0xVAULT',
  getTreasuryWalletId: () => 'treasury-wallet-id',
  getTreasuryWalletAddress: () => '0xTREASURY',
  getAceApiUrl: () => 'https://test-api',
  getAceChainId: () => 11155111,
}));

mock.module('../eip712/index', () => ({
  buildWithdrawTypedData: () => ({
    types: { Withdraw: [] },
    primaryType: 'Withdraw',
    domain: {},
    message: { timestamp: 1700000000 },
  }),
}));

mock.module('../client/index', () => ({
  requestWithdrawal: () =>
    Promise.resolve({ ticket: 'ticket-abc-123', expiresAt: '2026-01-01T00:00:00Z' }),
}));

mock.module('../signer/index', () => ({
  signWithCircleDcw: () => Promise.resolve('0xSIGNATURE'),
  getCircleSdk: () => Promise.resolve({}),
}));

mock.module('@bu/treasury-yield/teller', () => ({
  redeem: (sdk: unknown, amount: string) => mockRedeemUsyc(sdk, amount),
}));

mock.module('../pipeline/tx', () => ({
  waitForTransaction: () => Promise.resolve(),
}));

// Mock KYC gate — always passes in withdraw tests
mock.module('../kyc/index', () => ({
  kycGate: {
    name: 'kyc-gate',
    execute: () => Promise.resolve({
      step: 'kyc-gate',
      timestamp: 1700000000,
      detail: 'kyc verified',
    }),
  },
  KycPendingError: class extends Error {
    verificationType: string;
    personaInquiryUrl: string;
    constructor(type: string, url: string) {
      super(`KYC required: ${type}`);
      this.verificationType = type;
      this.personaInquiryUrl = url;
    }
  },
}));

// Mock CCTP bridge — always skips in withdraw tests
mock.module('../cctp/index', () => ({
  cctpBridgeOut: {
    name: 'cctp-bridge-out',
    execute: () => Promise.resolve({
      step: 'cctp-bridge-out',
      timestamp: 1700000000,
      detail: 'same-chain -- skipped',
    }),
  },
}));

// Mock reserves attestation — always succeeds
mock.module('../reserves/index', () => ({
  attestReserves: {
    name: 'attest-reserves',
    execute: () => Promise.resolve({
      step: 'attest-reserves',
      timestamp: 1700000000,
      detail: 'ratio: 1.250000',
    }),
  },
}));

mock.module('viem', () => ({
  createPublicClient: () => ({
    readContract: async () => mockUsdcBalance,
  }),
  http: () => ({}),
  parseAbi: (input: unknown) => input,
}));

mock.module('viem/chains', () => ({
  sepolia: { id: 11155111, name: 'sepolia' },
}));

// ── Import module under test AFTER mocks ─────────────────────
import { executeWithdraw, type WithdrawParams } from './index';

// ── Helpers ──────────────────────────────────────────────────

function makeSdk() {
  return {
    signTypedData: mock(() =>
      Promise.resolve({ data: { signature: '0xSIG' } }),
    ),
    createContractExecutionTransaction: mockCreateContractExecution,
    getTransaction: mock(() =>
      Promise.resolve({ data: { transaction: { state: 'COMPLETE' } } }),
    ),
  } as unknown as WithdrawParams['sdk'];
}

function baseParams(overrides?: Partial<WithdrawParams>): WithdrawParams {
  return {
    sdk: makeSdk(),
    teamId: 'team-1',
    amount: '100.00',
    walletId: 'wallet-1',
    walletAddress: '0xUSER',
    walletChainId: 11155111,
    kycStatus: 'approved',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe('withdraw', () => {
  beforeEach(() => {
    mockCreateContractExecution.mockClear();
    mockRedeemUsyc.mockClear();
    // Default: treasury has plenty of USDC (200 USDC in 6-decimal bigint)
    mockUsdcBalance = 200_000_000n;
  });

  test('happy path — enough USDC, no USYC redeem', async () => {
    const result = await executeWithdraw(baseParams());

    expect(result.success).toBe(true);
    // 3 SDK contract calls: vault-redeem, burn-usdg, transfer-usdc
    expect(mockCreateContractExecution).toHaveBeenCalledTimes(3);
    // No teller redeem since treasury has sufficient USDC
    expect(mockRedeemUsyc).not.toHaveBeenCalled();
  });

  test('auto-redeem USYC when treasury USDC is insufficient', async () => {
    // Treasury has only 30 USDC, withdrawing 100 USDC → deficit = 70 USDC
    mockUsdcBalance = 30_000_000n;

    const result = await executeWithdraw(baseParams());

    expect(result.success).toBe(true);
    // Teller redeem called with the deficit (100_000_000 - 30_000_000 = 70_000_000)
    expect(mockRedeemUsyc).toHaveBeenCalledTimes(1);
    const [, deficit] = (mockRedeemUsyc.mock.calls[0] as unknown as [unknown, string]);
    expect(deficit).toBe('70000000');
  });

  test('BigInt precision — "50.00" produces exactly 50000000', async () => {
    // Use amount "50.00" and check the amountStr passed to vault-redeem
    const result = await executeWithdraw(baseParams({ amount: '50.00' }));

    expect(result.success).toBe(true);
    // The vault-redeem call is the first createContractExecutionTransaction call
    // Check that abiParameters contains the correct amount string
    const firstCall = mockCreateContractExecution.mock.calls[0] as unknown as [
      Record<string, unknown>,
    ];
    const params = firstCall[0] as { abiParameters: string[] };
    // abiParameters = [usdgAddress, amountStr, ticket] for vault-redeem
    expect(params.abiParameters[1]).toBe('50000000');
  });

  test('success structure — returns withdrawalId = ticket', async () => {
    const result = await executeWithdraw(baseParams());

    expect(result.success).toBe(true);
    expect(result.withdrawalId).toBe('ticket-abc-123');
    expect(result.estimatedTime).toBe('~2 minutes');
    expect(result.error).toBeUndefined();
  });

  test('cross-chain estimatedTime — "~15 minutes" when destinationChain is set', async () => {
    const result = await executeWithdraw(
      baseParams({ destinationChain: 'ethereum' }),
    );

    expect(result.success).toBe(true);
    expect(result.estimatedTime).toBe('~15 minutes');
  });

  test('auto-redeem with zero treasury balance', async () => {
    mockUsdcBalance = 0n;

    const result = await executeWithdraw(baseParams({ amount: '250.50' }));

    expect(result.success).toBe(true);
    expect(mockRedeemUsyc).toHaveBeenCalledTimes(1);
    const [, deficit] = (mockRedeemUsyc.mock.calls[0] as unknown as [unknown, string]);
    // Full amount = 250_500_000, treasury = 0 → deficit = 250_500_000
    expect(deficit).toBe('250500000');
  });
});
