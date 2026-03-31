/**
 * Bridge Kit Chain Name Mappings
 * Maps numeric EVM chain IDs (and Solana sentinels) to Bridge Kit chain names.
 * Bridge Kit uses string chain names like "Arbitrum", "Base", "Solana", "Ethereum_Sepolia"
 * — NOT numeric chain IDs.
 */

export const BRIDGE_CHAIN_NAMES: Record<number, string> = {
  // Mainnet EVM
  1: 'Ethereum',
  8453: 'Base',
  42161: 'Arbitrum',
  43114: 'Avalanche',
  137: 'Polygon',
  10: 'Optimism',
  // Solana (uses sentinel values since it doesn't have numeric EVM chain IDs)
  [-1]: 'Solana', // SOL_MAINNET sentinel
  [-2]: 'Solana_Devnet', // SOL_DEVNET sentinel
  // Testnet EVM
  11155111: 'Ethereum_Sepolia',
  84532: 'Base_Sepolia',
  421614: 'Arbitrum_Sepolia',
  43113: 'Avalanche_Fuji',
  80002: 'Polygon_Amoy_Testnet',
  11155420: 'Optimism_Sepolia',
  1301: 'Unichain_Sepolia',
  4801: 'World_Chain_Sepolia',
  // Bridge Kit additional testnet chains
  5042002: 'Arc_Testnet',
  812242: 'Codex_Testnet',
  998: 'HyperEVM_Testnet',
  763373: 'Ink_Testnet',
  59141: 'Linea_Sepolia',
  10143: 'Monad_Testnet',
  98867: 'Plume_Testnet',
  1328: 'Sei_Testnet',
  14601: 'Sonic_Testnet',
  51: 'XDC_Apothem',
} as const;

export type BridgeChainName = (typeof BRIDGE_CHAIN_NAMES)[keyof typeof BRIDGE_CHAIN_NAMES];

export function getBridgeChainName(chainId: number): string {
  const name = BRIDGE_CHAIN_NAMES[chainId];
  if (!name) {
    throw new Error(`Unsupported chain ID for Bridge Kit: ${chainId}`);
  }
  return name;
}
