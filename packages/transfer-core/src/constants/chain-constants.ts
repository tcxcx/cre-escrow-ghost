// Chain Configurations and Token Addresses
export const SupportedChainId = {
  ETH: 1,
  BASE: 8453,
  ARBITRUM: 42161,
  AVAX: 43114,
  MATIC: 137,
  UNI: 130,
  OPTIMISM: 10,
  WORLDCHAIN: 480,
  ARC: 5765, // TODO: Placeholder — update to actual chain ID upon Arc mainnet launch
  SOL_MAINNET: -1,
  SOL_DEVNET: -2,
  ETH_SEPOLIA: 11155111,
  AVAX_FUJI: 43113,
  BASE_SEPOLIA: 84532,
  ARBITRUM_SEPOLIA: 421614,
  MATIC_AMOY: 80002,
  UNI_SEPOLIA: 1301,
  OP_SEPOLIA: 11155420,
  WORLDCHAIN_SEPOLIA: 4801,
  // Bridge Kit testnet chains
  ARC_TESTNET: 5042002,
  CODEX_TESTNET: 812242,
  HYPEREVM_TESTNET: 998,
  INK_TESTNET: 763373,
  LINEA_SEPOLIA: 59141,
  MONAD_TESTNET: 10143,
  PLUME_TESTNET: 98867,
  SEI_TESTNET: 1328,
  SONIC_TESTNET: 14601,
  XDC_APOTHEM: 51,
  ROBINHOOD_TESTNET: 46630,
} as const;

export type SupportedChainIdType = (typeof SupportedChainId)[keyof typeof SupportedChainId];

// USDC Contract Addresses (Mainnet + Testnet): https://developers.circle.com/stablecoins/usdc-contract-addresses
export const CHAIN_IDS_TO_USDC_ADDRESSES: Record<number, string> = {
  // Mainnet chains
  [SupportedChainId.ETH]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
  [SupportedChainId.BASE]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
  [SupportedChainId.ARBITRUM]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
  [SupportedChainId.AVAX]: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Avalanche
  [SupportedChainId.MATIC]: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon
  [SupportedChainId.OPTIMISM]: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism
  [SupportedChainId.UNI]: '0x078D782b760474a361dDA0AF3839290b0EF57AD6', // Unichain
  [SupportedChainId.WORLDCHAIN]: '0x79A02482A880bCe3F13E09da970dC34dB4cD24D1', // Worldchain

  // Testnet chains
  [SupportedChainId.ETH_SEPOLIA]: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  [SupportedChainId.AVAX_FUJI]: '0x5425890298aed601595a70AB815c96711a31Bc65',
  [SupportedChainId.BASE_SEPOLIA]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  [SupportedChainId.ARBITRUM_SEPOLIA]: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  [SupportedChainId.MATIC_AMOY]: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // Polygon Amoy
  [SupportedChainId.UNI_SEPOLIA]: '0x31d0220469e10c4E71834a79b1f276d740d3768F', // Unichain Sepolia
  [SupportedChainId.OP_SEPOLIA]: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // Optimism Sepolia
  [SupportedChainId.WORLDCHAIN_SEPOLIA]: '0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88', // Worldchain Sepolia

  // Solana (SPL Token mint addresses)
  [SupportedChainId.SOL_MAINNET]: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Solana Mainnet
  [SupportedChainId.SOL_DEVNET]: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Solana Devnet

  // Bridge Kit testnet chains
  [SupportedChainId.ARC_TESTNET]: '0x3600000000000000000000000000000000000000', // Arc Testnet
  [SupportedChainId.CODEX_TESTNET]: '0x6d7f141b6819C2c9CC2f818e6ad549E7Ca090F8f', // Codex Testnet
  [SupportedChainId.HYPEREVM_TESTNET]: '0x2B3370eE501B4a559b57D449569354196457D8Ab', // HyperEVM Testnet
  [SupportedChainId.INK_TESTNET]: '0xFabab97dCE620294D2B0b0e46C68964e326300Ac', // Ink Testnet
  [SupportedChainId.LINEA_SEPOLIA]: '0xFEce4462D57bD51A6A552365A011b95f0E16d9B7', // Linea Sepolia
  [SupportedChainId.MONAD_TESTNET]: '0x534b2f3A21130d7a60830c2Df862319e593943A3', // Monad Testnet
  [SupportedChainId.PLUME_TESTNET]: '0xcB5f30e335672893c7eb944B374c196392C19D18', // Plume Testnet
  [SupportedChainId.SEI_TESTNET]: '0x4fCF1784B31630811181f670Aea7A7bEF803eaED', // Sei Testnet
  [SupportedChainId.SONIC_TESTNET]: '0x0BA304580ee7c9a980CF72e55f5Ed2E9fd30Bc51', // Sonic Testnet
  [SupportedChainId.XDC_APOTHEM]: '0xb5AB69F7bBada22B28e79C8FFAECe55eF1c771D4', // XDC Apothem
};

// EURC Contract Addresses (Mainnet + Testnet): https://developers.circle.com/stablecoins/eurc-contract-addresses
export const CHAIN_IDS_TO_EURC_ADDRESSES: Record<number, string> = {
  [SupportedChainId.ETH]: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
  [SupportedChainId.BASE]: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
  [SupportedChainId.AVAX]: '0xC891EB4cbdEFf6e073e859e987815Ed1505c2ACD',

  [SupportedChainId.ETH_SEPOLIA]: '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4',
  [SupportedChainId.AVAX_FUJI]: '0x5E44db7996c682E92a960b65AC713a54AD815c6B',
  [SupportedChainId.BASE_SEPOLIA]: '0x808456652fdb597867f38412077A9182bf77359F',
};

export const SUPPORTED_CHAINS = Object.values(SupportedChainId);

export const CHAIN_TO_CHAIN_NAME: Record<number, string> = {
  [SupportedChainId.ARBITRUM]: 'Arbitrum',
  [SupportedChainId.AVAX]: 'Avalanche',
  [SupportedChainId.BASE]: 'Base',
  [SupportedChainId.ETH]: 'Ethereum',
  [SupportedChainId.OPTIMISM]: 'Optimism',
  [SupportedChainId.MATIC]: 'Polygon',
  [SupportedChainId.UNI]: 'Unichain',
  [SupportedChainId.WORLDCHAIN]: 'Worldchain',
  [SupportedChainId.ARC]: 'Arc', // TODO: Mainnet launch pending
  [SupportedChainId.SOL_MAINNET]: 'Solana',
  [SupportedChainId.SOL_DEVNET]: 'Solana Devnet',
  [SupportedChainId.ARBITRUM_SEPOLIA]: 'Arbitrum Sepolia',
  [SupportedChainId.AVAX_FUJI]: 'Avalanche Fuji',
  [SupportedChainId.ETH_SEPOLIA]: 'Ethereum Sepolia',
  [SupportedChainId.BASE_SEPOLIA]: 'Base Sepolia',
  [SupportedChainId.OP_SEPOLIA]: 'Optimism Sepolia',
  [SupportedChainId.MATIC_AMOY]: 'Polygon Amoy',
  [SupportedChainId.UNI_SEPOLIA]: 'Unichain Sepolia',
  [SupportedChainId.WORLDCHAIN_SEPOLIA]: 'Worldchain Sepolia',
  // Bridge Kit testnet chains
  [SupportedChainId.ARC_TESTNET]: 'Arc Testnet',
  [SupportedChainId.CODEX_TESTNET]: 'Codex Testnet',
  [SupportedChainId.HYPEREVM_TESTNET]: 'HyperEVM Testnet',
  [SupportedChainId.INK_TESTNET]: 'Ink Testnet',
  [SupportedChainId.LINEA_SEPOLIA]: 'Linea Sepolia',
  [SupportedChainId.MONAD_TESTNET]: 'Monad Testnet',
  [SupportedChainId.PLUME_TESTNET]: 'Plume Testnet',
  [SupportedChainId.SEI_TESTNET]: 'Sei Testnet',
  [SupportedChainId.SONIC_TESTNET]: 'Sonic Testnet',
  [SupportedChainId.XDC_APOTHEM]: 'XDC Apothem',
};

// Create reverse mapping for blockchain name to chain ID lookup
const CHAIN_NAME_TO_CHAIN_ID: Record<string, number> = Object.entries(CHAIN_TO_CHAIN_NAME).reduce(
  (acc, [chainId, chainName]) => {
    acc[chainName.toUpperCase()] = Number(chainId);
    return acc;
  },
  {} as Record<string, number>
);

// Add additional aliases for common blockchain name variations
const BLOCKCHAIN_ALIASES: Record<string, number> = {
  ETH: SupportedChainId.ETH,
  ETHEREUM: SupportedChainId.ETH,
  'ETH-SEPOLIA': SupportedChainId.ETH_SEPOLIA,
  ARB: SupportedChainId.ARBITRUM,
  'ARB-SEPOLIA': SupportedChainId.ARBITRUM_SEPOLIA,
  'ARBITRUM-SEPOLIA': SupportedChainId.ARBITRUM_SEPOLIA,
  AVAX: SupportedChainId.AVAX,
  'AVAX-FUJI': SupportedChainId.AVAX_FUJI,
  'AVALANCHE-FUJI': SupportedChainId.AVAX_FUJI,
  'BASE-SEPOLIA': SupportedChainId.BASE_SEPOLIA,
  MATIC: SupportedChainId.MATIC,
  'MATIC-AMOY': SupportedChainId.MATIC_AMOY,
  'POLYGON-AMOY': SupportedChainId.MATIC_AMOY,
  OP: SupportedChainId.OPTIMISM,
  'OP-SEPOLIA': SupportedChainId.OP_SEPOLIA,
  'OPTIMISM-SEPOLIA': SupportedChainId.OP_SEPOLIA,
  UNI: SupportedChainId.UNI,
  'UNI-SEPOLIA': SupportedChainId.UNI_SEPOLIA,
  'UNICHAIN-SEPOLIA': SupportedChainId.UNI_SEPOLIA,
  'WORLDCHAIN-SEPOLIA': SupportedChainId.WORLDCHAIN_SEPOLIA,
  SOL: SupportedChainId.SOL_MAINNET,
  SOLANA: SupportedChainId.SOL_MAINNET,
  'SOLANA-DEVNET': SupportedChainId.SOL_DEVNET,
  'SOL-DEVNET': SupportedChainId.SOL_DEVNET,
  // Bridge Kit testnet chains — bare names (e.g. 'ARC', 'CODEX', 'SONIC')
  // are intentionally omitted so they don't silently map to testnet chain IDs.
  // When these chains launch mainnet, bare names will fall through to
  // CHAIN_NAME_TO_CHAIN_ID and resolve to the correct mainnet chain ID.
  // Always use the explicit testnet qualifier (e.g. 'CODEX-TESTNET', 'LINEA-SEPOLIA').
  'ARC-TESTNET': SupportedChainId.ARC_TESTNET,
  'ARC TESTNET': SupportedChainId.ARC_TESTNET,
  'CODEX-TESTNET': SupportedChainId.CODEX_TESTNET,
  'CODEX TESTNET': SupportedChainId.CODEX_TESTNET,
  'HYPEREVM-TESTNET': SupportedChainId.HYPEREVM_TESTNET,
  'HYPEREVM TESTNET': SupportedChainId.HYPEREVM_TESTNET,
  'INK-TESTNET': SupportedChainId.INK_TESTNET,
  'INK TESTNET': SupportedChainId.INK_TESTNET,
  'LINEA-SEPOLIA': SupportedChainId.LINEA_SEPOLIA,
  'LINEA SEPOLIA': SupportedChainId.LINEA_SEPOLIA,
  'MONAD-TESTNET': SupportedChainId.MONAD_TESTNET,
  'MONAD TESTNET': SupportedChainId.MONAD_TESTNET,
  'PLUME-TESTNET': SupportedChainId.PLUME_TESTNET,
  'PLUME TESTNET': SupportedChainId.PLUME_TESTNET,
  'SEI-TESTNET': SupportedChainId.SEI_TESTNET,
  'SEI TESTNET': SupportedChainId.SEI_TESTNET,
  'SONIC-TESTNET': SupportedChainId.SONIC_TESTNET,
  'SONIC TESTNET': SupportedChainId.SONIC_TESTNET,
  'XDC-APOTHEM': SupportedChainId.XDC_APOTHEM,
  'XDC APOTHEM': SupportedChainId.XDC_APOTHEM,
};

export function getChainIdFromBlockchain(blockchain: string): number | null {
  const name = blockchain.toUpperCase();

  // First check aliases for exact matches
  if (BLOCKCHAIN_ALIASES[name]) {
    return BLOCKCHAIN_ALIASES[name];
  }

  // Then check the reverse mapping from CHAIN_TO_CHAIN_NAME
  if (CHAIN_NAME_TO_CHAIN_ID[name]) {
    return CHAIN_NAME_TO_CHAIN_ID[name];
  }

  return null;
}
