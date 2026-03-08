/**
 * Private transfer executor.
 *
 * Orchestrates: compliance check -> sign -> CRE API -> response.
 */

import { createLogger } from '@bu/logger';
import { getUsdgTokenAddress } from '@bu/env/ace';
import { checkCompliance } from '../compliance/index';
import { signWithCircleDcw, type CircleSdk } from '../signer/index';
import {
  buildPrivateTransferTypedData,
  buildBalancesTypedData,
  buildShieldedAddressTypedData,
} from '../eip712/index';
import {
  executePrivateTransfer as apiTransfer,
  queryBalances,
  generateShieldedAddress,
} from '../client/index';
import type {
  PrivateTransferResponse,
  PrivateBalanceResponse,
  ShieldedAddressResponse,
} from '@bu/types/private-transfer';

const logger = createLogger({ prefix: 'private-transfer:executor' });

export interface TransferParams {
  sdk: CircleSdk;
  walletId: string;         // circle_wallet_id for EIP-712 signing
  walletAddress: string;    // wallet_address (account in CRE API)
  recipient: string;
  amount: string;
  flags?: string[];
}

/**
 * Execute a private transfer with compliance checks.
 */
export async function executePrivateTransfer(
  params: TransferParams,
): Promise<PrivateTransferResponse> {
  const { sdk, walletId, walletAddress, recipient, amount, flags = [] } = params;
  const usdgAddress = getUsdgTokenAddress();
  const amountWei = String(Math.round(parseFloat(amount) * 1e6));

  logger.info('Executing private transfer', { sender: walletAddress, recipient, amount });

  // Step 1: Compliance check (eth_call, zero gas)
  const compliance = await checkCompliance(walletAddress, recipient, usdgAddress, amountWei);
  if (!compliance.allowed) {
    logger.warn('Transfer rejected by compliance', {
      reason: compliance.reason,
      policy: compliance.policy,
    });
    return {
      success: false,
      error: `Compliance rejected: ${compliance.reason}`,
      code: 'COMPLIANCE_REJECTED',
    };
  }

  // Step 2: Sign the transfer request
  const typedData = buildPrivateTransferTypedData(
    walletAddress,
    recipient,
    usdgAddress,
    amountWei,
    flags,
  );

  let auth: string;
  try {
    auth = await signWithCircleDcw(sdk, walletId, typedData);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message, code: 'SIGNING_FAILED' };
  }

  // Step 3: Submit to CRE API
  try {
    const result = await apiTransfer(
      walletAddress,
      recipient,
      usdgAddress,
      amountWei,
      flags,
      typedData.message.timestamp as number,
      auth,
    );

    return {
      success: result.success,
      transferId: result.transferId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message, code: 'API_ERROR' };
  }
}

/**
 * Query private balance for a user.
 */
export async function getPrivateBalance(
  sdk: CircleSdk,
  walletId: string,
  walletAddress: string,
): Promise<PrivateBalanceResponse> {
  const usdgAddress = getUsdgTokenAddress();

  try {
    const typedData = buildBalancesTypedData(walletAddress);
    const auth = await signWithCircleDcw(sdk, walletId, typedData);
    const result = await queryBalances(
      walletAddress,
      typedData.message.timestamp as number,
      auth,
    );

    const rawBalance = result.balances[usdgAddress] ?? '0';
    const formatted = (parseInt(rawBalance, 10) / 1e6).toFixed(2);

    return {
      success: true,
      balances: result.balances,
      formattedBalance: `${formatted} USDg`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, balances: {}, error: message };
  }
}

/**
 * Generate a shielded receiving address.
 */
export async function getShieldedAddress(
  sdk: CircleSdk,
  walletId: string,
  walletAddress: string,
): Promise<ShieldedAddressResponse> {
  try {
    const typedData = buildShieldedAddressTypedData(walletAddress);
    const auth = await signWithCircleDcw(sdk, walletId, typedData);
    const result = await generateShieldedAddress(
      walletAddress,
      typedData.message.timestamp as number,
      auth,
    );

    return { success: true, shieldedAddress: result.shieldedAddress };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
