import { BaseProtocolExecutor } from '../base';
import type {
  GasEstimate,
  Protocol,
  TransferParams,
  TransferResult,
  WalletInfo,
} from '@bu/types/transfer-execution';
import { createCircleSdk } from '@bu/circle/client';
import { createLogger } from '@bu/logger';
import { v4 as uuidv4 } from 'uuid';
import { assertSufficientBalance, InsufficientBalanceError, generateFeeIdempotencyKey } from '../../safety';
// 🔥 DRY: Import centralized constants
import {
  CHAIN_IDS_TO_USDC_ADDRESSES,
  CHAIN_IDS_TO_EURC_ADDRESSES,
} from '../../constants/chain-constants';
import { getCircleBlockchainName } from '../../utils/blockchain';

const logger = createLogger({ prefix: 'transfer-core:circle-sdk', theme: 'minimal' });

/**
 * Circle SDK's CreateTransferTransactionInput uses a discriminated union where
 * {walletId} sets blockchain?: never, but TokenAddressAndBlockchainInput also
 * declares blockchain?: TokenBlockchain. The intersection makes blockchain
 * unsatisfiable (string & never). We must pass both walletId and
 * blockchain+tokenAddress for correct API behavior, so we define a local
 * request type that matches what the API actually accepts.
 */
interface CircleTransactionRequest {
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

/** Error properties returned by Circle when a transaction is DENIED/FAILED */
interface CircleTransactionErrorData {
  state?: string;
  id?: string;
  errorCode?: string;
  errorReason?: string;
  errorDetails?: string;
}

/**
 * Circle SDK Executor for same-chain transfers
 * Migrated from handleSameChainTransferUnified for DRY reuse
 * Used by both /api/transfers and /api/payroll
 */
export class CircleSDKExecutor extends BaseProtocolExecutor {
  async estimate(params: TransferParams, wallet: WalletInfo): Promise<GasEstimate> {
    // For Circle SDK same-chain transfers, gas is minimal since Circle handles it
    return {
      protocol: 'circle-sdk',
      totalGasCost: 0n, // Circle SDK handles gas internally
      gasPrice: 0n,
      estimatedGas: 50000n, // Minimal estimate for same-chain
      available: params.fromChainId === params.toChainId, // Only for same-chain
    };
  }

  async execute({
    wallet,
    estimate,
    ...params
  }: TransferParams & { wallet: WalletInfo; estimate: GasEstimate }): Promise<TransferResult> {
    // Declare variables outside try block so they're accessible in catch block
    let actualWalletId: string = '';
    let blockchain: string = '';
    let tokenAddress: string | null = null;
    let formattedAmount: string = '';
    let walletBalance: { tokenBalances?: Array<{ token?: { symbol?: string; blockchain?: string }; amount?: string }> } | null = null;
    let tokenBalanceAmount: string | null = null;

    try {
      // Validate same-chain transfer
      if (params.fromChainId !== params.toChainId) {
        throw new Error('CircleSDKExecutor only supports same-chain transfers');
      }

      // Initialize Circle SDK client
      const circleSdk = createCircleSdk();

      // Get blockchain name early for reuse
      blockchain = getCircleBlockchainName(params.fromChainId);

      // Determine wallet ID to use
      actualWalletId = wallet.walletId;

      logger.info('Transfer execution started', {
        walletId: actualWalletId,
        walletAddress: wallet.walletAddress,
        amount: params.amount,
        tokenSymbol: params.tokenSymbol,
        recipientAddress: params.recipientAddress,
        fromChainId: params.fromChainId,
        toChainId: params.toChainId,
      });

      // Fetch wallet balance before transfer for validation and debugging
      try {
        const balanceResponse = await circleSdk.getWalletTokenBalance({ 
          id: actualWalletId, 
          includeAll: false 
        });
        walletBalance = balanceResponse.data ?? null;
        
        // Extract balance for the specific token being transferred
        const tokenBalances = walletBalance?.tokenBalances || [];
        const tokenBalance = tokenBalances.find(
          (balance) =>
            balance.token?.symbol === params.tokenSymbol &&
            balance.token?.blockchain === blockchain
        );
        tokenBalanceAmount = tokenBalance?.amount || null;
        
        logger.info('Wallet balance fetched', {
          walletId: actualWalletId,
          tokenSymbol: params.tokenSymbol,
          blockchain,
          tokenBalanceAmount,
          requestedAmount: params.amount,
          hasSufficientBalance: tokenBalanceAmount 
            ? parseFloat(tokenBalanceAmount) >= parseFloat(params.amount)
            : 'unknown (balance not found)',
          tokenBalances: tokenBalances.map((b) => ({
            symbol: b.token?.symbol,
            blockchain: b.token?.blockchain,
            amount: b.amount,
          })),
        });

        // Blocking balance check — reject early before hitting Circle API
        if (tokenBalanceAmount) {
          try {
            assertSufficientBalance({
              balance: parseFloat(tokenBalanceAmount),
              amount: parseFloat(params.amount),
              platformFee: params.platformFee,
              tokenSymbol: params.tokenSymbol,
              walletId: actualWalletId,
            });
            logger.info('Balance check passed', {
              available: tokenBalanceAmount,
              totalRequired: parseFloat(params.amount) + (params.platformFee ? parseFloat(params.platformFee) : 0),
            });
          } catch (e) {
            if (e instanceof InsufficientBalanceError) {
              return {
                success: false,
                protocol: 'circle-sdk',
                error: `Insufficient balance: need ${e.details.totalRequired.toFixed(2)} ${params.tokenSymbol}, have ${e.details.available.toFixed(2)} (shortfall: ${e.details.shortfall.toFixed(2)})`,
              };
            }
            throw e;
          }
        } else {
          logger.warn('Token balance not found in wallet', {
            walletId: actualWalletId,
            tokenSymbol: params.tokenSymbol,
            blockchain,
            availableTokens: tokenBalances.map((b) => b.token?.symbol).filter(Boolean),
            note: 'Balance may be zero or token not found in wallet',
          });
        }
      } catch (balanceError: unknown) {
        logger.warn('Failed to fetch wallet balance (non-fatal)', {
          error: balanceError instanceof Error ? balanceError.message : String(balanceError),
          walletId: actualWalletId,
          note: 'Will proceed with transfer - Circle API will validate balance',
        });
        // Non-fatal: continue with provided ID
      }

      // Get token address for the blockchain
      tokenAddress = this.getTokenAddress(params);
      if (!tokenAddress) {
        throw new Error(
          `Unsupported currency ${params.tokenSymbol} on chain ${params.fromChainId}`
        );
      }

      // Generate idempotency key for Circle API
      const idempotencyKey = uuidv4();
      formattedAmount = params.amount;
      
      // Log amount format for debugging
      logger.debug('Amount format', {
        rawAmount: params.amount,
        formattedAmount,
        amountType: typeof formattedAmount,
        tokenSymbol: params.tokenSymbol,
        note: 'Circle API expects human-readable format (e.g., "1" for 1 USDC, not "1000000")',
      });

      // Validate destination address

      // Validate destination address is not the same as source wallet
      if (params.recipientAddress.toLowerCase() === wallet.walletAddress.toLowerCase()) {
        logger.error('Self-transfer detected', {
          sourceWallet: wallet.walletAddress,
          destinationAddress: params.recipientAddress
        });
        throw new Error('Cannot transfer to the same wallet address');
      }

      // Basic Ethereum address validation
      if (!params.recipientAddress.startsWith('0x') || params.recipientAddress.length !== 42) {
        logger.error('Invalid destination address format', {
          address: params.recipientAddress,
          startsWith0x: params.recipientAddress.startsWith('0x'),
          length: params.recipientAddress.length
        });
        throw new Error('Invalid destination address format');
      }

      const circleRequest = {
        idempotencyKey,
        walletId: actualWalletId,
        destinationAddress: params.recipientAddress,
        tokenAddress,
        blockchain, // Required when using tokenAddress (API requirement, despite TypeScript types)
        amount: [formattedAmount],
        fee: {
          type: 'level',
          config: {
            feeLevel: 'HIGH',
          },
        },
      };

      // Log full Circle API request payload (excluding sensitive data)
      logger.debug('Circle API request payload', {
        idempotencyKey,
        walletId: actualWalletId?.substring(0, 10) + '...',
        destinationAddress: params.recipientAddress?.substring(0, 10) + '...',
        tokenAddress,
        blockchain,
        amount: circleRequest.amount,
        feeLevel: circleRequest.fee.config.feeLevel,
        walletBalance: walletBalance ? {
          hasBalance: !!walletBalance,
          tokenCount: walletBalance?.tokenBalances?.length || 0,
          tokenBalanceAmount,
          hasSufficientBalance: tokenBalanceAmount 
            ? parseFloat(tokenBalanceAmount) >= parseFloat(formattedAmount)
            : 'unknown',
        } : 'not fetched',
      });

      // See CircleTransactionRequest docs above for why this cast is necessary
      const response = await circleSdk.createTransaction(circleRequest as unknown as CircleCreateTxInput);

      // Check if Circle immediately denied the transaction
      if (response.data?.state === 'DENIED' || response.data?.state === 'FAILED') {
        const responseData = response.data as unknown as CircleTransactionErrorData;

        logger.error('Circle API denied transaction', {
          state: responseData.state,
          errorCode: responseData.errorCode,
          errorReason: responseData.errorReason,
          errorDetails: responseData.errorDetails,
          walletId: actualWalletId,
          amount: formattedAmount,
          tokenSymbol: params.tokenSymbol,
          walletBalance: walletBalance ? JSON.stringify(walletBalance, null, 2) : 'not fetched',
        });

        return {
          success: false,
          protocol: 'circle-sdk',
          error: responseData.errorReason || responseData.errorDetails || `Transaction denied by Circle: ${responseData.errorCode || 'Unknown error'}`,
        };
      }

      if (response.data && response.data.id) {
        // Collect platform fee as a separate transaction (non-blocking)
        let feeTransactionId: string | undefined;
        let feeCollectionStatus: 'collected' | 'failed' | 'skipped' = 'skipped';

        if (params.platformFee && params.feeRecipientAddress) {
          const feeAmount = parseFloat(params.platformFee);
          if (feeAmount > 0) {
            const feeIdempotencyKey = generateFeeIdempotencyKey(
              actualWalletId,
              params.recipientAddress,
              params.platformFee,
              params.amount,
            );
            try {
              // Same discriminated union conflict as main transaction (see CircleTransactionRequest)
              const feeRequest: CircleTransactionRequest = {
                idempotencyKey: feeIdempotencyKey,
                walletId: actualWalletId,
                destinationAddress: params.feeRecipientAddress,
                tokenAddress: tokenAddress!,
                blockchain,
                amount: [params.platformFee],
                fee: { type: 'level', config: { feeLevel: 'HIGH' } },
              };
              const feeResponse = await circleSdk.createTransaction(feeRequest as unknown as CircleCreateTxInput);
              feeTransactionId = feeResponse?.data?.id;
              feeCollectionStatus = 'collected';
              logger.info('Platform fee collected', {
                fee: params.platformFee,
                feeTransactionId,
                recipient: params.feeRecipientAddress.substring(0, 10) + '...',
              });
            } catch (feeError: unknown) {
              // Fee failure must NOT fail the main transfer
              feeCollectionStatus = 'failed';
              logger.error('Failed to collect platform fee', {
                message: feeError instanceof Error ? feeError.message : String(feeError),
                fee: params.platformFee,
              });
              // Fire-and-forget: queue for retry via Trigger.dev
              import('@bu/trigger/helpers/trigger-fee-retry')
                .then(({ triggerFeeRetry }) => triggerFeeRetry({
                  walletId: actualWalletId,
                  feeRecipientAddress: params.feeRecipientAddress!,
                  tokenAddress: tokenAddress!,
                  blockchain: blockchain!,
                  feeAmount: params.platformFee!,
                  idempotencyKey: feeIdempotencyKey,
                  originalTransactionId: response.data!.id,
                }))
                .catch((retryErr) => logger.error('Failed to queue fee retry', {
                  message: retryErr instanceof Error ? retryErr.message : String(retryErr),
                }));
            }
          }
        }

        return {
          success: true,
          protocol: 'circle-sdk',
          transactionHash: response.data.id,
          sourceTransactionHash: response.data.id,
          gasUsed: '0', // Circle SDK handles gas internally
          feeTransactionId,
          feeCollectionStatus,
        };
      } else {
        logger.error('Circle response missing ID');
        throw new Error('Circle transaction response missing ID');
      }
    } catch (error: unknown) {
      // Extract response data from Circle SDK errors (Axios-style error shape)
      const circleError = error as { message?: string; response?: { status?: number; data?: { code?: string; message?: string } } };

      logger.error('Same-chain transfer error', {
        message: circleError?.message,
        hasResponse: !!circleError?.response,
        responseStatus: circleError?.response?.status,
      });

      // Log detailed Circle API error information
      if (circleError.response?.data) {
        logger.error('Circle API Error Details', {
          code: circleError.response.data.code,
          message: circleError.response.data.message,
          walletId: actualWalletId,
          amount: formattedAmount,
          tokenSymbol: params.tokenSymbol,
          blockchain,
        });
      }

      // Extract meaningful error message
      let errorMessage = 'Failed to process same-chain transfer';
      if (circleError.response?.data?.message) {
        errorMessage = circleError.response.data.message;

        // Add helpful context for insufficient balance errors
        if (errorMessage.toLowerCase().includes('insufficient') ||
            errorMessage.toLowerCase().includes('asset amount owned')) {
          logger.error('Insufficient balance detected', {
            requestedAmount: formattedAmount,
            tokenSymbol: params.tokenSymbol,
            walletId: actualWalletId,
          });
        }
      } else if (circleError.message) {
        errorMessage = circleError.message;
      }

      return {
        success: false,
        protocol: 'circle-sdk',
        error: errorMessage,
      };
    }
  }

  /**
   * Get token address for the given parameters
   */
  private getTokenAddress(params: TransferParams): string | null {
    if (params.tokenSymbol === 'USDC') {
      return CHAIN_IDS_TO_USDC_ADDRESSES[params.fromChainId] || null;
    } else if (params.tokenSymbol === 'EURC') {
      return CHAIN_IDS_TO_EURC_ADDRESSES[params.fromChainId] || null;
    }
    return null;
  }
}
