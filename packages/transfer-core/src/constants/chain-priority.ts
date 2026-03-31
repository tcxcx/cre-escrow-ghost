/**
 * Chain display/sort priority for destination-chain selectors.
 *
 * Lower numbers appear first. Chains not listed default to priority 99.
 */

import { SupportedChainId } from './chain-constants';

export const CHAIN_SORT_PRIORITY: Record<number, number> = {
  [SupportedChainId.ARC_TESTNET]: 0,
  [SupportedChainId.SOL_MAINNET]: 1,
  [SupportedChainId.SOL_DEVNET]: 1,
} as const;

/** Default priority assigned to chains not in the explicit map. */
export const DEFAULT_CHAIN_PRIORITY = 99;

/** Compare two chain IDs by display priority (for Array.sort). */
export function compareChainPriority(a: number, b: number): number {
  return (
    (CHAIN_SORT_PRIORITY[a] ?? DEFAULT_CHAIN_PRIORITY) -
    (CHAIN_SORT_PRIORITY[b] ?? DEFAULT_CHAIN_PRIORITY)
  );
}
