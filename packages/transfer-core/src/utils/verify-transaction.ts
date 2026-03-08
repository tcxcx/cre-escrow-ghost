/**
 * On-chain transaction receipt verification for cross-chain transfers.
 *
 * Pure utility — no DB deps. Uses `getEvmRpcConfig()` from Chains.ts as the
 * single source of truth for chain ID + RPC URL resolution.
 */

import { getEvmRpcConfig } from '../constants/Chains';

// ---------- Types ----------

export type TxReceiptStatus = 'success' | 'reverted' | 'pending' | 'unsupported';

export interface CrossChainVerificationParams {
  sourceChain: string;
  sourceTxHash?: string;
  destinationChain: string;
  destinationTxHash?: string;
}

export interface CrossChainVerificationResult {
  source: TxReceiptStatus;
  destination: TxReceiptStatus;
}

// ---------- Helpers ----------

function isValidEvmHash(hash?: string): hash is `0x${string}` {
  return typeof hash === 'string' && hash.startsWith('0x') && hash.length >= 10;
}

async function getReceiptStatus(
  chainName: string,
  txHash: `0x${string}`,
): Promise<TxReceiptStatus> {
  const config = getEvmRpcConfig(chainName);
  if (!config) return 'unsupported';

  // Dynamic import keeps viem tree-shakeable for callers that don't need it
  const { createPublicClient, http, defineChain } = await import('viem');

  const client = createPublicClient({
    chain: defineChain({
      id: config.chainId,
      name: chainName,
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [config.rpcUrl] } },
    }),
    transport: http(config.rpcUrl),
  });

  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (receipt.status === 'success') return 'success';
    if (receipt.status === 'reverted') return 'reverted';
    return 'pending';
  } catch {
    // Receipt not yet available (tx still mining or RPC error)
    return 'pending';
  }
}

// ---------- Public API ----------

/**
 * Verify the on-chain status of a cross-chain transfer's source and destination
 * transactions in parallel. Returns receipt statuses without touching any database.
 *
 * Usage:
 * ```ts
 * const result = await verifyCrossChainReceipts({
 *   sourceChain: 'AVAX-FUJI',
 *   sourceTxHash: '0xabc...',
 *   destinationChain: 'ARB-SEPOLIA',
 *   destinationTxHash: '0xdef...',
 * });
 * // result.source === 'success', result.destination === 'success'
 * ```
 */
export async function verifyCrossChainReceipts(
  params: CrossChainVerificationParams,
): Promise<CrossChainVerificationResult> {
  const [source, destination] = await Promise.all([
    isValidEvmHash(params.sourceTxHash)
      ? getReceiptStatus(params.sourceChain, params.sourceTxHash)
      : Promise.resolve('pending' as TxReceiptStatus),
    isValidEvmHash(params.destinationTxHash)
      ? getReceiptStatus(params.destinationChain, params.destinationTxHash)
      : Promise.resolve('pending' as TxReceiptStatus),
  ]);

  return { source, destination };
}
