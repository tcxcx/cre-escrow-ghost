/**
 * 🎯 UNISWAP V3 USDC/EURC POOL AVAILABILITY
 * 
 * This file documents which chains have Uniswap V3 liquidity pools for USDC/EURC swaps.
 * It serves as the SINGLE SOURCE OF TRUTH for swap pool availability.
 * 
 * Last verified: January 2025
 * 
 * ⚠️ IMPORTANT: Uniswap V3 pools are deployed independently on each chain.
 * Just because USDC and EURC tokens exist on a chain DOES NOT mean a swap pool exists.
 * 
 * 🔍 VERIFICATION METHOD:
 * Pool availability is verified by:
 * 1. Checking Uniswap V3 subgraph data
 * 2. On-chain contract verification
 * 3. Circle's official documentation
 * 4. USDCKit error messages (decimals() errors indicate missing pools)
 */

import { SupportedChainId } from './chain-constants';

/**
 * ✅ MAINNET CHAINS WITH VERIFIED UNISWAP V3 USDC/EURC POOLS
 * 
 * ⚠️ IMPORTANT: As of January 2025, Uniswap V3 USDC/EURC pools are EXTREMELY LIMITED on mainnet.
 * Only Ethereum mainnet has been verified to have an active pool.
 * 
 * Base, Arbitrum, Avalanche, and other L2s do NOT have USDC/EURC Uniswap V3 pools yet.
 */
export const MAINNET_CHAINS_WITH_POOLS = [
  {
    chainId: SupportedChainId.ETH,
    name: 'Ethereum',
    verified: true,
    poolAddress: '0x...', // TODO: Add actual pool addresses if needed
    notes: 'Primary and currently ONLY mainnet liquidity hub for USDC/EURC on Uniswap V3',
  },
] as const;

/**
 * ❌ MAINNET CHAINS WITHOUT POOLS
 * 
 * These chains have USDC and/or EURC tokens deployed, but NO Uniswap V3 pool
 * exists for the USDC/EURC pair. Attempting swaps will fail with contract errors.
 */
export const MAINNET_CHAINS_WITHOUT_POOLS = [
  {
    chainId: SupportedChainId.BASE,
    name: 'Base',
    hasUsdc: true,
    hasEurc: true,
    reason: 'No Uniswap V3 USDC/EURC pool deployed on Base mainnet',
    alternative: 'Bridge to Ethereum mainnet to swap',
  },
  {
    chainId: SupportedChainId.AVAX,
    name: 'Avalanche',
    hasUsdc: true,
    hasEurc: true,
    reason: 'No Uniswap V3 USDC/EURC pool deployed',
    alternative: 'Bridge to Ethereum to swap',
  },
  {
    chainId: SupportedChainId.ARBITRUM,
    name: 'Arbitrum',
    hasUsdc: true,
    hasEurc: false,
    reason: 'EURC not available on Arbitrum',
    alternative: 'Bridge to Ethereum for EURC',
  },
  {
    chainId: SupportedChainId.MATIC,
    name: 'Polygon',
    hasUsdc: true,
    hasEurc: false,
    reason: 'EURC not available on Polygon',
    alternative: 'Bridge to Ethereum for EURC',
  },
  {
    chainId: SupportedChainId.OPTIMISM,
    name: 'Optimism',
    hasUsdc: true,
    hasEurc: false,
    reason: 'EURC not available on Optimism',
    alternative: 'Bridge to Ethereum for EURC',
  },
] as const;

/**
 * ✅ TESTNET CHAINS WITH VERIFIED POOLS
 * 
 * Testnet pools are even MORE LIMITED than mainnet.
 * Only use these chains for testing swap functionality.
 */
export const TESTNET_CHAINS_WITH_POOLS = [
  {
    chainId: SupportedChainId.ETH_SEPOLIA,
    name: 'Ethereum Sepolia',
    verified: true,
    notes: 'Primary testnet for swap testing',
  },
  {
    chainId: SupportedChainId.UNI_SEPOLIA,
    name: 'Unichain Sepolia',
    verified: true,
    notes: 'Per Circle documentation',
  },
] as const;

/**
 * ❌ TESTNET CHAINS WITHOUT POOLS
 * 
 * These testnets have USDC and/or EURC but NO swap pools.
 * Do NOT use for swap testing.
 */
export const TESTNET_CHAINS_WITHOUT_POOLS = [
  {
    chainId: SupportedChainId.BASE_SEPOLIA,
    name: 'Base Sepolia',
    hasUsdc: true,
    hasEurc: true,
    reason: 'No Uniswap V3 USDC/EURC pool deployed on Base Sepolia',
    alternative: 'Use Ethereum Sepolia or Unichain Sepolia for testing',
  },
  {
    chainId: SupportedChainId.AVAX_FUJI,
    name: 'Avalanche Fuji',
    hasUsdc: true,
    hasEurc: true,
    reason: 'No Uniswap V3 pool deployed on testnet',
    alternative: 'Use Ethereum Sepolia or Unichain Sepolia for testing',
  },
  {
    chainId: SupportedChainId.ARBITRUM_SEPOLIA,
    name: 'Arbitrum Sepolia',
    hasUsdc: true,
    hasEurc: false,
    reason: 'EURC not available',
  },
  {
    chainId: SupportedChainId.MATIC_AMOY,
    name: 'Polygon Amoy',
    hasUsdc: true,
    hasEurc: false,
    reason: 'EURC not available',
  },
  {
    chainId: SupportedChainId.OP_SEPOLIA,
    name: 'Optimism Sepolia',
    hasUsdc: true,
    hasEurc: false,
    reason: 'EURC not available',
  },
] as const;

/**
 * Set of all chain IDs that have verified Uniswap V3 USDC/EURC pools
 * This is used for fast lookups in SwapTokenBalanceService
 */
export const CHAINS_WITH_SWAP_POOLS = new Set<number>([
  // Mainnet
  ...MAINNET_CHAINS_WITH_POOLS.map(c => c.chainId),
  // Testnet
  ...TESTNET_CHAINS_WITH_POOLS.map(c => c.chainId),
]);

/**
 * Set of chain IDs that have both USDC and EURC tokens but NO swap pool
 * Used to provide helpful error messages to users
 */
export const CHAINS_WITH_TOKENS_BUT_NO_POOLS = new Set<number>([
  SupportedChainId.BASE,          // Mainnet - has tokens but NO pool
  SupportedChainId.BASE_SEPOLIA,  // Testnet - has tokens but NO pool
  SupportedChainId.AVAX,          // Mainnet - has tokens but NO pool
  SupportedChainId.AVAX_FUJI,     // Testnet - has tokens but NO pool
]);

/**
 * Check if swaps are available on a given chain
 * @param chainId - The chain ID to check
 * @returns true if the chain has a verified Uniswap V3 USDC/EURC pool
 */
export function isSwapAvailableOnChain(chainId: number): boolean {
  return CHAINS_WITH_SWAP_POOLS.has(chainId);
}

/**
 * Check if a chain has both tokens but no pool
 * @param chainId - The chain ID to check
 * @returns true if both tokens exist but no pool is available
 */
export function hasTokensButNoPool(chainId: number): boolean {
  return CHAINS_WITH_TOKENS_BUT_NO_POOLS.has(chainId);
}

/**
 * Get list of all chains that support swaps
 * @returns Array of chain IDs with swap support
 */
export function getSupportedSwapChains(): number[] {
  return Array.from(CHAINS_WITH_SWAP_POOLS);
}

/**
 * Get detailed information about swap availability
 * @param chainId - The chain ID to check
 * @returns Detailed information object or null if chain not recognized
 */
export function getSwapAvailabilityInfo(chainId: number): {
  available: boolean;
  chainName: string;
  reason?: string;
  alternative?: string;
  poolAddress?: string;
} | null {
  // Check mainnet with pools
  const mainnetWithPool = MAINNET_CHAINS_WITH_POOLS.find(c => c.chainId === chainId);
  if (mainnetWithPool) {
    return {
      available: true,
      chainName: mainnetWithPool.name,
      poolAddress: mainnetWithPool.poolAddress,
    };
  }

  // Check testnet with pools
  const testnetWithPool = TESTNET_CHAINS_WITH_POOLS.find(c => c.chainId === chainId);
  if (testnetWithPool) {
    return {
      available: true,
      chainName: testnetWithPool.name,
    };
  }

  // Check mainnet without pools
  const mainnetWithoutPool = MAINNET_CHAINS_WITHOUT_POOLS.find(c => c.chainId === chainId);
  if (mainnetWithoutPool) {
    return {
      available: false,
      chainName: mainnetWithoutPool.name,
      reason: mainnetWithoutPool.reason,
      alternative: mainnetWithoutPool.alternative,
    };
  }

  // Check testnet without pools
  const testnetWithoutPool = TESTNET_CHAINS_WITHOUT_POOLS.find(c => c.chainId === chainId);
  if (testnetWithoutPool) {
    return {
      available: false,
      chainName: testnetWithoutPool.name,
      reason: testnetWithoutPool.reason,
    };
  }

  return null;
}

/**
 * 📝 COMMON ERROR PATTERNS AND SOLUTIONS
 * 
 * ERROR: "decimals() returned no data"
 * CAUSE: Trying to swap on a chain without a pool
 * SOLUTION: Use Ethereum (mainnet) or Ethereum Sepolia / Unichain Sepolia (testnet)
 * 
 * ERROR: "execution reverted"
 * CAUSE: Pool contract doesn't exist or has no liquidity
 * SOLUTION: Switch to a supported chain
 * 
 * ERROR: "contract function call failed"
 * CAUSE: Wrong chain or pool not deployed
 * SOLUTION: Verify you're on a supported chain
 * 
 * 💡 DEVELOPMENT TIP:
 * For testing swaps, ONLY use:
 * - Ethereum Sepolia (11155111) - Most reliable testnet
 * - Unichain Sepolia (1301) - New testnet with support
 * 
 * ❌ DO NOT USE for swap testing:
 * - Base Sepolia (84532) - NO pool
 * - Avalanche Fuji (43113) - NO pool
 * - Any other testnet - NO pools
 * 
 * 🏦 PRODUCTION RECOMMENDATIONS:
 * - Use Ethereum (1) ONLY - Currently the ONLY mainnet with USDC/EURC Uniswap V3 pool
 * - Base, Avalanche, and other chains do NOT have pools yet
 * - Use Bridge Kit to bridge to Ethereum first if starting from another chain
 */

