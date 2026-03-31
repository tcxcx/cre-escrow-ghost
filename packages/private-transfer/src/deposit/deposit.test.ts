/**
 * Unit tests for the Ghost Mode deposit flow.
 *
 * Mocks all external dependencies; lets pipeline/execute and pipeline/amount
 * run for real so we test the actual step orchestration and BigInt parsing.
 */
import { describe, test, expect, mock, beforeEach } from 'bun:test';

// ── Track call order across all mocked externals ─────────────────────

let callOrder: string[] = [];
let sdkCalls: Array<{ method: string; args: unknown }> = [];
let subscribeCalls: Array<{ sdk: unknown; amount: string }> = [];
let complianceResult: { allowed: boolean; reason?: string; policy?: string } = {
  allowed: true,
};

// ── Mock external deps BEFORE importing module under test ────────────

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
  getAceChainId: () => 11155111,
  getAceApiUrl: () => 'https://test-api.example.com',
  getPolicyEngineAddress: () => '0xPOLICY',
}));

mock.module('../compliance/index', () => ({
  checkCompliance: async () => {
    callOrder.push('checkCompliance');
    if (!complianceResult.allowed) {
      return complianceResult;
    }
    return { allowed: true };
  },
}));

mock.module('../eip712/index', () => ({
  buildBalancesTypedData: (account: string) => ({
    types: { 'Retrieve Balances': [] },
    primaryType: 'Retrieve Balances',
    domain: {},
    message: { account, timestamp: 1234567890 },
  }),
}));

mock.module('../client/index', () => ({
  queryBalances: async () => {
    callOrder.push('queryBalances');
    return {
      balances: { '0xUSDG': '500000000' },
    };
  },
}));

mock.module('../signer/index', () => ({
  signWithCircleDcw: async () => {
    callOrder.push('signWithCircleDcw');
    return '0xSIGNATURE';
  },
}));

mock.module('@bu/treasury-yield/teller', () => ({
  subscribe: async (sdk: unknown, amount: string) => {
    callOrder.push('subscribe');
    subscribeCalls.push({ sdk, amount });
    return 'teller-tx-id';
  },
}));

mock.module('../pipeline/tx', () => ({
  waitForTransaction: async () => {
    // no-op, instant resolve
  },
}));

// Mock KYC gate — always passes in deposit tests
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

// Mock CCTP bridge — always skips in deposit tests
mock.module('../cctp/index', () => ({
  cctpBridgeIn: {
    name: 'cctp-bridge-in',
    execute: () => Promise.resolve({
      step: 'cctp-bridge-in',
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

// ── Now import the module under test ─────────────────────────────────

import { executeDeposit, type DepositParams } from './index';

// ── Helpers ──────────────────────────────────────────────────────────

function makeSdk(overrides?: Partial<Record<string, unknown>>) {
  const createContractExecutionTransaction = mock(async (params: Record<string, unknown>) => {
    const walletId = params.walletId as string;
    const fnSig = params.abiFunctionSignature as string;
    callOrder.push(`createContractExecution:${fnSig}`);
    sdkCalls.push({ method: 'createContractExecutionTransaction', args: params });
    return { data: { id: `tx-${fnSig}` } };
  });

  return {
    createContractExecutionTransaction,
    signTypedData: mock(async () => ({ data: { signature: '0xSIG' } })),
    getTransaction: mock(async () => ({
      data: { transaction: { state: 'COMPLETE' } },
    })),
    ...overrides,
  } as unknown as DepositParams['sdk'];
}

function makeParams(overrides?: Partial<DepositParams>): DepositParams {
  return {
    sdk: makeSdk(),
    teamId: 'team-123',
    amount: '100.00',
    walletId: 'user-wallet-id',
    walletAddress: '0xUSER',
    walletChainId: 11155111,
    kycStatus: 'approved',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

beforeEach(() => {
  callOrder = [];
  sdkCalls = [];
  subscribeCalls = [];
  complianceResult = { allowed: true };
});

describe('deposit flow', () => {
  test('happy path — all SDK calls fire in correct order with correct wallets', async () => {
    const params = makeParams();
    const result = await executeDeposit(params);

    expect(result.success).toBe(true);
    expect(result.depositId).toBeDefined();
    expect(result.privateBalance).toBe('500.00');

    // Verify step order
    expect(callOrder[0]).toBe('checkCompliance');
    expect(callOrder).toContain('subscribe');

    // Verify createContractExecution calls order and wallets
    const txCalls = sdkCalls.filter(
      (c) => c.method === 'createContractExecutionTransaction',
    );

    // 1. transfer(address,uint256) — user wallet
    const transferCall = txCalls.find(
      (c) => (c.args as Record<string, unknown>).abiFunctionSignature === 'transfer(address,uint256)',
    );
    expect(transferCall).toBeDefined();
    expect((transferCall!.args as Record<string, unknown>).walletId).toBe('user-wallet-id');

    // 2. mint(address,uint256) — treasury wallet
    const mintCall = txCalls.find(
      (c) => (c.args as Record<string, unknown>).abiFunctionSignature === 'mint(address,uint256)',
    );
    expect(mintCall).toBeDefined();
    expect((mintCall!.args as Record<string, unknown>).walletId).toBe('treasury-wallet-id');

    // 3. approve(address,uint256) — treasury wallet
    const approveCall = txCalls.find(
      (c) => (c.args as Record<string, unknown>).abiFunctionSignature === 'approve(address,uint256)',
    );
    expect(approveCall).toBeDefined();
    expect((approveCall!.args as Record<string, unknown>).walletId).toBe('treasury-wallet-id');

    // 4. deposit(address,uint256) — treasury wallet
    const depositCall = txCalls.find(
      (c) => (c.args as Record<string, unknown>).abiFunctionSignature === 'deposit(address,uint256)',
    );
    expect(depositCall).toBeDefined();
    expect((depositCall!.args as Record<string, unknown>).walletId).toBe('treasury-wallet-id');

    // Total: 4 contract execution calls (transfer + mint + approve + deposit)
    expect(txCalls.length).toBe(4);

    // Compliance must come before any contract execution
    const complianceIdx = callOrder.indexOf('checkCompliance');
    const firstTxIdx = callOrder.findIndex((c) => c.startsWith('createContractExecution'));
    expect(complianceIdx).toBeLessThan(firstTxIdx);
  });

  test('compliance rejection — fails BEFORE any createContractExecutionTransaction calls', async () => {
    complianceResult = {
      allowed: false,
      reason: 'Address not on AllowList',
      policy: 'AllowListPolicy',
    };

    const params = makeParams();
    const result = await executeDeposit(params);

    expect(result.success).toBe(false);
    expect(result.error).toContain('[compliance-check]');
    expect(result.error).toContain('Compliance rejected');

    // No contract execution calls should have happened
    const txCalls = sdkCalls.filter(
      (c) => c.method === 'createContractExecutionTransaction',
    );
    expect(txCalls.length).toBe(0);

    // Subscribe should not have been called
    expect(subscribeCalls.length).toBe(0);
  });

  test('BigInt precision — "100.10" produces exactly "100100000" (not 100099999)', async () => {
    const params = makeParams({ amount: '100.10' });
    const result = await executeDeposit(params);

    expect(result.success).toBe(true);

    // Verify the amount string passed to SDK calls
    const txCalls = sdkCalls.filter(
      (c) => c.method === 'createContractExecutionTransaction',
    );
    // The transfer call should have the correct amount as abiParameters[1]
    const transferCall = txCalls.find(
      (c) => (c.args as Record<string, unknown>).abiFunctionSignature === 'transfer(address,uint256)',
    );
    expect(transferCall).toBeDefined();
    const abiParams = (transferCall!.args as Record<string, unknown>).abiParameters as string[];
    expect(abiParams[1]).toBe('100100000');

    // Also verify subscribe received the correct amount
    expect(subscribeCalls.length).toBe(1);
    expect(subscribeCalls[0]!.amount).toBe('100100000');
  });

  test('transfer failure — returns error with "[transfer-usdc]" prefix from pipeline', async () => {
    const failSdk = makeSdk();
    // Override createContractExecutionTransaction to fail on transfer
    (failSdk as unknown as Record<string, unknown>).createContractExecutionTransaction =
      mock(async (params: Record<string, unknown>) => {
        const fnSig = params.abiFunctionSignature as string;
        if (fnSig === 'transfer(address,uint256)') {
          throw new Error('Insufficient USDC balance');
        }
        callOrder.push(`createContractExecution:${fnSig}`);
        sdkCalls.push({ method: 'createContractExecutionTransaction', args: params });
        return { data: { id: `tx-${fnSig}` } };
      });

    const params = makeParams({ sdk: failSdk });
    const result = await executeDeposit(params);

    expect(result.success).toBe(false);
    expect(result.error).toContain('[transfer-usdc]');
    expect(result.error).toContain('Insufficient USDC balance');

    // Compliance check should have run
    expect(callOrder).toContain('checkCompliance');

    // Subscribe should NOT have been called (transfer failed before it)
    expect(subscribeCalls.length).toBe(0);
  });

  test('teller subscribe called — verify subscribe() receives the correct amount', async () => {
    const params = makeParams({ amount: '5000.00' });
    const result = await executeDeposit(params);

    expect(result.success).toBe(true);

    // subscribe should have been called exactly once
    expect(subscribeCalls.length).toBe(1);

    // Amount should be 5000 * 10^6 = 5000000000
    expect(subscribeCalls[0]!.amount).toBe('5000000000');

    // subscribe should have received the SDK instance
    expect(subscribeCalls[0]!.sdk).toBe(params.sdk);
  });
});
