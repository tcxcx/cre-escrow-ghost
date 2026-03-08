/**
 * EIP-712 typed data builders for CRE API authentication.
 *
 * Every CRE endpoint requires a signed EIP-712 message over
 * a domain tied to the ACE Vault. Circle DCW signTypedData
 * consumes the output of these builders.
 *
 * Reference: apps/cre/Compliant-Private-Transfer-Demo-main/api-scripts/src/
 */

import type { Eip712TypedData, CreEip712Domain } from '@bu/types/private-transfer';
import { getAceVaultAddress, getAceChainId } from '@bu/env/ace';

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------

export function getCreDomain(): CreEip712Domain {
  return {
    name: 'CompliantPrivateTokenDemo',
    version: '0.0.1',
    chainId: getAceChainId(),
    verifyingContract: getAceVaultAddress() as `0x${string}`,
  };
}

// ---------------------------------------------------------------------------
// Typed Data Builders
// ---------------------------------------------------------------------------

function currentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Build EIP-712 typed data for POST /balances
 */
export function buildBalancesTypedData(account: string): Eip712TypedData {
  return {
    types: {
      'Retrieve Balances': [
        { name: 'account', type: 'address' },
        { name: 'timestamp', type: 'uint256' },
      ],
    },
    primaryType: 'Retrieve Balances',
    domain: getCreDomain(),
    message: { account, timestamp: currentTimestamp() },
  };
}

/**
 * Build EIP-712 typed data for POST /shielded-address
 */
export function buildShieldedAddressTypedData(account: string): Eip712TypedData {
  return {
    types: {
      'Generate Shielded Address': [
        { name: 'account', type: 'address' },
        { name: 'timestamp', type: 'uint256' },
      ],
    },
    primaryType: 'Generate Shielded Address',
    domain: getCreDomain(),
    message: { account, timestamp: currentTimestamp() },
  };
}

/**
 * Build EIP-712 typed data for POST /private-transfer
 */
export function buildPrivateTransferTypedData(
  sender: string,
  recipient: string,
  token: string,
  amount: string,
  flags: string[] = [],
): Eip712TypedData {
  return {
    types: {
      'Private Token Transfer': [
        { name: 'sender', type: 'address' },
        { name: 'recipient', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'flags', type: 'string[]' },
        { name: 'timestamp', type: 'uint256' },
      ],
    },
    primaryType: 'Private Token Transfer',
    domain: getCreDomain(),
    message: { sender, recipient, token, amount, flags, timestamp: currentTimestamp() },
  };
}

/**
 * Build EIP-712 typed data for POST /withdraw
 */
export function buildWithdrawTypedData(
  account: string,
  token: string,
  amount: string,
): Eip712TypedData {
  return {
    types: {
      'Withdraw Tokens': [
        { name: 'account', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' },
      ],
    },
    primaryType: 'Withdraw Tokens',
    domain: getCreDomain(),
    message: { account, token, amount, timestamp: currentTimestamp() },
  };
}

/**
 * Build EIP-712 typed data for POST /transactions
 */
export function buildTransactionsTypedData(
  account: string,
  limit: number = 10,
  cursor: string = '',
): Eip712TypedData {
  return {
    types: {
      'List Transactions': [
        { name: 'account', type: 'address' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'cursor', type: 'string' },
        { name: 'limit', type: 'uint256' },
      ],
    },
    primaryType: 'List Transactions',
    domain: getCreDomain(),
    message: { account, timestamp: currentTimestamp(), cursor, limit },
  };
}
