
import { getAlchemyApiKey } from '@bu/env/providers';
import { SupportedChainId } from './chain-constants';
import { CIRCLE_NAME_TO_CHAIN_ID } from './ChainMappings';

export const Base = {
  chainId: 8453,
  isMainnet: true,
  name: 'Base',
  nativeCurrency: {
    name: 'Base',
    symbol: 'ETH',
    decimals: 18,
    iconUrls: ['https://app.dynamic.xyz/assets/networks/base.svg'],
  },
  rpcUrls: [`https://base-mainnet.g.alchemy.com/v2/${getAlchemyApiKey() ?? ''}`],
  blockExplorerUrls: ['https://base.blockscout.com'],
  chainName: 'Base',
  vanityName: 'Base',
  networkId: 8453,
  iconUrls: ['https://app.dynamic.xyz/assets/networks/base.svg'],
  supportsBridgeKit: true,
  contractKey: 'base' as const,
};

export const BaseSepolia = {
  chainId: 84532,
  isMainnet: false,
  name: 'Base',
  nativeCurrency: {
    name: 'Base',
    symbol: 'ETH',
    decimals: 18,
    iconUrls: ['https://app.dynamic.xyz/assets/networks/base.svg'],
  },
  rpcUrls: ['https://sepolia.base.org'],
  blockExplorerUrls: ['https://base-sepolia.blockscout.com'],
  chainName: 'BaseSepolia',
  vanityName: 'Base Sepolia',
  networkId: 84532,
  iconUrls: ['https://app.dynamic.xyz/assets/networks/base.svg'],
  supportsBridgeKit: true,
  contractKey: 'baseSepolia' as const,
};

export const EthereumSepolia = {
  chainId: 11155111,
  name: 'Ethereum Sepolia',
  rpcUrls: ['https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
  isMainnet: false,
  networkId: 11155111,
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    iconUrls: ['https://app.dynamic.xyz/assets/networks/eth.svg'],
  },
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
  vanityName: 'Ethereum Sepolia',
  chainName: 'EthereumSepolia',
  iconUrls: ['https://app.dynamic.xyz/assets/networks/eth.svg'],
  supportsBridgeKit: true,
  contractKey: 'ethereumSepolia' as const,
};

export const ZkSync = {
  chainId: 324,
  rpcUrls: ['https://mainnet.era.zksync.io'],
  isMainnet: true,
  networkId: 324,
  name: 'ZkSync',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    iconUrls: ['https://app.dynamic.xyz/assets/networks/eth.svg'],
  },
  blockExplorerUrls: ['https://explorer.zksync.io'],
  vanityName: 'ZkSync',
  chainName: 'ZkSync',
  iconUrls: [
    'https://assets.coingecko.com/coins/images/38043/standard/ZKTokenBlack.png?1718614502',
  ],
  supportsBridgeKit: false,
};

export const ZkSyncSepolia = {
  chainId: 300,
  name: 'ZkSync Sepolia',
  rpcUrls: ['https://sepolia.era.zksync.dev'],
  isMainnet: false,
  networkId: 300,
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    iconUrls: ['https://app.dynamic.xyz/assets/networks/eth.svg'],
  },
  blockExplorerUrls: ['https://sepolia.explorer.zksync.io'],
  vanityName: 'ZkSync Sepolia',
  chainName: 'ZkSyncSepolia',
  iconUrls: [
    'https://assets.coingecko.com/coins/images/38043/standard/ZKTokenBlack.png?1718614502',
  ],
  supportsBridgeKit: false,
};

export const Optimism = {
  chainId: 10,
  name: 'Optimism',
  rpcUrls: ['https://mainnet.optimism.io'],
  isMainnet: true,
  networkId: 10,
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    iconUrls: ['https://app.dynamic.xyz/assets/networks/optimism.svg'],
  },
  blockExplorerUrls: ['https://explorer.optimism.io'],
  vanityName: 'Optimism',
  chainName: 'Optimism',
  iconUrls: ['https://app.dynamic.xyz/assets/networks/optimism.svg'],
  supportsBridgeKit: true,
};

export const Bsc = {
  chainId: 56,
  name: 'BSC',
  rpcUrls: ['https://bsc-dataseed.binance.org'],
  isMainnet: true,
  networkId: 56,
  nativeCurrency: {
    name: 'Binance Smart Chain',
    symbol: 'BNB',
    decimals: 18,
    iconUrls: ['https://app.dynamic.xyz/assets/networks/bsc.svg'],
  },
  blockExplorerUrls: ['https://bscscan.com'],
  vanityName: 'BSC',
  chainName: 'BSC',
  iconUrls: ['https://app.dynamic.xyz/assets/networks/bnb.svg'],
  supportsBridgeKit: false,
};

export const BscTestnet = {
  chainId: 97,
  name: 'BSC Testnet',
  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
  isMainnet: false,
  networkId: 97,
  nativeCurrency: {
    name: 'Binance Smart Chain',
    symbol: 'BNB',
    decimals: 18,
    iconUrls: ['https://app.dynamic.xyz/assets/networks/bsc.svg'],
  },
  blockExplorerUrls: ['https://bscscan.com'],
  vanityName: 'BSC Testnet',
  chainName: 'BscTestnet',
  iconUrls: ['https://app.dynamic.xyz/assets/networks/bnb.svg'],
  supportsBridgeKit: false,
};

export const Avalanche = {
  chainId: 43114,
  isMainnet: true,
  name: 'Avalanche',
  blockExplorerUrls: ['https://snowtrace.io/'],
  nativeCurrency: {
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
    iconUrls: ['https://app.dynamic.xyz/assets/networks/avax.svg'],
  },
  rpcUrls: ['https://rpc.ankr.com/avalanche'],
  vanityName: 'Avalanche ',
  chainName: 'Avalanche',
  networkId: 43114,
  iconUrls: ['https://app.dynamic.xyz/assets/networks/avax.svg'],
  supportsBridgeKit: true,
};

export const AvalancheFuji = {
  chainId: 43113,
  isMainnet: false,
  name: 'Avalanche',
  blockExplorerUrls: ['https://fuji.snowtrace.io/'],
  nativeCurrency: {
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
    iconUrls: ['https://app.dynamic.xyz/assets/networks/avax.svg'],
  },
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
  vanityName: 'Avalanche Fuji',
  chainName: 'AvalancheFuji',
  networkId: 43113,
  iconUrls: ['https://app.dynamic.xyz/assets/networks/avax.svg'],
  contractKey: 'avalancheFuji' as const,
  supportsBridgeKit: true,
};

export const Arbitrum = {
  chainId: 42161,
  isMainnet: true,
  name: 'Arbitrum',
  nativeCurrency: {
    name: 'Arbitrum',
    symbol: 'ARB',
    decimals: 18,
    iconUrls: ['https://app.dynamic.xyz/assets/networks/arbitrum.svg'],
  },
  rpcUrls: [`https://arb-mainnet.g.alchemy.com/v2/${getAlchemyApiKey() ?? ''}`],
  blockExplorerUrls: ['https://explorer.arbitrum.io/'],
  vanityName: 'Arbitrum',
  chainName: 'Arbitrum',
  networkId: 42161,
  iconUrls: ['https://app.dynamic.xyz/assets/networks/arbitrum.svg'],
  supportsBridgeKit: true,
};

export const ArbitrumSepolia = {
  chainId: 421614,
  isMainnet: false,
  name: 'Arbitrum',
  nativeCurrency: {
    name: 'Arbitrum',
    symbol: 'ARB',
    decimals: 18,
    iconUrls: ['https://app.dynamic.xyz/assets/networks/arbitrum.svg'],
  },
  rpcUrls: [`https://arb-sepolia.g.alchemy.com/v2/${getAlchemyApiKey() ?? ''}`],
  blockExplorerUrls: ['https://sepolia-explorer.arbitrum.io/'],
  vanityName: 'Arbitrum Sepolia',
  chainName: 'ArbitrumSepolia',
  networkId: 421614,
  iconUrls: ['https://app.dynamic.xyz/assets/networks/arbitrum.svg'],
  supportsBridgeKit: true,
  contractKey: 'arbitrumSepolia' as const,
};

export const CeloAlfajores = {
  chainId: 44787,
  isMainnet: false,
  name: 'Celo Alfajores',
  nativeCurrency: {
    name: 'Celo',
    decimals: 18,
    symbol: 'CELO',
    iconUrls: ['https://app.dynamic.xyz/assets/networks/celo.svg'],
  },
  rpcUrls: ['https://celo-alfajores.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
  blockExplorerUrls: ['https://alfajores.celoscan.io/'],
  vanityName: 'Celo Alfajores',
  chainName: 'CeloAlfajores',
  networkId: 44787,
  iconUrls: ['https://app.dynamic.xyz/assets/networks/celo.svg'],
  contractKey: 'celoAlfajores' as const,
  supportsBridgeKit: false,
};

export const Solana = {
  chainId: -1, // SOL_MAINNET sentinel
  isMainnet: true,
  name: 'Solana',
  nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9, iconUrls: [] },
  rpcUrls: ['https://api.mainnet-beta.solana.com'],
  blockExplorerUrls: ['https://explorer.solana.com'],
  vanityName: 'Solana',
  chainName: 'Solana',
  networkId: -1,
  iconUrls: [],
  supportsBridgeKit: true,
};

export const SolanaDevnet = {
  chainId: -2, // SOL_DEVNET sentinel
  isMainnet: false,
  name: 'Solana Devnet',
  nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9, iconUrls: [] },
  rpcUrls: ['https://api.devnet.solana.com'],
  blockExplorerUrls: ['https://explorer.solana.com?cluster=devnet'],
  vanityName: 'Solana Devnet',
  chainName: 'SolanaDevnet',
  networkId: -2,
  iconUrls: [],
  supportsBridgeKit: true,
};

export const PolygonAmoy = {
  chainId: 80002,
  isMainnet: false,
  name: 'Polygon Amoy',
  nativeCurrency: { name: 'Polygon', symbol: 'POL', decimals: 18, iconUrls: ['https://app.dynamic.xyz/assets/networks/polygon.svg'] },
  rpcUrls: ['https://rpc-amoy.polygon.technology'],
  blockExplorerUrls: ['https://amoy.polygonscan.com'],
  vanityName: 'Polygon Amoy',
  chainName: 'PolygonAmoy',
  networkId: 80002,
  iconUrls: ['https://app.dynamic.xyz/assets/networks/polygon.svg'],
  supportsBridgeKit: true,
};

export const OptimismSepolia = {
  chainId: 11155420,
  isMainnet: false,
  name: 'Optimism Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18, iconUrls: ['https://app.dynamic.xyz/assets/networks/optimism.svg'] },
  rpcUrls: ['https://sepolia.optimism.io'],
  blockExplorerUrls: ['https://sepolia-optimistic.etherscan.io'],
  vanityName: 'Optimism Sepolia',
  chainName: 'OptimismSepolia',
  networkId: 11155420,
  iconUrls: ['https://app.dynamic.xyz/assets/networks/optimism.svg'],
  supportsBridgeKit: true,
};

export const UnichainSepolia = {
  chainId: 1301,
  isMainnet: false,
  name: 'Unichain Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18, iconUrls: [] },
  rpcUrls: ['https://sepolia.unichain.org'],
  blockExplorerUrls: ['https://sepolia.uniscan.xyz'],
  vanityName: 'Unichain Sepolia',
  chainName: 'UnichainSepolia',
  networkId: 1301,
  iconUrls: [],
  supportsBridgeKit: true,
};

export const WorldchainSepolia = {
  chainId: 4801,
  isMainnet: false,
  name: 'Worldchain Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18, iconUrls: [] },
  rpcUrls: ['https://worldchain-sepolia.g.alchemy.com/public'],
  blockExplorerUrls: ['https://sepolia.worldscan.org'],
  vanityName: 'Worldchain Sepolia',
  chainName: 'WorldchainSepolia',
  networkId: 4801,
  iconUrls: [],
  supportsBridgeKit: true,
};

export const ArcTestnet = {
  chainId: 5042002,
  isMainnet: false,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18, iconUrls: [] },
  rpcUrls: ['https://rpc-testnet.arc.gel.network'],
  blockExplorerUrls: ['https://testnet.arcscan.io'],
  vanityName: 'Arc Testnet',
  chainName: 'ArcTestnet',
  networkId: 5042002,
  iconUrls: [],
  supportsBridgeKit: true,
};

export const CodexTestnet = {
  chainId: 812242,
  isMainnet: false,
  name: 'Codex Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18, iconUrls: [] },
  rpcUrls: ['https://rpc.codex.storage'],
  blockExplorerUrls: ['https://explorer.testnet.codex.storage'],
  vanityName: 'Codex Testnet',
  chainName: 'CodexTestnet',
  networkId: 812242,
  iconUrls: [],
  supportsBridgeKit: true,
};

export const HyperEVMTestnet = {
  chainId: 998,
  isMainnet: false,
  name: 'HyperEVM Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18, iconUrls: [] },
  rpcUrls: ['https://api.hyperliquid-testnet.xyz/evm'],
  blockExplorerUrls: ['https://testnet.purrsec.com'],
  vanityName: 'HyperEVM Testnet',
  chainName: 'HyperEVMTestnet',
  networkId: 998,
  iconUrls: [],
  supportsBridgeKit: true,
};

export const InkTestnet = {
  chainId: 763373,
  isMainnet: false,
  name: 'Ink Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18, iconUrls: [] },
  rpcUrls: ['https://rpc-gel-sepolia.inkonchain.com'],
  blockExplorerUrls: ['https://explorer-sepolia.inkonchain.com'],
  vanityName: 'Ink Testnet',
  chainName: 'InkTestnet',
  networkId: 763373,
  iconUrls: [],
  supportsBridgeKit: true,
};

export const LineaSepolia = {
  chainId: 59141,
  isMainnet: false,
  name: 'Linea Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18, iconUrls: [] },
  rpcUrls: ['https://rpc.sepolia.linea.build'],
  blockExplorerUrls: ['https://sepolia.lineascan.build'],
  vanityName: 'Linea Sepolia',
  chainName: 'LineaSepolia',
  networkId: 59141,
  iconUrls: [],
  supportsBridgeKit: true,
};

export const MonadTestnet = {
  chainId: 10143,
  isMainnet: false,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18, iconUrls: [] },
  rpcUrls: ['https://testnet.monad.xyz'],
  blockExplorerUrls: ['https://testnet.monadexplorer.com'],
  vanityName: 'Monad Testnet',
  chainName: 'MonadTestnet',
  networkId: 10143,
  iconUrls: [],
  supportsBridgeKit: true,
};

export const PlumeTestnet = {
  chainId: 98867,
  isMainnet: false,
  name: 'Plume Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18, iconUrls: [] },
  rpcUrls: ['https://testnet-rpc.plumenetwork.xyz'],
  blockExplorerUrls: ['https://testnet-explorer.plumenetwork.xyz'],
  vanityName: 'Plume Testnet',
  chainName: 'PlumeTestnet',
  networkId: 98867,
  iconUrls: [],
  supportsBridgeKit: true,
};

export const SeiTestnet = {
  chainId: 1328,
  isMainnet: false,
  name: 'Sei Testnet',
  nativeCurrency: { name: 'Sei', symbol: 'SEI', decimals: 18, iconUrls: [] },
  rpcUrls: ['https://evm-rpc-testnet.sei-apis.com'],
  blockExplorerUrls: ['https://seitrace.com/?chain=atlantic-2'],
  vanityName: 'Sei Testnet',
  chainName: 'SeiTestnet',
  networkId: 1328,
  iconUrls: [],
  supportsBridgeKit: true,
};

export const SonicTestnet = {
  chainId: 14601,
  isMainnet: false,
  name: 'Sonic Testnet',
  nativeCurrency: { name: 'Sonic', symbol: 'S', decimals: 18, iconUrls: [] },
  rpcUrls: ['https://rpc.testnet.soniclabs.com'],
  blockExplorerUrls: ['https://testnet.sonicscan.org'],
  vanityName: 'Sonic Testnet',
  chainName: 'SonicTestnet',
  networkId: 14601,
  iconUrls: [],
  supportsBridgeKit: true,
};

export const XDCApothem = {
  chainId: 51,
  isMainnet: false,
  name: 'XDC Apothem',
  nativeCurrency: { name: 'XDC', symbol: 'TXDC', decimals: 18, iconUrls: [] },
  rpcUrls: ['https://erpc.apothem.network'],
  blockExplorerUrls: ['https://apothem.xdcscan.io'],
  vanityName: 'XDC Apothem',
  chainName: 'XDCApothem',
  networkId: 51,
  iconUrls: [],
  supportsBridgeKit: true,
};

export const AllChains = [
  // Arc first, then Solana (per preference)
  ArcTestnet,
  SolanaDevnet,
  // Existing testnet chains
  AvalancheFuji,
  BaseSepolia,
  EthereumSepolia,
  ArbitrumSepolia,
  // Previously partially-plumbed chains
  PolygonAmoy,
  OptimismSepolia,
  UnichainSepolia,
  WorldchainSepolia,
  // New Bridge Kit testnet chains
  CodexTestnet,
  HyperEVMTestnet,
  InkTestnet,
  LineaSepolia,
  MonadTestnet,
  PlumeTestnet,
  SeiTestnet,
  SonicTestnet,
  XDCApothem,
];

// Helper functions
export const getChainById = (chainId: number) => {
  return AllChains.find(chain => chain.chainId === chainId);
};

export const getSupportedProtocols = (chainId: number) => {
  const chain = getChainById(chainId);
  if (!chain) return { bridgeKit: false };

  return {
    bridgeKit: chain.supportsBridgeKit || false,
  };
};

export const canTransferBetweenChains = (fromChainId: number, toChainId: number): boolean => {
  const fromProtocols = getSupportedProtocols(fromChainId);
  const toProtocols = getSupportedProtocols(toChainId);

  return fromProtocols.bridgeKit && toProtocols.bridgeKit;
};

// ---------- EVM RPC lookup (Circle chain name → chainId + rpcUrl) ----------
// Single source of truth for transaction-status verification across all EVM chains.
// Non-EVM chains (Solana) return null.

/** All chain configs including mainnet + testnet */
const ALL_CHAIN_CONFIGS = [
  // Mainnets
  Base, Avalanche, Arbitrum, Optimism,
  // Testnets (already in AllChains)
  ...AllChains,
] as const;

/** Map chain ID → first RPC URL from its config */
const CHAIN_ID_TO_RPC: Record<number, string> = {};
for (const c of ALL_CHAIN_CONFIGS) {
  if (c.chainId > 0 && c.rpcUrls?.[0]) {
    CHAIN_ID_TO_RPC[c.chainId] = c.rpcUrls[0];
  }
}

// Add mainnet chains that aren't in Chains.ts configs but are in SupportedChainId
// (ETH, MATIC, UNI, WORLDCHAIN — using public RPCs)
if (!CHAIN_ID_TO_RPC[SupportedChainId.ETH])
  CHAIN_ID_TO_RPC[SupportedChainId.ETH] = 'https://eth.llamarpc.com';
if (!CHAIN_ID_TO_RPC[SupportedChainId.MATIC])
  CHAIN_ID_TO_RPC[SupportedChainId.MATIC] = 'https://polygon-rpc.com';
if (!CHAIN_ID_TO_RPC[SupportedChainId.UNI])
  CHAIN_ID_TO_RPC[SupportedChainId.UNI] = 'https://mainnet.unichain.org';
if (!CHAIN_ID_TO_RPC[SupportedChainId.WORLDCHAIN])
  CHAIN_ID_TO_RPC[SupportedChainId.WORLDCHAIN] = 'https://worldchain-mainnet.g.alchemy.com/public';

export interface EvmRpcConfig {
  chainId: number;
  rpcUrl: string;
}

/**
 * Resolve a Circle chain name (e.g. "ARB-SEPOLIA", "AVAX") to its EVM chain ID + RPC URL.
 * Returns `null` for Solana or unknown chains.
 */
export function getEvmRpcConfig(circleChainName: string): EvmRpcConfig | null {
  const chainId = CIRCLE_NAME_TO_CHAIN_ID[circleChainName];
  if (chainId == null || chainId < 0) return null; // Solana sentinel or unknown

  const rpcUrl = CHAIN_ID_TO_RPC[chainId];
  if (!rpcUrl) return null;

  return { chainId, rpcUrl };
}
