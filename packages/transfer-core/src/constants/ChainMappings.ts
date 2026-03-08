// 🔥 DRY: Centralized chain mappings to eliminate duplicates across codebase
import { SupportedChainId } from './chain-constants';

// Circle chain ID to name mappings (used in multiple files)
export const CHAIN_ID_TO_CIRCLE_NAME: Record<number, string> = {
  [SupportedChainId.AVAX_FUJI]: 'AVAX-FUJI',
  [SupportedChainId.ARBITRUM_SEPOLIA]: 'ARB-SEPOLIA',
  [SupportedChainId.ETH_SEPOLIA]: 'ETH-SEPOLIA',
  [SupportedChainId.BASE_SEPOLIA]: 'BASE-SEPOLIA',
  [SupportedChainId.OP_SEPOLIA]: 'OP-SEPOLIA',
  [SupportedChainId.MATIC_AMOY]: 'MATIC-AMOY',
  [SupportedChainId.UNI_SEPOLIA]: 'UNI-SEPOLIA',
  [SupportedChainId.WORLDCHAIN_SEPOLIA]: 'WORLDCHAIN-SEPOLIA',
  // Bridge Kit testnet chains
  [SupportedChainId.ARC_TESTNET]: 'ARC-TESTNET',
  [SupportedChainId.CODEX_TESTNET]: 'CODEX-TESTNET',
  [SupportedChainId.HYPEREVM_TESTNET]: 'HYPEREVM-TESTNET',
  [SupportedChainId.INK_TESTNET]: 'INK-TESTNET',
  [SupportedChainId.LINEA_SEPOLIA]: 'LINEA-SEPOLIA',
  [SupportedChainId.MONAD_TESTNET]: 'MONAD-TESTNET',
  [SupportedChainId.PLUME_TESTNET]: 'PLUME-TESTNET',
  [SupportedChainId.SEI_TESTNET]: 'SEI-TESTNET',
  [SupportedChainId.SONIC_TESTNET]: 'SONIC-TESTNET',
  [SupportedChainId.XDC_APOTHEM]: 'XDC-APOTHEM',

  // Solana
  [SupportedChainId.SOL_MAINNET]: 'SOL',
  [SupportedChainId.SOL_DEVNET]: 'SOL-DEVNET',

  // Mainnet
  [SupportedChainId.AVAX]: 'AVAX',
  [SupportedChainId.ARBITRUM]: 'ARB',
  [SupportedChainId.ETH]: 'ETH',
  [SupportedChainId.BASE]: 'BASE',
  [SupportedChainId.OPTIMISM]: 'OP',
  [SupportedChainId.MATIC]: 'MATIC',
  [SupportedChainId.UNI]: 'UNI',
  [SupportedChainId.WORLDCHAIN]: 'WORLDCHAIN',
} as const;

// Reverse mapping for API compatibility
export const CIRCLE_NAME_TO_CHAIN_ID: Record<string, number> = {
  'AVAX-FUJI': SupportedChainId.AVAX_FUJI,
  'ARB-SEPOLIA': SupportedChainId.ARBITRUM_SEPOLIA,
  'ETH-SEPOLIA': SupportedChainId.ETH_SEPOLIA,
  'BASE-SEPOLIA': SupportedChainId.BASE_SEPOLIA,
  'OP-SEPOLIA': SupportedChainId.OP_SEPOLIA,
  'MATIC-AMOY': SupportedChainId.MATIC_AMOY,
  'UNI-SEPOLIA': SupportedChainId.UNI_SEPOLIA,
  'WORLDCHAIN-SEPOLIA': SupportedChainId.WORLDCHAIN_SEPOLIA,
  // Bridge Kit testnet chains
  'ARC-TESTNET': SupportedChainId.ARC_TESTNET,
  'CODEX-TESTNET': SupportedChainId.CODEX_TESTNET,
  'HYPEREVM-TESTNET': SupportedChainId.HYPEREVM_TESTNET,
  'INK-TESTNET': SupportedChainId.INK_TESTNET,
  'LINEA-SEPOLIA': SupportedChainId.LINEA_SEPOLIA,
  'MONAD-TESTNET': SupportedChainId.MONAD_TESTNET,
  'PLUME-TESTNET': SupportedChainId.PLUME_TESTNET,
  'SEI-TESTNET': SupportedChainId.SEI_TESTNET,
  'SONIC-TESTNET': SupportedChainId.SONIC_TESTNET,
  'XDC-APOTHEM': SupportedChainId.XDC_APOTHEM,

  // Solana
  SOL: SupportedChainId.SOL_MAINNET,
  'SOL-DEVNET': SupportedChainId.SOL_DEVNET,

  // Mainnet
  AVAX: SupportedChainId.AVAX,
  ARB: SupportedChainId.ARBITRUM,
  ETH: SupportedChainId.ETH,
  BASE: SupportedChainId.BASE,
  OP: SupportedChainId.OPTIMISM,
  MATIC: SupportedChainId.MATIC,
  UNI: SupportedChainId.UNI,
  WORLDCHAIN: SupportedChainId.WORLDCHAIN,
} as const;

// Type definitions
export type CircleChainName = keyof typeof CIRCLE_NAME_TO_CHAIN_ID;
export type SupportedChainIdType = (typeof SupportedChainId)[keyof typeof SupportedChainId];

// Utility functions
export function getChainIdFromCircleName(circleName: string): number | null {
  return CIRCLE_NAME_TO_CHAIN_ID[circleName] || null;
}

export function getCircleNameFromChainId(chainId: number): string | null {
  return CHAIN_ID_TO_CIRCLE_NAME[chainId] || null;
}
