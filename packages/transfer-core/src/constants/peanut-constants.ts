import { getPeanutRpcUrl as getRpcUrl } from '@bu/env/peanut';

export const PEANUT_CUSTOM_CHAIN_CONFIGS = {
  43113: {
    name: 'avalanche-fuji',
    mainnet: false,
    v4_4: '0x62c99074c302cbf1393802cdc9995febfe97309d',
    Bv4_4: '0x484cb24aad439e960336fbe667888e20c0b3b439',
  },
} as const;

export const PEANUT_CUSTOM_CONTRACT_ADDRESSES = {
  43113: {
    v4_4: '0x62c99074c302cbf1393802cdc9995febfe97309d',
    Bv4_4: '0x484cb24aad439e960336fbe667888e20c0b3b439',
  },
} as const;

/**
 * Custom RPC URLs for chains that require fallback providers.
 * These are used when the SDK's getDefaultProvider fails.
 *
 * Override per-chain via PEANUT_RPC_URL_{chainId} env vars
 * (e.g. PEANUT_RPC_URL_43113=https://my-rpc.example.com).
 */
function getCustomRpcUrl(chainId: number, fallback: string): string {
  return getRpcUrl(chainId) || fallback;
}

export const PEANUT_CUSTOM_RPC_URLS: Record<number, string> = {
  43113: getCustomRpcUrl(43113, 'https://api.avax-test.network/ext/bc/C/rpc'), // Avalanche Fuji
  // Add more custom RPCs as needed for other chains
} as const;
