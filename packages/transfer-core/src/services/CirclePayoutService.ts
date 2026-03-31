/**
 * Circle Payout Service
 *
 * Handles USDC payouts to external wallet addresses via Circle SDK.
 * Used by the BUFI Network payout auto-processing scheduler.
 *
 * This service wraps the existing CircleSDKExecutor pattern to send
 * USDC from the company's Circle-managed wallet to partner wallets.
 *
 * Environment variables:
 * - CIRCLE_API_KEY: Circle API key (via @bu/circle)
 * - CIRCLE_ENTITY_SECRET: Circle entity secret (via @bu/circle)
 * - BUFI_PAYOUT_WALLET_ID: Circle wallet ID for payout source
 */

import { createCircleSdk } from '@bu/circle';
import { createLogger } from '@bu/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger({ prefix: 'transfer-core:circle-payout', theme: 'minimal' });
import {
  CHAIN_ID_TO_CIRCLE_NAME,
  getCircleNameFromChainId,
} from '../constants/ChainMappings';
import { getBufiPayoutWalletId } from '@bu/env/fee';
import {
  CHAIN_IDS_TO_USDC_ADDRESSES,
} from '../constants/chain-constants';
import { getCircleBlockchainName } from '../utils/blockchain';

export interface CirclePayoutParams {
  /** USD amount to send */
  amount: number;
  /** Recipient wallet address (EVM 0x...) */
  walletAddress: string;
  /** Internal chain ID (from PayoutConfig) */
  chainId: number;
  /** Unique key to prevent duplicate transfers (e.g., 'payout-{id}') */
  idempotencyKey: string;
}

export interface CirclePayoutResult {
  /** Circle transaction/transfer ID */
  transferId: string;
  /** Blockchain tx hash (may be null initially — Circle populates async) */
  txHash: string | null;
  /** Circle transfer status */
  status: string;
}

/**
 * Circle SDK's CreateTransferTransactionInput uses a discriminated union where
 * {walletId} sets blockchain?: never, but TokenAddressAndBlockchainInput also
 * declares blockchain?: TokenBlockchain. The intersection makes blockchain
 * unsatisfiable (string & never). We must pass both walletId and
 * blockchain+tokenAddress for correct API behavior, so we define a local
 * request type that matches what the API actually accepts.
 */
interface CirclePayoutTransactionRequest {
  idempotencyKey: string;
  walletId: string;
  destinationAddress: string;
  tokenAddress: string;
  blockchain: string;
  amount: string[];
  fee: { type: string; config: { feeLevel: string } };
}

/** The actual parameter type Circle SDK expects — used to shorten casts */
type CircleCreateTxInput = Parameters<ReturnType<typeof createCircleSdk>['createTransaction']>[0];

interface CircleTransactionResponseData {
  id?: string;
  state?: string;
  txHash?: string;
  errorCode?: string;
  errorReason?: string;
  errorDetails?: string;
}

export class CirclePayoutService {
  private payoutWalletId: string;

  constructor() {
    const walletId = getBufiPayoutWalletId();
    if (!walletId) {
      throw new Error('BUFI_PAYOUT_WALLET_ID environment variable is required');
    }
    this.payoutWalletId = walletId;
  }

  /**
   * Map internal chain ID to Circle blockchain name.
   */
  mapChainToCircle(chainId: number): string {
    const circleName = getCircleNameFromChainId(chainId);
    if (!circleName) {
      throw new Error(`Unsupported chain ID for Circle: ${chainId}. Supported: ${Object.keys(CHAIN_ID_TO_CIRCLE_NAME).join(', ')}`);
    }
    return circleName;
  }

  /**
   * Send a USDC payout to an external wallet address.
   *
   * Uses the company's Circle-managed wallet as the source.
   * Idempotency keys prevent duplicate transfers.
   */
  async sendPayout(params: CirclePayoutParams): Promise<CirclePayoutResult> {
    const { amount, walletAddress, chainId, idempotencyKey } = params;

    // Validate inputs
    if (amount <= 0) {
      throw new Error(`Invalid payout amount: ${amount}`);
    }
    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      throw new Error(`Invalid wallet address: ${walletAddress}`);
    }

    const blockchain = getCircleBlockchainName(chainId);
    const tokenAddress = CHAIN_IDS_TO_USDC_ADDRESSES[chainId];
    if (!tokenAddress) {
      throw new Error(`No USDC token address for chain ID: ${chainId}`);
    }

    const formattedAmount = amount.toFixed(2);

    logger.info('Initiating Circle transfer', { amount: formattedAmount, blockchain, wallet: walletAddress.slice(0, 10) });

    const circleSdk = createCircleSdk();

    // Use the same createTransaction pattern as CircleSDKExecutor
    // See CirclePayoutTransactionRequest docs above for why the cast is necessary
    const circleRequest: CirclePayoutTransactionRequest = {
      idempotencyKey,
      walletId: this.payoutWalletId,
      destinationAddress: walletAddress,
      tokenAddress,
      blockchain,
      amount: [formattedAmount],
      fee: {
        type: 'level',
        config: {
          feeLevel: 'HIGH',
        },
      },
    };

    try {
      const response = await circleSdk.createTransaction(circleRequest as unknown as CircleCreateTxInput);
      const responseData = response.data as unknown as CircleTransactionResponseData | undefined;

      // Check for immediate denial
      if (responseData?.state === 'DENIED' || responseData?.state === 'FAILED') {
        const errorMsg = responseData.errorReason || responseData.errorDetails || `Transaction denied: ${responseData.errorCode || 'Unknown'}`;
        logger.error('Circle transfer denied', { errorMsg });
        throw new Error(errorMsg);
      }

      if (!responseData?.id) {
        throw new Error('Circle transaction response missing ID');
      }

      const transferId = responseData.id;
      const txHash = responseData.txHash || null;

      logger.info('Circle transfer initiated', { transferId, status: responseData.state });

      return {
        transferId,
        txHash,
        status: responseData.state || 'INITIATED',
      };
    } catch (error: unknown) {
      // Extract meaningful error from Circle API response
      const apiError = error as { response?: { data?: { message?: string } } };
      if (apiError.response?.data?.message) {
        throw new Error(`Circle API error: ${apiError.response.data.message}`);
      }
      throw error;
    }
  }

  /**
   * Check the status of a previously initiated transfer.
   *
   * Use this to poll for tx hash after sendPayout returns.
   * Circle populates the blockchain tx hash asynchronously.
   */
  async getTransferStatus(transferId: string): Promise<CirclePayoutResult> {
    const circleSdk = createCircleSdk();

    try {
      const response = await circleSdk.getTransaction({ id: transferId });

      if (!response.data) {
        throw new Error(`Transfer not found: ${transferId}`);
      }

      const data = response.data as unknown as CircleTransactionResponseData;

      return {
        transferId: data.id || transferId,
        txHash: data.txHash || null,
        status: data.state || 'UNKNOWN',
      };
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      if (apiError.response?.data?.message) {
        throw new Error(`Circle API error: ${apiError.response.data.message}`);
      }
      throw error;
    }
  }
}
