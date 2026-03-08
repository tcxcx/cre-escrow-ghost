import { describe, test, expect, beforeEach, mock } from 'bun:test';

const mockCreateContractExecution = mock(() =>
  Promise.resolve({ data: { id: 'cctp-tx-mock' } }),
);

mock.module('@bu/logger', () => ({
  createLogger: () => ({
    info: () => {}, warn: () => {}, error: () => {}, debug: () => {},
  }),
}));

mock.module('@bu/env/ace', () => ({
  getAceChainId: () => 11155111,
}));

mock.module('./attestation', () => ({
  waitForCctpAttestation: () =>
    Promise.resolve({ message: '0xMSG', attestation: '0xATTEST' }),
}));

mock.module('../pipeline/tx', () => ({
  waitForTransaction: () => Promise.resolve(),
}));

mock.module('viem', () => ({
  keccak256: () => '0xHASH',
  toHex: (input: unknown) => String(input),
}));

import { cctpBridgeIn, cctpBridgeOut, type CctpContext } from './index';

function makeSdk() {
  return {
    createContractExecutionTransaction: mockCreateContractExecution,
    getTransaction: mock(() =>
      Promise.resolve({ data: { transaction: { state: 'COMPLETE' } } }),
    ),
  } as unknown as CctpContext['sdk'];
}

function baseCtx(overrides?: Partial<CctpContext>): CctpContext {
  return {
    sdk: makeSdk(),
    walletId: 'user-wallet',
    walletAddress: '0xUSER',
    treasuryWalletId: 'treasury-wallet',
    treasuryAddress: '0xTREASURY',
    amountStr: '100000000',
    ...overrides,
  };
}

describe('cctpBridgeIn', () => {
  beforeEach(() => { mockCreateContractExecution.mockClear(); });

  test('same-chain → skips', async () => {
    const ctx = baseCtx({ sourceChainId: 11155111 });
    const result = await cctpBridgeIn.execute(ctx);
    expect(result.step).toBe('cctp-bridge-in');
    expect(result.detail).toContain('skipped');
    expect(mockCreateContractExecution).not.toHaveBeenCalled();
  });

  test('no sourceChainId → skips', async () => {
    const result = await cctpBridgeIn.execute(baseCtx());
    expect(result.detail).toContain('skipped');
  });

  test('cross-chain → executes approve + burn + receive', async () => {
    const ctx = baseCtx({ sourceChainId: 421614 });
    const result = await cctpBridgeIn.execute(ctx);
    expect(result.step).toBe('cctp-bridge-in');
    expect(result.detail).toContain('bridged from chain 421614');
    expect(mockCreateContractExecution).toHaveBeenCalledTimes(3);
  });

  test('unsupported chain → throws', async () => {
    const ctx = baseCtx({ sourceChainId: 999999 });
    expect(cctpBridgeIn.execute(ctx)).rejects.toThrow('CCTP not supported');
  });
});

describe('cctpBridgeOut', () => {
  beforeEach(() => { mockCreateContractExecution.mockClear(); });

  test('same-chain → skips', async () => {
    const ctx = baseCtx({ destinationChainId: 11155111 });
    const result = await cctpBridgeOut.execute(ctx);
    expect(result.detail).toContain('skipped');
    expect(mockCreateContractExecution).not.toHaveBeenCalled();
  });

  test('no destinationChainId → skips', async () => {
    const result = await cctpBridgeOut.execute(baseCtx());
    expect(result.detail).toContain('skipped');
  });

  test('cross-chain → executes approve + burn + receive', async () => {
    const ctx = baseCtx({ destinationChainId: 84532 });
    const result = await cctpBridgeOut.execute(ctx);
    expect(result.step).toBe('cctp-bridge-out');
    expect(result.detail).toContain('bridged to chain 84532');
    expect(mockCreateContractExecution).toHaveBeenCalledTimes(3);
  });
});
