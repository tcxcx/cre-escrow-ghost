/**
 * BUFI Network Payout Configuration
 *
 * Centralized configuration for payout-supported chains.
 * Uses transfer-core's SupportedChainId for consistency across the codebase.
 *
 * IMPORTANT: This is the authoritative source for payout chain support.
 * Do NOT define chain lists elsewhere in the BUFI network code.
 */

import { SupportedChainId, CHAIN_TO_CHAIN_NAME, CHAIN_IDS_TO_USDC_ADDRESSES } from './chain-constants';
import { CHAIN_ID_TO_CIRCLE_NAME } from './ChainMappings';
import { isProd, resolve } from '@bu/env/core';

// =============================================================================
// Payout Supported Chains
// =============================================================================

/**
 * Chains supported for BUFI Network payouts
 * Testnet chains are used in development/staging
 * Mainnet chains are used in production
 */
export const PAYOUT_SUPPORTED_CHAINS = {
  testnet: [
    SupportedChainId.AVAX_FUJI,
    SupportedChainId.ARC_TESTNET,
    SupportedChainId.BASE_SEPOLIA,
    SupportedChainId.ARBITRUM_SEPOLIA,
    SupportedChainId.MATIC_AMOY,
    SupportedChainId.ETH_SEPOLIA,
    SupportedChainId.SOL_DEVNET,
    SupportedChainId.UNI_SEPOLIA,
    SupportedChainId.OP_SEPOLIA,
  ],
  mainnet: [
    SupportedChainId.AVAX,
    SupportedChainId.BASE,
    SupportedChainId.ARBITRUM,
    SupportedChainId.MATIC,
    SupportedChainId.ETH,
    SupportedChainId.OPTIMISM,
    SupportedChainId.ARC,
    SupportedChainId.SOL_MAINNET,
    SupportedChainId.UNI,
    SupportedChainId.OPTIMISM,
  ],
} as const;

/**
 * Type for payout chain IDs
 */
export type PayoutChainId =
  | (typeof PAYOUT_SUPPORTED_CHAINS.testnet)[number]
  | (typeof PAYOUT_SUPPORTED_CHAINS.mainnet)[number];

// =============================================================================
// Environment-aware Chain Selection
// =============================================================================

/**
 * Determine if we're running in mainnet environment
 */
export function isMainnetEnvironment(): boolean {
  return isProd() && resolve('NETWORK_MODE') !== 'testnet';
}

/**
 * Get payout supported chains for current environment
 */
export function getPayoutSupportedChains(): number[] {
  return isMainnetEnvironment()
    ? [...PAYOUT_SUPPORTED_CHAINS.mainnet]
    : [...PAYOUT_SUPPORTED_CHAINS.testnet];
}

/**
 * Get default payout chain for current environment
 */
export function getDefaultPayoutChain(): number {
  return isMainnetEnvironment()
    ? SupportedChainId.BASE // Default to Base for mainnet (low fees)
    : SupportedChainId.BASE_SEPOLIA; // Default to Base Sepolia for testnet
}

// =============================================================================
// Chain Validation & Conversion
// =============================================================================

/**
 * Check if a chain ID is supported for payouts
 */
export function isPayoutSupportedChain(chainId: number): boolean {
  const supportedChains = getPayoutSupportedChains();
  return supportedChains.includes(chainId);
}

/**
 * Solana chain IDs (for address validation and routing)
 */
export const SOLANA_CHAIN_IDS = new Set<number>([
  SupportedChainId.SOL_MAINNET,
  SupportedChainId.SOL_DEVNET,
]);

/**
 * Check if a chain ID is Solana (mainnet or devnet)
 */
export function isSolanaChain(chainId: number): boolean {
  return SOLANA_CHAIN_IDS.has(chainId);
}

/**
 * Get the Solana chain ID to use for a recipient when the source wallet is on the given chain.
 * Uses PAYOUT_SUPPORTED_CHAINS as single source of truth: testnet → SOL_DEVNET, mainnet → SOL_MAINNET.
 * Used by payroll execution when routing Solana recipients.
 */
export function getSolanaChainIdForSourceChain(sourceChainId: number): number {
  const isTestnet = (PAYOUT_SUPPORTED_CHAINS.testnet as readonly number[]).includes(sourceChainId);
  return isTestnet ? SupportedChainId.SOL_DEVNET : SupportedChainId.SOL_MAINNET;
}

/**
 * Get chain display info for UI
 */
export interface PayoutChainInfo {
  chainId: number;
  name: string;
  circleName: string;
  usdcAddress: string;
  isTestnet: boolean;
}

export function getPayoutChainInfo(chainId: number): PayoutChainInfo | null {
  if (!isPayoutSupportedChain(chainId)) {
    return null;
  }

  const isTestnet = (PAYOUT_SUPPORTED_CHAINS.testnet as readonly number[]).includes(chainId);

  return {
    chainId,
    name: CHAIN_TO_CHAIN_NAME[chainId] || 'Unknown',
    circleName: CHAIN_ID_TO_CIRCLE_NAME[chainId] || '',
    usdcAddress: CHAIN_IDS_TO_USDC_ADDRESSES[chainId] || '',
    isTestnet,
  };
}

/**
 * Get all payout chain options for UI display
 */
export function getPayoutChainOptions(): PayoutChainInfo[] {
  const supportedChains = getPayoutSupportedChains();
  return supportedChains
    .map((chainId) => getPayoutChainInfo(chainId))
    .filter((info): info is PayoutChainInfo => info !== null);
}

// =============================================================================
// Legacy String-to-ChainId Mapping (for backwards compatibility)
// =============================================================================

/**
 * Legacy chain string names used in BUFI Network v1
 * Maps to numeric chain IDs for backwards compatibility
 *
 * @deprecated Use numeric chain IDs directly
 */
export const LEGACY_CHAIN_NAME_TO_ID: Record<string, number> = {
  // Testnet
  'avalanche-fuji': SupportedChainId.AVAX_FUJI,
  'base-sepolia': SupportedChainId.BASE_SEPOLIA,
  'arbitrum-sepolia': SupportedChainId.ARBITRUM_SEPOLIA,
  'polygon-amoy': SupportedChainId.MATIC_AMOY,
  'eth-sepolia': SupportedChainId.ETH_SEPOLIA,

  // Mainnet
  avalanche: SupportedChainId.AVAX,
  base: SupportedChainId.BASE,
  arbitrum: SupportedChainId.ARBITRUM,
  polygon: SupportedChainId.MATIC,
  ethereum: SupportedChainId.ETH,
  optimism: SupportedChainId.OPTIMISM,
};

/**
 * Reverse mapping from chain ID to legacy string name
 */
export const CHAIN_ID_TO_LEGACY_NAME: Record<number, string> = Object.entries(
  LEGACY_CHAIN_NAME_TO_ID
).reduce(
  (acc, [name, id]) => {
    acc[id] = name;
    return acc;
  },
  {} as Record<number, string>
);

/**
 * Convert legacy chain name to chain ID
 * @deprecated Use numeric chain IDs directly
 */
export function legacyChainNameToId(chainName: string): number | null {
  return LEGACY_CHAIN_NAME_TO_ID[chainName.toLowerCase()] || null;
}

/**
 * Convert chain ID to legacy chain name
 * @deprecated Use numeric chain IDs directly
 */
export function chainIdToLegacyName(chainId: number): string | null {
  return CHAIN_ID_TO_LEGACY_NAME[chainId] || null;
}

// =============================================================================
// Payout Configuration Constants
// =============================================================================

export const PAYOUT_CONFIG = {
  /** Minimum payout amount in USD */
  MINIMUM_PAYOUT_USD: 10,

  /** Maximum payout amount per transaction in USD */
  MAXIMUM_PAYOUT_USD: 10000,

  /** Days to hold commission before payout eligibility */
  COMMISSION_HOLD_DAYS: 30,

  /** Default currency for payouts */
  DEFAULT_CURRENCY: 'USDC' as const,

  /** Supported payout methods */
  SUPPORTED_METHODS: ['manual', 'circle', 'bridge', 'peanut'] as const,

  /** Default payout method */
  DEFAULT_METHOD: 'manual' as const,

  /** Auto-processing threshold (payouts above this require manual review) */
  AUTO_PROCESSING_THRESHOLD_USD: 500,
} as const;
