/**
 * Chain-Aware Transfer Timing Constants
 *
 * Based on Circle CCTP V2 official documentation:
 * - Fast Transfer (CCTP V2): ~8s for L2s, ~20s for Ethereum
 * - Standard Transfer: ~15-19 min for L1-dependent chains, ~8-25s for others
 * - Same-chain (Circle SDK): 1 confirmation, 15-30 seconds
 */

import { SupportedChainId } from './chain-constants';

export interface ChainTimingInfo {
  /** Number of block confirmations needed */
  confirmations: number;
  /** Human-readable estimated time string */
  estimatedTime: string;
  /** Estimated seconds (for programmatic use) */
  estimatedSeconds: number;
}

interface ChainTimingEntry {
  fast: ChainTimingInfo;
  standard: ChainTimingInfo;
}

/** Per-chain timing for cross-chain transfers (CCTP). */
const CROSS_CHAIN_TIMING: Record<number, ChainTimingEntry> = {
  [SupportedChainId.ETH]: {
    fast: { confirmations: 2, estimatedTime: '~20 seconds', estimatedSeconds: 20 },
    standard: { confirmations: 65, estimatedTime: '~15 minutes', estimatedSeconds: 900 },
  },
  [SupportedChainId.ETH_SEPOLIA]: {
    fast: { confirmations: 2, estimatedTime: '~20 seconds', estimatedSeconds: 20 },
    standard: { confirmations: 65, estimatedTime: '~15 minutes', estimatedSeconds: 900 },
  },
  [SupportedChainId.ARBITRUM]: {
    fast: { confirmations: 1, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
    standard: { confirmations: 65, estimatedTime: '~19 minutes', estimatedSeconds: 1140 },
  },
  [SupportedChainId.ARBITRUM_SEPOLIA]: {
    fast: { confirmations: 1, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
    standard: { confirmations: 65, estimatedTime: '~19 minutes', estimatedSeconds: 1140 },
  },
  [SupportedChainId.BASE]: {
    fast: { confirmations: 1, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
    standard: { confirmations: 65, estimatedTime: '~19 minutes', estimatedSeconds: 1140 },
  },
  [SupportedChainId.BASE_SEPOLIA]: {
    fast: { confirmations: 1, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
    standard: { confirmations: 65, estimatedTime: '~19 minutes', estimatedSeconds: 1140 },
  },
  [SupportedChainId.OPTIMISM]: {
    fast: { confirmations: 1, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
    standard: { confirmations: 65, estimatedTime: '~19 minutes', estimatedSeconds: 1140 },
  },
  [SupportedChainId.OP_SEPOLIA]: {
    fast: { confirmations: 1, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
    standard: { confirmations: 65, estimatedTime: '~19 minutes', estimatedSeconds: 1140 },
  },
  [SupportedChainId.UNI]: {
    fast: { confirmations: 1, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
    standard: { confirmations: 65, estimatedTime: '~19 minutes', estimatedSeconds: 1140 },
  },
  [SupportedChainId.UNI_SEPOLIA]: {
    fast: { confirmations: 1, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
    standard: { confirmations: 65, estimatedTime: '~19 minutes', estimatedSeconds: 1140 },
  },
  [SupportedChainId.WORLDCHAIN]: {
    fast: { confirmations: 1, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
    standard: { confirmations: 65, estimatedTime: '~19 minutes', estimatedSeconds: 1140 },
  },
  [SupportedChainId.WORLDCHAIN_SEPOLIA]: {
    fast: { confirmations: 1, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
    standard: { confirmations: 65, estimatedTime: '~19 minutes', estimatedSeconds: 1140 },
  },
  [SupportedChainId.AVAX]: {
    fast: { confirmations: 1, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
    standard: { confirmations: 1, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
  },
  [SupportedChainId.AVAX_FUJI]: {
    fast: { confirmations: 1, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
    standard: { confirmations: 1, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
  },
  [SupportedChainId.MATIC]: {
    fast: { confirmations: 1, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
    standard: { confirmations: 3, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
  },
  [SupportedChainId.MATIC_AMOY]: {
    fast: { confirmations: 1, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
    standard: { confirmations: 3, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
  },
  [SupportedChainId.SOL_MAINNET]: {
    fast: { confirmations: 2, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
    standard: { confirmations: 32, estimatedTime: '~25 seconds', estimatedSeconds: 25 },
  },
  [SupportedChainId.SOL_DEVNET]: {
    fast: { confirmations: 2, estimatedTime: '~8 seconds', estimatedSeconds: 8 },
    standard: { confirmations: 32, estimatedTime: '~25 seconds', estimatedSeconds: 25 },
  },
};

/** Default timing for same-chain transfers via Circle SDK. */
const SAME_CHAIN_TIMING: ChainTimingInfo = {
  confirmations: 1,
  estimatedTime: '~30 seconds',
  estimatedSeconds: 30,
};

/** Fallback when chain is unknown. */
const DEFAULT_TIMING: ChainTimingInfo = {
  confirmations: 1,
  estimatedTime: '~30 seconds',
  estimatedSeconds: 30,
};

/**
 * Get estimated transfer timing based on chain, transfer type, and speed.
 *
 * @param sourceChainId - Numeric chain ID (from SupportedChainId)
 * @param isCrossChain - Whether this is a cross-chain (CCTP) transfer
 * @param transferSpeed - 'FAST' (CCTP V2) or 'SLOW' (standard). Defaults to 'FAST'.
 */
export function getTransferTiming(
  sourceChainId?: number,
  isCrossChain: boolean = false,
  transferSpeed: 'FAST' | 'SLOW' = 'FAST',
): ChainTimingInfo {
  if (!isCrossChain || !sourceChainId) {
    return SAME_CHAIN_TIMING;
  }

  const chainTiming = CROSS_CHAIN_TIMING[sourceChainId];
  if (!chainTiming) {
    return DEFAULT_TIMING;
  }

  return transferSpeed === 'FAST' ? chainTiming.fast : chainTiming.standard;
}
