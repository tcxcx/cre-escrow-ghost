/**
 * Centralized chain display name utilities
 *
 * This module provides a single source of truth for chain display names
 * with multiple entry points for different input formats:
 * - Chain ID (number): getChainDisplayNameFromId
 * - Circle chain code (uppercase string): getChainDisplayNameFromCode
 * - Bridge API name (lowercase string): getChainDisplayNameFromBridge
 * - Auto-detect: getChainDisplayName
 */

import { SupportedChainId, CHAIN_TO_CHAIN_NAME } from '../constants/chain-constants';
import { CIRCLE_NAME_TO_CHAIN_ID } from '../constants/ChainMappings';

// Single source of truth - use existing CHAIN_TO_CHAIN_NAME
export const CHAIN_DISPLAY_NAMES: Record<number, string> = CHAIN_TO_CHAIN_NAME;

// Bridge API lowercase names → chain IDs
const BRIDGE_CHAIN_NAME_TO_ID: Record<string, number> = {
  avalanche: SupportedChainId.AVAX,
  ethereum: SupportedChainId.ETH,
  polygon: SupportedChainId.MATIC,
  arbitrum: SupportedChainId.ARBITRUM,
  base: SupportedChainId.BASE,
  optimism: SupportedChainId.OPTIMISM,
  unichain: SupportedChainId.UNI,
  worldchain: SupportedChainId.WORLDCHAIN,
};

// Bridge-specific display overrides (when Bridge uses different naming)
const BRIDGE_DISPLAY_OVERRIDES: Record<string, string> = {
  avalanche: 'Avalanche C-Chain',
  arbitrum: 'Arbitrum One',
};

/**
 * Get chain display name from numeric chain ID
 * @example getChainDisplayNameFromId(43113) // "Avalanche Fuji"
 */
export function getChainDisplayNameFromId(chainId: number): string {
  return CHAIN_DISPLAY_NAMES[chainId] ?? `Chain ${chainId}`;
}

/**
 * Get chain display name from Circle chain code (uppercase string format)
 * @example getChainDisplayNameFromCode("AVAX-FUJI") // "Avalanche Fuji"
 * @example getChainDisplayNameFromCode("ARB") // "Arbitrum"
 */
export function getChainDisplayNameFromCode(chainCode: string): string {
  const chainId = CIRCLE_NAME_TO_CHAIN_ID[chainCode];
  return chainId ? (CHAIN_DISPLAY_NAMES[chainId] ?? chainCode) : chainCode;
}

/**
 * Get chain display name from Bridge API format (lowercase string)
 * @example getChainDisplayNameFromBridge("avalanche") // "Avalanche C-Chain"
 * @example getChainDisplayNameFromBridge("ethereum") // "Ethereum"
 */
export function getChainDisplayNameFromBridge(bridgeName: string): string {
  const normalized = bridgeName?.toLowerCase();

  // Check for Bridge-specific display overrides first
  if (BRIDGE_DISPLAY_OVERRIDES[normalized]) {
    return BRIDGE_DISPLAY_OVERRIDES[normalized];
  }

  // Look up in standard chain mappings
  const chainId = BRIDGE_CHAIN_NAME_TO_ID[normalized];
  if (chainId && CHAIN_DISPLAY_NAMES[chainId]) {
    return CHAIN_DISPLAY_NAMES[chainId];
  }

  // Fallback: capitalize first letter
  if (bridgeName) {
    return bridgeName.charAt(0).toUpperCase() + bridgeName.slice(1);
  }

  return 'Unknown';
}

/**
 * Unified function that auto-detects input type and returns display name
 *
 * Detection logic:
 * - number: Use getChainDisplayNameFromId
 * - UPPERCASE or contains "-": Use getChainDisplayNameFromCode (Circle format)
 * - lowercase: Use getChainDisplayNameFromBridge (Bridge API format)
 *
 * @example getChainDisplayName(43113) // "Avalanche Fuji"
 * @example getChainDisplayName("AVAX-FUJI") // "Avalanche Fuji"
 * @example getChainDisplayName("avalanche") // "Avalanche C-Chain"
 */
export function getChainDisplayName(input: number | string): string {
  if (typeof input === 'number') {
    return getChainDisplayNameFromId(input);
  }

  const str = input.trim();

  // Check if it's Circle format (uppercase or contains dash like "AVAX-FUJI")
  if (str === str.toUpperCase() || str.includes('-')) {
    return getChainDisplayNameFromCode(str);
  }

  // Otherwise treat as Bridge API format (lowercase)
  return getChainDisplayNameFromBridge(str);
}
