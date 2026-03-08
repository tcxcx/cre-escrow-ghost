/**
 * CRE API HTTP client.
 *
 * Sends authenticated requests to the Chainlink CRE private token API.
 * All endpoints require EIP-712 signed "auth" field.
 */

import { postJson } from '@bu/http-client';
import { createLogger } from '@bu/logger';
import { getAceApiUrl } from '@bu/env/ace';
import type {
  CreBalancesResponse,
  CreWithdrawResponse,
  CreShieldedAddressResponse,
  CrePrivateTransferResponse,
} from '@bu/types/private-transfer';

const logger = createLogger({ prefix: 'private-transfer:client' });

/**
 * Query private balances for an account.
 */
export async function queryBalances(
  account: string,
  timestamp: number,
  auth: string,
): Promise<CreBalancesResponse> {
  const url = `${getAceApiUrl()}/balances`;
  logger.info('Querying private balances', { account });
  const { data } = await postJson<CreBalancesResponse>(url, { account, timestamp, auth });
  return data;
}

/**
 * Execute a private transfer between accounts.
 */
export async function executePrivateTransfer(
  account: string,
  recipient: string,
  token: string,
  amount: string,
  flags: string[],
  timestamp: number,
  auth: string,
): Promise<CrePrivateTransferResponse> {
  const url = `${getAceApiUrl()}/private-transfer`;
  logger.info('Executing private transfer', { account, recipient, amount });
  const { data } = await postJson<CrePrivateTransferResponse>(url, {
    account, recipient, token, amount, flags, timestamp, auth,
  });
  return data;
}

/**
 * Request a withdrawal ticket from CRE.
 * The ticket must be redeemed on-chain within 1 hour.
 */
export async function requestWithdrawal(
  account: string,
  token: string,
  amount: string,
  timestamp: number,
  auth: string,
): Promise<CreWithdrawResponse> {
  const url = `${getAceApiUrl()}/withdraw`;
  logger.info('Requesting withdrawal ticket', { account, token, amount });
  const { data } = await postJson<CreWithdrawResponse>(url, { account, token, amount, timestamp, auth });
  return data;
}

/**
 * Generate a shielded (unlinkable) receiving address.
 */
export async function generateShieldedAddress(
  account: string,
  timestamp: number,
  auth: string,
): Promise<CreShieldedAddressResponse> {
  const url = `${getAceApiUrl()}/shielded-address`;
  logger.info('Generating shielded address', { account });
  const { data } = await postJson<CreShieldedAddressResponse>(url, { account, timestamp, auth });
  return data;
}
