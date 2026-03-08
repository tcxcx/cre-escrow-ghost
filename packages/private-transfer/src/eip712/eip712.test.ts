import { describe, test, expect, beforeAll } from 'bun:test';
import {
  buildBalancesTypedData,
  buildPrivateTransferTypedData,
  buildWithdrawTypedData,
  buildShieldedAddressTypedData,
  buildTransactionsTypedData,
  getCreDomain,
} from './index';

// Set required env vars for tests
beforeAll(() => {
  process.env.ACE_API_URL = 'https://convergence2026-token-api.cldev.cloud';
  process.env.ACE_VAULT_ADDRESS = '0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13';
  process.env.USDG_TOKEN_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
  process.env.POLICY_ENGINE_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
});

const TEST_ACCOUNT = '0x1111111111111111111111111111111111111111';
const TEST_TOKEN = '0x2222222222222222222222222222222222222222';

describe('getCreDomain', () => {
  test('returns correct domain for Sepolia', () => {
    const domain = getCreDomain();
    expect(domain.name).toBe('CompliantPrivateTokenDemo');
    expect(domain.version).toBe('0.0.1');
    expect(domain.chainId).toBe(11155111);
    expect(domain.verifyingContract).toBe('0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13');
  });
});

describe('buildBalancesTypedData', () => {
  test('returns correct structure', () => {
    const data = buildBalancesTypedData(TEST_ACCOUNT);
    expect(data.primaryType).toBe('Retrieve Balances');
    expect(data.types['Retrieve Balances']).toHaveLength(2);
    expect(data.message.account).toBe(TEST_ACCOUNT);
    expect(typeof data.message.timestamp).toBe('number');
  });
});

describe('buildPrivateTransferTypedData', () => {
  test('includes all fields with flags', () => {
    const recipient = '0x3333333333333333333333333333333333333333';
    const data = buildPrivateTransferTypedData(
      TEST_ACCOUNT, recipient, TEST_TOKEN, '1000000', ['hide-sender']
    );
    expect(data.primaryType).toBe('Private Token Transfer');
    expect(data.types['Private Token Transfer']).toHaveLength(6);
    expect(data.message.sender).toBe(TEST_ACCOUNT);
    expect(data.message.recipient).toBe(recipient);
    expect(data.message.flags).toEqual(['hide-sender']);
  });

  test('defaults to empty flags', () => {
    const data = buildPrivateTransferTypedData(
      TEST_ACCOUNT, TEST_ACCOUNT, TEST_TOKEN, '1000000'
    );
    expect(data.message.flags).toEqual([]);
  });
});

describe('buildWithdrawTypedData', () => {
  test('returns correct structure', () => {
    const data = buildWithdrawTypedData(TEST_ACCOUNT, TEST_TOKEN, '500000');
    expect(data.primaryType).toBe('Withdraw Tokens');
    expect(data.types['Withdraw Tokens']).toHaveLength(4);
    expect(data.message.amount).toBe('500000');
  });
});

describe('buildShieldedAddressTypedData', () => {
  test('returns correct structure', () => {
    const data = buildShieldedAddressTypedData(TEST_ACCOUNT);
    expect(data.primaryType).toBe('Generate Shielded Address');
    expect(data.types['Generate Shielded Address']).toHaveLength(2);
  });
});

describe('buildTransactionsTypedData', () => {
  test('defaults to limit 10 and empty cursor', () => {
    const data = buildTransactionsTypedData(TEST_ACCOUNT);
    expect(data.message.limit).toBe(10);
    expect(data.message.cursor).toBe('');
  });

  test('accepts custom limit and cursor', () => {
    const data = buildTransactionsTypedData(TEST_ACCOUNT, 25, 'abc123');
    expect(data.message.limit).toBe(25);
    expect(data.message.cursor).toBe('abc123');
  });
});
