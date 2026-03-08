import {
  createBridgingKit,
  createCircleWalletBridgingAdapter,
  createEthereumBridgingAdapter,
  createSolanaBridgingAdapter,
} from '@bu/circle';
import { getFeeRecipientAddress } from '@bu/fee';
import { createLogger } from '@bu/logger';
import { assertSufficientBalance, InsufficientBalanceError } from '../../safety';
import { getBridgeChainName } from '../../constants/bridge-routes';
import { getEvmRpcConfig } from '../../constants/Chains';
import { getCircleBlockchainName } from '../../utils/blockchain';
import { isRetryableError } from '@circle-fin/bridge-kit';
import type { BridgeChainIdentifier, BridgeResult } from '@circle-fin/bridge-kit';
import type {
  BridgeProgressStep,
  GasEstimate,
  TransferParams,
  TransferResult,
  WalletInfo,
} from '@bu/types/transfer-execution';

/** Circle Wallet adapter — the specific type the SDK's generic constraints require */
type CircleWalletAdapter = ReturnType<typeof createCircleWalletBridgingAdapter>;

/** Union of all adapter types returned by resolveAdapters() */
type BridgingAdapter =
  | CircleWalletAdapter
  | ReturnType<typeof createSolanaBridgingAdapter>
  | ReturnType<typeof createEthereumBridgingAdapter>;

/** BridgeKit instance type for reuse across methods */
type BridgeKitInstance = ReturnType<typeof createBridgingKit>;

/** Payload shape emitted by BridgeKit event handlers */
interface BridgeEventPayload {
  protocol: string;
  version: string;
  method: string;
  values: { name?: string; state?: string; txHash?: string; explorerUrl?: string };
}

const logger = createLogger({ prefix: 'transfer-core:bridge-kit', theme: 'minimal' });

/**
 * Type guard: checks if an unknown error carries a partial BridgeResult shape.
 * Bridge Kit's `retry()` expects a BridgeResult (with `state` and `steps`),
 * which is only available when `bridge()` throws with partial progress attached.
 */
function isBridgeResult(value: unknown): value is BridgeResult {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.state === 'string' &&
    Array.isArray(candidate.steps)
  );
}

/** Extract a human-readable error message from a BridgeResult's failed steps. */
function extractBridgeError(result: BridgeResult): string {
  const failedStep = result.steps?.find(s => s.state === 'error');
  if (failedStep?.errorMessage) return failedStep.errorMessage;
  if (failedStep?.error instanceof Error) return failedStep.error.message;
  if (failedStep) return `Bridge step "${failedStep.name}" failed`;
  return `Bridge transfer ended in state "${result.state}"`;
}

/** Dig into KitError.cause.trace to surface the actual underlying error. */
function extractDeepError(result: BridgeResult): string | undefined {
  const failedStep = result.steps?.find(s => s.state === 'error');
  const err = failedStep?.error;
  if (!err || typeof err !== 'object') return undefined;
  // KitError shape: { cause: { trace: { rawError, reason, ... } } }
  const cause = (err as Record<string, unknown>).cause;
  if (!cause || typeof cause !== 'object') return undefined;
  const trace = (cause as Record<string, unknown>).trace;
  if (!trace || typeof trace !== 'object') return undefined;
  const raw = (trace as Record<string, unknown>).rawError;
  if (raw instanceof Error) return raw.message;
  if (typeof raw === 'string') return raw;
  const reason = (trace as Record<string, unknown>).reason;
  const originalError = (trace as Record<string, unknown>).originalError;
  return (originalError as string) || (reason as string) || JSON.stringify(trace);
}

/** CCTPv2 step names that produce progress events */
const BRIDGE_STEP_NAMES: readonly BridgeProgressStep[] = [
  'approve',
  'burn',
  'fetchAttestation',
  'mint',
  'reAttest',
] as const;

/**
 * BridgeKitExecutor — cross-chain transfers via Circle Bridge Kit.
 *
 * Does NOT extend BaseProtocolExecutor because Bridge Kit handles its own
 * chain interactions internally (no ChainService / ContractService needed).
 */
export class BridgeKitExecutor {
  /**
   * Resolve a validated custom fee config from TransferParams.
   * Shared by both estimate() and execute() to avoid divergent fee logic.
   */
  private resolveCustomFee(
    params: TransferParams,
    chainName: string,
  ): { value: string; recipientAddress: string } | undefined {
    const feeValue = parseFloat(params.platformFee || '0');
    if (!Number.isFinite(feeValue) || feeValue <= 0 || !params.platformFee) {
      if (params.platformFee && !Number.isFinite(feeValue)) {
        logger.error('Invalid platformFee format, skipping fee', {
          platformFee: params.platformFee,
        });
      }
      return undefined;
    }

    const recipientAddress = params.feeRecipientAddress || getFeeRecipientAddress(chainName);
    if (!recipientAddress) {
      logger.warn('Skipping custom fee — no valid recipient address', {
        chain: chainName,
        platformFee: params.platformFee,
      });
      return undefined;
    }

    return { value: params.platformFee, recipientAddress };
  }

  async estimate(params: TransferParams, _wallet: WalletInfo): Promise<GasEstimate> {
    const isCrossChain = params.fromChainId !== params.toChainId;

    if (!isCrossChain) {
      return {
        protocol: 'bridge-kit',
        totalGasCost: 0n,
        gasPrice: 0n,
        estimatedGas: 0n,
        available: false,
      };
    }

    try {
      const kit = createBridgingKit();
      const useForwarder = params.useForwarder ?? true;
      const { sourceAdapter, destAdapter } = this.resolveAdapters(params, useForwarder);

      const fromChainName = getBridgeChainName(params.fromChainId);
      const toChainName = getBridgeChainName(params.toChainId);

      // Include custom fee in estimate so gas estimation accounts for
      // the additional approval + fee transfer steps
      const estimateCustomFee = this.resolveCustomFee(params, fromChainName);

      if (!params.primaryWalletAddress) {
        throw new Error('primaryWalletAddress is required for bridge-kit estimation');
      }

      // Build the `to` config — when Circle Forwarder is enabled,
      // Circle submits the destination mint, so no dest adapter or signer needed.
      const toConfig = useForwarder
        ? {
            chain: toChainName as BridgeChainIdentifier,
            recipientAddress: params.recipientAddress,
            useForwarder: true as const,
          }
        : {
            adapter: destAdapter as unknown as CircleWalletAdapter,
            chain: toChainName as BridgeChainIdentifier,
            recipientAddress: params.recipientAddress,
            address: params.destWalletAddress || params.recipientAddress,
          };

      // Adapter casts required: resolveAdapters() returns a union of adapter types
      // (CircleWalletsAdapter | SolanaKitAdapter | ViemAdapter) with incompatible
      // capability generics. The SDK's generic constraint cannot narrow this union.
      const sdkEstimate = await kit.estimate({
        from: {
          adapter: sourceAdapter as unknown as CircleWalletAdapter,
          chain: fromChainName as BridgeChainIdentifier,
          address: params.primaryWalletAddress,
        },
        to: toConfig as Parameters<typeof kit.estimate>[0]['to'],
        amount: params.amount,
        ...(estimateCustomFee && {
          config: { customFee: estimateCustomFee },
        }),
      });

      // Sum gas fees across all steps (each step has fees: EstimatedGas | null)
      const totalGas = sdkEstimate.gasFees.reduce((sum, entry) => {
        if (!entry.fees) return sum;
        return sum + entry.fees.gas;
      }, 0n);

      const totalGasPrice = sdkEstimate.gasFees.reduce((sum, entry) => {
        if (!entry.fees) return sum;
        return sum + entry.fees.gasPrice;
      }, 0n);

      return {
        protocol: 'bridge-kit',
        totalGasCost: totalGas,
        gasPrice: totalGasPrice,
        estimatedGas: totalGas,
        available: true,
        bridgeEstimate: {
          gasFees: sdkEstimate.gasFees.map(entry => ({
            name: entry.name,
            token: entry.token,
            blockchain: entry.blockchain ? String(entry.blockchain) : undefined,
            fee: entry.fees?.fee ?? null,
          })),
          protocolFees: sdkEstimate.fees.map(entry => ({
            type: entry.type,
            token: entry.token,
            amount: entry.amount,
          })),
        },
      };
    } catch (error) {
      logger.warn('Bridge Kit estimation failed, using zero fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        protocol: 'bridge-kit',
        totalGasCost: 0n,
        gasPrice: 0n,
        estimatedGas: 0n,
        available: isCrossChain,
      };
    }
  }

  async execute({
    wallet,
    estimate,
    ...params
  }: TransferParams & { wallet: WalletInfo; estimate: GasEstimate }): Promise<TransferResult> {
    const kit = createBridgingKit();
    const useForwarder = params.useForwarder ?? true;
    const { sourceAdapter, destAdapter } = this.resolveAdapters(params, useForwarder);

    const fromChainName = getBridgeChainName(params.fromChainId);
    const toChainName = getBridgeChainName(params.toChainId);

    logger.info('Starting bridge transfer', {
      from: fromChainName,
      to: toChainName,
      amount: params.amount,
      adapterType: params.adapterType || 'circle-wallets',
      useForwarder,
    });

    // Balance check for cross-chain transfers (when caller provides balance)
    if (wallet.balance !== undefined) {
      try {
        assertSufficientBalance({
          balance: wallet.balance,
          amount: parseFloat(params.amount),
          platformFee: params.platformFee,
          tokenSymbol: params.tokenSymbol,
          walletId: wallet.walletId,
        });
      } catch (e) {
        if (e instanceof InsufficientBalanceError) {
          logger.error('Insufficient balance for bridge transfer', {
            shortfall: e.details.shortfall,
          });
          return {
            success: false,
            protocol: 'bridge-kit',
            error: e.message,
          };
        }
        throw e;
      }
    }

    // Subscribe to CCTPv2 step events for progress reporting
    const { onProgress } = params;
    const progressHandler = onProgress
      ? (step: BridgeProgressStep) =>
          (payload: BridgeEventPayload) => {
            onProgress({
              step,
              txHash: payload.values?.txHash,
              explorerUrl: payload.values?.explorerUrl,
              state: (payload.values?.state as 'pending' | 'success' | 'error' | 'noop') || 'pending',
              protocol: 'bridge-kit',
              timestamp: Date.now(),
            });
          }
      : null;

    // Store handler references so we can unsubscribe
    const handlers = new Map<BridgeProgressStep, (payload: BridgeEventPayload) => void>();

    if (progressHandler) {
      for (const step of BRIDGE_STEP_NAMES) {
        const handler = progressHandler(step);
        handlers.set(step, handler);
        // BridgeKit event names include the progress step names but the generic
        // ActionName type cannot be narrowed from our const array at compile time
        (kit as BridgeKitInstance).on(step as Parameters<BridgeKitInstance['on']>[0], handler as Parameters<BridgeKitInstance['on']>[1]);
      }
    }

    // Resolve custom fee using shared logic (same as estimate path)
    const customFeeConfig = this.resolveCustomFee(params, fromChainName);

    if (!params.primaryWalletAddress) {
      return {
        success: false,
        protocol: 'bridge-kit',
        error: 'primaryWalletAddress is required for bridge-kit transfers',
      };
    }

    // Build the `to` config — when Circle Forwarder is enabled (CCTP v2),
    // Circle submits the destination mint on your behalf, so no dest adapter
    // or signer address is needed. Only recipientAddress + chain are required.
    let toConfig: Parameters<typeof kit.bridge>[0]['to'];

    if (useForwarder) {
      logger.info('Using Circle Forwarder — destination mint handled by Circle', {
        destChain: toChainName,
        recipientAddress: params.recipientAddress,
      });
      toConfig = {
        chain: toChainName as BridgeChainIdentifier,
        recipientAddress: params.recipientAddress,
        useForwarder: true,
      } as Parameters<typeof kit.bridge>[0]['to'];
    } else {
      let destSignerAddress = params.recipientAddress;
      if (params.destWalletAddress) {
        destSignerAddress = params.destWalletAddress;
        logger.info('Using pre-resolved Circle-managed wallet on destination chain', {
          destChain: toChainName,
          destSignerAddress,
          recipientAddress: params.recipientAddress,
          isExternal: destSignerAddress !== params.recipientAddress,
        });
      } else {
        logger.warn('No destWalletAddress provided — using recipientAddress as signer (may fail for external wallets)', {
          destChain: toChainName,
          recipientAddress: params.recipientAddress,
        });
      }
      toConfig = {
        adapter: destAdapter as unknown as CircleWalletAdapter,
        chain: toChainName as BridgeChainIdentifier,
        recipientAddress: params.recipientAddress,
        address: destSignerAddress,
      };
    }

    logger.info('Bridge call config', {
      from: { chain: fromChainName, address: params.primaryWalletAddress },
      to: { chain: toChainName, recipientAddress: params.recipientAddress },
      useForwarder,
    });

    try {
      // Adapter casts required: resolveAdapters() returns a union of adapter types
      // with incompatible capability generics (see resolveAdapters comment)
      const result = await kit.bridge({
        from: {
          adapter: sourceAdapter as unknown as CircleWalletAdapter,
          chain: fromChainName as BridgeChainIdentifier,
          address: params.primaryWalletAddress,
        },
        to: toConfig,
        amount: params.amount,
        config: {
          transferSpeed: params.transferSpeed || 'FAST',
          ...(params.maxFee && { maxFee: params.maxFee }),
          ...(customFeeConfig && { customFee: customFeeConfig }),
        },
      });

      // Unsubscribe event handlers
      this.unsubscribeHandlers(kit, handlers);

      // Extract transaction hashes from Bridge Kit result
      const steps = result.steps || [];
      const sourceTxHash = steps[0]?.txHash;
      const destTxHash =
        steps.length > 1
          ? steps[steps.length - 1]?.txHash
          : undefined;

      logger.info('Bridge transfer completed', {
        from: fromChainName,
        to: toChainName,
        steps: steps.length,
        state: result.state,
      });

      // Handle non-success states: extract error, attempt retry, return failure
      if (result.state !== 'success') {
        const errorMsg = extractBridgeError(result);
        const deepError = extractDeepError(result);
        logger.warn('Bridge completed with non-success state', {
          state: result.state,
          error: errorMsg,
          deepError,
          failedStep: result.steps?.find(s => s.state === 'error')?.name,
        });

        // Attempt retry via kit.retry() — wrapped in try-catch since
        // not all results are retryable and the SDK may throw.
        try {
          logger.info('Attempting retry for non-success bridge result');
          const retryContext = useForwarder
            ? { from: sourceAdapter as unknown as CircleWalletAdapter }
            : { from: sourceAdapter as unknown as CircleWalletAdapter, to: destAdapter as unknown as CircleWalletAdapter };
          const retryResult = await kit.retry(result, retryContext);

          const retrySteps = retryResult.steps || [];
          const retrySrcHash = retrySteps[0]?.txHash;
          const retryDestHash =
            retrySteps.length > 1
              ? retrySteps[retrySteps.length - 1]?.txHash
              : undefined;

          logger.info('Bridge retry completed', {
            steps: retrySteps.length,
            state: retryResult.state,
          });

          if (retryResult.state === 'success') {
            return {
              success: true,
              protocol: 'bridge-kit',
              sourceTransactionHash: retrySrcHash,
              transactionHash: retryDestHash || retrySrcHash,
              bridgeResult: retryResult,
              metadata: {
                bridgeKitSteps: retrySteps.length,
                transferSpeed: params.transferSpeed || 'FAST',
              },
            };
          }

          // Retry completed but still not success — extract updated error
          const retryErrorMsg = extractBridgeError(retryResult);
          logger.warn('Bridge retry completed but still non-success', { state: retryResult.state, error: retryErrorMsg });
        } catch (retryError) {
          logger.debug('Bridge retry not available or failed', {
            error: retryError instanceof Error ? retryError.message : String(retryError),
          });
        }

        // Last resort: if a burn txHash exists, verify on-chain independently.
        // The SDK's waitForTransaction uses the same flaky RPC that may have caused
        // the false error. If the burn actually succeeded, treat it as success.
        const burnTxHash = sourceTxHash || steps.find(s => s.name === 'burn')?.txHash;
        if (burnTxHash) {
          logger.info('Verifying burn tx on-chain independently', { burnTxHash, chainId: params.fromChainId });
          const verification = await this.verifyBurnOnChain(params.fromChainId, burnTxHash);

          if (verification.verified && verification.status === 'success') {
            logger.info('Burn tx verified as SUCCESS on-chain despite SDK error — treating as success', {
              burnTxHash,
              originalError: errorMsg,
            });
            return {
              success: true,
              protocol: 'bridge-kit',
              sourceTransactionHash: burnTxHash,
              transactionHash: destTxHash || burnTxHash,
              bridgeResult: result,
              metadata: {
                bridgeKitSteps: steps.length,
                transferSpeed: params.transferSpeed || 'FAST',
                verifiedOnChain: true,
              },
            };
          }

          if (verification.verified && verification.status === 'reverted') {
            logger.warn('Burn tx verified as REVERTED on-chain', { burnTxHash });
          }
        }

        return {
          success: false,
          protocol: 'bridge-kit',
          error: errorMsg,
          sourceTransactionHash: sourceTxHash,
          transactionHash: destTxHash || sourceTxHash,
          bridgeResult: result,
        };
      }

      return {
        success: true,
        protocol: 'bridge-kit',
        sourceTransactionHash: sourceTxHash,
        transactionHash: destTxHash || sourceTxHash,
        bridgeResult: result,
        metadata: {
          bridgeKitSteps: steps.length,
          transferSpeed: params.transferSpeed || 'FAST',
        },
      };
    } catch (error) {
      // Unsubscribe event handlers on failure too
      this.unsubscribeHandlers(kit, handlers);

      const retryable = isRetryableError(error);
      logger.error('Bridge transfer failed', error instanceof Error ? error : undefined, {
        isRetryable: retryable,
      });

      // Attempt retry if the error is retryable AND carries a partial BridgeResult.
      // Bridge Kit's retry() expects a BridgeResult with `state` and `steps` so it
      // can resume from the last successful step. Plain Error objects don't qualify.
      if (retryable && isBridgeResult(error)) {
        logger.info('Attempting retry for retryable bridge error with partial result');
        try {
          // Adapter casts required: resolveAdapters() returns a union of adapter types
          // with incompatible capability generics. RetryContext cannot narrow the union.
          const retryContext = useForwarder
            ? { from: sourceAdapter as unknown as CircleWalletAdapter }
            : { from: sourceAdapter as unknown as CircleWalletAdapter, to: destAdapter as unknown as CircleWalletAdapter };
          const retryResult = await kit.retry(error, retryContext);

          const retrySteps = retryResult.steps || [];
          const retrySrcHash = retrySteps[0]?.txHash;
          const retryDestHash =
            retrySteps.length > 1
              ? retrySteps[retrySteps.length - 1]?.txHash
              : undefined;

          logger.info('Bridge retry succeeded', {
            steps: retrySteps.length,
            state: retryResult.state,
          });

          return {
            success: retryResult.state === 'success',
            protocol: 'bridge-kit',
            sourceTransactionHash: retrySrcHash,
            transactionHash: retryDestHash || retrySrcHash,
            bridgeResult: retryResult,
            metadata: {
              bridgeKitSteps: retrySteps.length,
              transferSpeed: params.transferSpeed || 'FAST',
            },
          };
        } catch (retryError) {
          logger.error('Bridge retry also failed', retryError instanceof Error ? retryError : undefined);
        }
      } else if (retryable) {
        logger.warn('Error is retryable but does not carry a BridgeResult; skipping retry', {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        });
      }

      // On-chain verification for thrown errors with partial results
      if (isBridgeResult(error)) {
        const errorSteps = (error as BridgeResult).steps || [];
        const errorBurnTxHash = errorSteps.find(s => s.name === 'burn')?.txHash || errorSteps[0]?.txHash;
        if (errorBurnTxHash) {
          logger.info('Verifying burn tx on-chain after thrown error', { errorBurnTxHash });
          const verification = await this.verifyBurnOnChain(params.fromChainId, errorBurnTxHash);
          if (verification.verified && verification.status === 'success') {
            logger.info('Burn tx verified as SUCCESS on-chain despite thrown error', { errorBurnTxHash });
            return {
              success: true,
              protocol: 'bridge-kit',
              sourceTransactionHash: errorBurnTxHash,
              transactionHash: errorBurnTxHash,
              bridgeResult: error as BridgeResult,
              metadata: {
                bridgeKitSteps: errorSteps.length,
                transferSpeed: params.transferSpeed || 'FAST',
                verifiedOnChain: true,
              },
            };
          }
        }
      }

      return {
        success: false,
        protocol: 'bridge-kit',
        error: error instanceof Error ? error.message : 'Bridge Kit transfer failed',
        isRetryable: retryable,
        ...(isBridgeResult(error) && { bridgeResult: error }),
      };
    }
  }

  private unsubscribeHandlers(kit: BridgeKitInstance, handlers: Map<BridgeProgressStep, (payload: BridgeEventPayload) => void>) {
    for (const [step, handler] of handlers) {
      (kit as BridgeKitInstance).off(step as Parameters<BridgeKitInstance['off']>[0], handler as Parameters<BridgeKitInstance['off']>[1]);
    }
    handlers.clear();
  }

  private resolveAdapters(params: TransferParams, useForwarder = true) {
    const adapterType = params.adapterType || 'circle-wallets';

    if (adapterType === 'circle-wallets') {
      const adapter = createCircleWalletBridgingAdapter(
        params.circleApiKey,
        params.circleEntitySecret
      );
      // When using Circle Forwarder, dest adapter is not needed —
      // Circle handles the destination mint.
      return { sourceAdapter: adapter, destAdapter: useForwarder ? undefined : adapter };
    }

    const sourceAdapter =
      params.sourceChainType === 'solana'
        ? createSolanaBridgingAdapter(params.solanaPrivateKey)
        : createEthereumBridgingAdapter(params.evmPrivateKey);

    // When using Forwarder, skip dest adapter creation entirely
    if (useForwarder) {
      return { sourceAdapter, destAdapter: undefined };
    }

    const destAdapter =
      params.destChainType === 'solana'
        ? createSolanaBridgingAdapter(params.solanaPrivateKey)
        : createEthereumBridgingAdapter(params.evmPrivateKey);

    return { sourceAdapter, destAdapter };
  }

  /**
   * Verify a burn transaction on-chain when the bridge SDK reports failure.
   * The SDK's waitForTransaction uses the same public RPC which may be flaky,
   * so we do an independent receipt check to avoid false negatives.
   */
  private async verifyBurnOnChain(
    chainId: number,
    txHash: string,
  ): Promise<{ verified: boolean; status?: 'success' | 'reverted' }> {
    if (!txHash || !txHash.startsWith('0x')) return { verified: false };

    const circleName = getCircleBlockchainName(chainId);
    if (!circleName) return { verified: false };

    const rpcConfig = getEvmRpcConfig(circleName);
    if (!rpcConfig) return { verified: false };

    try {
      const response = await fetch(rpcConfig.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [txHash],
          id: 1,
        }),
      });

      const data = await response.json() as { result?: { status?: string; blockNumber?: string } };
      const receipt = data?.result;
      if (!receipt || !receipt.blockNumber) return { verified: false };

      if (receipt.status === '0x1') return { verified: true, status: 'success' };
      if (receipt.status === '0x0') return { verified: true, status: 'reverted' };

      return { verified: false };
    } catch {
      return { verified: false };
    }
  }
}
