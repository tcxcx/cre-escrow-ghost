/**
 * Peanut fallback wallet gas utilities — DRY, reusable across apps.
 *
 * Used by:
 * - BatchPaymentService: pre-flight check before creating claim links
 * - Admin dashboard Wallet Service: balance display
 */

import { createPublicClient, http } from 'viem';
import { formatEther } from 'viem';
import { getPeanutFallbackAddress } from '@bu/env/peanut';
import { getCircleNameFromChainId } from '../constants/ChainMappings';
import { getEvmRpcConfig } from '../constants/Chains';
import { getPayoutChainInfo } from '../constants/PayoutConfig';

/** Minimum native balance (ETH) required for Peanut fallback to create links */
export const MIN_PEANUT_GAS_ETH = '0.001';

/** User-facing error when fallback has no gas */
export const PEANUT_NO_GAS_MESSAGE =
  'Peanut fallback wallet has no gas on this chain. Please contact support.';

/**
 * Fetch native balance for an address on an EVM chain.
 * Returns balance as human-readable string (e.g. "0.05").
 */
export async function getNativeBalanceForChain(
  chainId: number,
  address: string
): Promise<string> {
  const addr = address.startsWith('0x') ? address : `0x${address}`;
  const circleName = getCircleNameFromChainId(chainId);
  if (!circleName) return '0';

  const config = getEvmRpcConfig(circleName);
  if (!config?.rpcUrl) return '0';

  const chainInfo = getPayoutChainInfo(chainId);
  const chainName = chainInfo?.name ?? 'Unknown';

  const client = createPublicClient({
    transport: http(config.rpcUrl),
    chain: {
      id: chainId,
      name: chainName,
      nativeCurrency: { decimals: 18, name: 'ETH', symbol: 'ETH' },
      rpcUrls: { default: { http: [config.rpcUrl] } },
    },
  });

  const balance = await client.getBalance({ address: addr as `0x${string}` });
  return formatEther(balance);
}

/**
 * Get native balance for PEANUT_FALLBACK_ADDRESS on a chain.
 * Returns "0" if address not configured.
 */
export async function getPeanutFallbackNativeBalance(chainId: number): Promise<string> {
  const address = getPeanutFallbackAddress();
  if (!address?.trim()) return '0';
  return getNativeBalanceForChain(chainId, address);
}

/**
 * Assert that PEANUT_FALLBACK_ADDRESS has native gas on the given chain.
 * Call before creating claimable links. Throws if no gas.
 */
export async function assertPeanutFallbackHasGas(chainId: number): Promise<void> {
  const address = getPeanutFallbackAddress();
  if (!address?.trim()) {
    throw new Error(PEANUT_NO_GAS_MESSAGE);
  }

  const balance = await getNativeBalanceForChain(chainId, address);
  const balanceEth = parseFloat(balance);
  const chainInfo = getPayoutChainInfo(chainId);
  const chainName = chainInfo?.name ?? `chain ${chainId}`;

  if (balanceEth < parseFloat(MIN_PEANUT_GAS_ETH)) {
    throw new Error(
      `Peanut fallback wallet has no gas on ${chainName}. Please contact support. (balance: ${balance} ETH, required: ${MIN_PEANUT_GAS_ETH} ETH)`
    );
  }
}
