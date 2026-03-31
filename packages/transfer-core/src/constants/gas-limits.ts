/**
 * Per-chain gas limit ranges for on-chain transfers.
 *
 * Used by the transfer validation schema to bound user-provided gas limits.
 * Ethereum default (21000-500000) applies to most EVM chains; overrides
 * are listed for chains with higher L2 ceilings.
 */

export interface GasLimitRange {
  min: number;
  max: number;
}

export const GAS_LIMITS = {
  ETH: { min: 21_000, max: 500_000 },
  MATIC: { min: 21_000, max: 1_000_000 },
  ARB: { min: 21_000, max: 500_000 },
  BASE: { min: 21_000, max: 500_000 },
  AVAX: { min: 21_000, max: 500_000 },
  OPTIMISM: { min: 21_000, max: 500_000 },
  UNI: { min: 21_000, max: 500_000 },
  WORLDCHAIN: { min: 21_000, max: 500_000 },
} as const satisfies Record<string, GasLimitRange>;

/** Default gas limit range used when the chain is unknown. */
export const DEFAULT_GAS_LIMIT_RANGE: GasLimitRange = GAS_LIMITS.ETH;

/** Return the gas limit range for a given chain key, falling back to ETH defaults. */
export function getGasLimitRange(chain: string): GasLimitRange {
  return GAS_LIMITS[chain as keyof typeof GAS_LIMITS] ?? DEFAULT_GAS_LIMIT_RANGE;
}
