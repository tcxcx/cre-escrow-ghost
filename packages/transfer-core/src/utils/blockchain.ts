/**
 * Centralized blockchain name mapping for Circle API
 * This ensures consistency across BridgeKitExecutor and CircleSDKExecutor
 */

import type { TokenBlockchain } from '@bu/circle';

/**
 * Map chain ID to Circle blockchain name format
 */
export function getCircleBlockchainName(chainId: number): TokenBlockchain {
  const chainMap: Record<number, TokenBlockchain> = {
    // Testnets
    43113: 'AVAX-FUJI', // Avalanche Fuji
    421614: 'ARB-SEPOLIA', // Arbitrum Sepolia
    11155111: 'ETH-SEPOLIA', // Ethereum Sepolia
    84532: 'BASE-SEPOLIA', // Base Sepolia
    // Mainnets
    43114: 'AVAX', // Avalanche Mainnet
    42161: 'ARB', // Arbitrum Mainnet
    1: 'ETH', // Ethereum Mainnet
    8453: 'BASE', // Base Mainnet
  };

  const blockchain = chainMap[chainId];
  if (!blockchain) {
    throw new Error(`Unsupported chain ID for Circle SDK: ${chainId}`);
  }

  return blockchain;
}

/**
 * Check if a chain ID is supported by Circle SDK
 */
export function isChainIdSupportedByCircle(chainId: number): boolean {
  const supportedChainIds = [
    43113, // AVAX-FUJI
    421614, // ARB-SEPOLIA
    11155111, // ETH-SEPOLIA
    84532, // BASE-SEPOLIA
    44787, // CELO-ALFAJORES
    43114, // AVAX
    42161, // ARB
    1, // ETH
    8453, // BASE
  ];
  return supportedChainIds.includes(chainId);
}

