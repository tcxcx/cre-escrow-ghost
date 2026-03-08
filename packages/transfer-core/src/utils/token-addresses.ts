import {
  SupportedChainId,
  CHAIN_IDS_TO_USDC_ADDRESSES,
  CHAIN_IDS_TO_EURC_ADDRESSES,
} from '../constants/chain-constants';
import type { SupportedCurrency } from '@bu/types/transfer-execution';

/**
 * Maps blockchain identifiers to their corresponding chain IDs
 * This maps the blockchain strings used in the UI to the actual chain IDs
 */
const BLOCKCHAIN_TO_CHAIN_ID: Record<string, number> = {
  // Mainnet blockchains
  ETH: SupportedChainId.ETH,
  BASE: SupportedChainId.BASE,
  ARB: SupportedChainId.ARBITRUM,
  AVAX: SupportedChainId.AVAX,
  MATIC: SupportedChainId.MATIC,
  UNI: SupportedChainId.UNI,
  OPTIMISM: SupportedChainId.OPTIMISM,
  OP: SupportedChainId.OPTIMISM, // Alias for Optimism
  WORLDCHAIN: SupportedChainId.WORLDCHAIN,

  // Testnet blockchains
  'ETH-SEPOLIA': SupportedChainId.ETH_SEPOLIA,
  'BASE-SEPOLIA': SupportedChainId.BASE_SEPOLIA,
  'ARB-SEPOLIA': SupportedChainId.ARBITRUM_SEPOLIA,
  'AVAX-FUJI': SupportedChainId.AVAX_FUJI,
  'MATIC-AMOY': SupportedChainId.MATIC_AMOY,
  'UNI-SEPOLIA': SupportedChainId.UNI_SEPOLIA,
  'OP-SEPOLIA': SupportedChainId.OP_SEPOLIA,
  'OPTIMISM-SEPOLIA': SupportedChainId.OP_SEPOLIA, // Alias for Optimism Sepolia
  'WORLDCHAIN-SEPOLIA': SupportedChainId.WORLDCHAIN_SEPOLIA,

  // EVM aliases (for backward compatibility)
  EVM: SupportedChainId.ETH, // Default to Ethereum mainnet
  'EVM-TESTNET': SupportedChainId.ETH_SEPOLIA, // Default to Ethereum Sepolia
} as const;

/**
 * Gets the token address for a given blockchain identifier and token type
 * @param blockchain - The blockchain identifier (e.g., 'AVAX', 'AVAX-FUJI')
 * @param tokenType - The token type ('USDC' or 'EURC')
 * @returns The token contract address for the specified blockchain and token
 * @throws Error if the blockchain is not supported or token is not available
 */
export function getTokenAddressForBlockchain(
  blockchain: string,
  tokenType: SupportedCurrency = 'USDC'
): string {
  const chainId = BLOCKCHAIN_TO_CHAIN_ID[blockchain];

  if (!chainId) {
    throw new Error(`Unsupported blockchain: ${blockchain}`);
  }

  const addressMap =
    tokenType === 'USDC' ? CHAIN_IDS_TO_USDC_ADDRESSES : CHAIN_IDS_TO_EURC_ADDRESSES;
  const tokenAddress = addressMap[chainId];

  if (!tokenAddress || tokenAddress === '0x') {
    throw new Error(
      `${tokenType} is not supported on blockchain ${blockchain} (chain ID: ${chainId})`
    );
  }

  return tokenAddress;
}

/**
 * Gets the USDC token address for a given blockchain identifier
 * @param blockchain - The blockchain identifier (e.g., 'AVAX', 'AVAX-FUJI')
 * @returns The USDC contract address for the specified blockchain
 * @throws Error if the blockchain is not supported or USDC is not available
 */
export function getUSDCAddressForBlockchain(blockchain: string): string {
  return getTokenAddressForBlockchain(blockchain, 'USDC');
}

/**
 * Gets the EURC token address for a given blockchain identifier
 * @param blockchain - The blockchain identifier (e.g., 'AVAX', 'AVAX-FUJI')
 * @returns The EURC contract address for the specified blockchain
 * @throws Error if the blockchain is not supported or EURC is not available
 */
export function getEURCAddressForBlockchain(blockchain: string): string {
  return getTokenAddressForBlockchain(blockchain, 'EURC');
}

/**
 * Gets the chain ID for a given blockchain identifier
 * @param blockchain - The blockchain identifier (e.g., 'AVAX', 'AVAX-FUJI')
 * @returns The chain ID for the specified blockchain
 * @throws Error if the blockchain is not supported
 */
export function getChainIdForBlockchain(blockchain: string): number {
  const chainId = BLOCKCHAIN_TO_CHAIN_ID[blockchain];

  if (!chainId) {
    throw new Error(`Unsupported blockchain: ${blockchain}`);
  }

  return chainId;
}

/**
 * Checks if a blockchain supports a specific token type
 * @param blockchain - The blockchain identifier (e.g., 'AVAX', 'AVAX-FUJI')
 * @param tokenType - The token type ('USDC' or 'EURC')
 * @returns true if the blockchain supports the token, false otherwise
 */
export function isTokenSupportedOnBlockchain(
  blockchain: string,
  tokenType: SupportedCurrency = 'USDC'
): boolean {
  try {
    getTokenAddressForBlockchain(blockchain, tokenType);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets all supported blockchains for a given token type
 * @param tokenType - The token type ('USDC' or 'EURC')
 * @returns Array of blockchain identifiers that support the specified token
 */
export function getSupportedBlockchainsForToken(tokenType: SupportedCurrency = 'USDC'): string[] {
  return Object.keys(BLOCKCHAIN_TO_CHAIN_ID).filter(blockchain =>
    isTokenSupportedOnBlockchain(blockchain, tokenType)
  );
}

/**
 * Gets all available blockchain identifiers
 * @returns Array of all supported blockchain identifiers
 */
export function getAllSupportedBlockchains(): string[] {
  return Object.keys(BLOCKCHAIN_TO_CHAIN_ID);
}
