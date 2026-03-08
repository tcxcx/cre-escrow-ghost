/**
 * Circle DCW signTypedData adapter for CRE API authentication.
 *
 * Wraps Circle's sdk.signTypedData() with the EIP-712 typed data
 * format expected by the CRE API.
 *
 * Pattern: RainWithdrawalService (signTypedData), EarnExecutionService (lazy SDK)
 */

import { createLogger } from '@bu/logger';
import type { Eip712TypedData } from '@bu/types/private-transfer';

const logger = createLogger({ prefix: 'private-transfer:signer' });

/**
 * Circle SDK type — inferred from createCircleSdk() return.
 * Exposes: signTypedData, createContractExecutionTransaction, getTransaction.
 */
export type CircleSdk = Awaited<ReturnType<typeof import('@bu/circle/client').createCircleSdk>>;

/**
 * Lazy-load Circle SDK (same pattern as EarnExecutionService / RainWithdrawalService).
 * Credentials resolved via @bu/env/circle — no process.env.
 */
export async function getCircleSdk(apiKey?: string, entitySecret?: string): Promise<CircleSdk> {
  const { createCircleSdk } = await import('@bu/circle/client');
  return createCircleSdk(apiKey, entitySecret);
}

/**
 * Sign EIP-712 typed data using Circle DCW.
 *
 * Pattern: RainWithdrawalService.signWithdrawal() — same SDK call shape.
 * Circle SDK requires EIP712Domain in types and all values as strings.
 *
 * @param sdk - Circle SDK instance (from getCircleSdk())
 * @param walletId - Circle wallet ID (circle_wallet_id from wallets table)
 * @param typedData - EIP-712 typed data from eip712 builders
 * @returns The hex signature string
 */
export async function signWithCircleDcw(
  sdk: CircleSdk,
  walletId: string,
  typedData: Eip712TypedData,
): Promise<string> {
  logger.info('Signing EIP-712 typed data via Circle DCW', {
    walletId: walletId.substring(0, 10) + '...',
    primaryType: typedData.primaryType,
  });

  // Circle SDK requires EIP712Domain in types (same as Rain service)
  const response = await sdk.signTypedData({
    walletId,
    data: JSON.stringify({
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        ...typedData.types,
      },
      primaryType: typedData.primaryType,
      domain: typedData.domain,
      message: typedData.message,
    }),
  });

  const signature = response.data?.signature;
  if (!signature) {
    throw new Error(
      `Circle DCW signTypedData returned no signature for ${typedData.primaryType}`
    );
  }

  return signature;
}
