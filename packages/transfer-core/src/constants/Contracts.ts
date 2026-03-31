import {
  SupportedChainId,
  CHAIN_IDS_TO_USDC_ADDRESSES,
  CHAIN_IDS_TO_EURC_ADDRESSES,
} from './chain-constants';

export const Contracts = {
  // Mainnet chains
  ethereum: {
    chainId: SupportedChainId.ETH,
    usdc: CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.ETH],
    eurc: CHAIN_IDS_TO_EURC_ADDRESSES[SupportedChainId.ETH],
  },
  base: {
    chainId: SupportedChainId.BASE,
    usdc: CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.BASE],
    eurc: CHAIN_IDS_TO_EURC_ADDRESSES[SupportedChainId.BASE],
  },
  arbitrum: {
    chainId: SupportedChainId.ARBITRUM,
    usdc: CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.ARBITRUM],
  },
  avalanche: {
    chainId: SupportedChainId.AVAX,
    usdc: CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.AVAX],
    eurc: CHAIN_IDS_TO_EURC_ADDRESSES[SupportedChainId.AVAX],
  },
  polygon: {
    chainId: SupportedChainId.MATIC,
    usdc: CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.MATIC],
  },
  optimism: {
    chainId: SupportedChainId.OPTIMISM,
    usdc: CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.OPTIMISM],
  },
  unichain: {
    chainId: SupportedChainId.UNI,
    usdc: CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.UNI],
  },
  worldchain: {
    chainId: SupportedChainId.WORLDCHAIN,
    usdc: CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.WORLDCHAIN],
  },

  // Testnet chains
  ethereumSepolia: {
    chainId: SupportedChainId.ETH_SEPOLIA,
    usdc: CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.ETH_SEPOLIA],
    eurc: CHAIN_IDS_TO_EURC_ADDRESSES[SupportedChainId.ETH_SEPOLIA],
  },
  baseSepolia: {
    crossChainRouter: '0xAF28B48E48317109F885FEc05751f5422d850857',
    chainId: SupportedChainId.BASE_SEPOLIA,
    usdc: CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.BASE_SEPOLIA],
    eurc: CHAIN_IDS_TO_EURC_ADDRESSES[SupportedChainId.BASE_SEPOLIA],
  },
  arbitrumSepolia: {
    chainId: SupportedChainId.ARBITRUM_SEPOLIA,
    usdc: CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.ARBITRUM_SEPOLIA],
  },
  avalancheFuji: {
    crossChainRouter: '0x4849D1508dAa8dD952e45ddA1e6953fc2F27F047',
    chainId: SupportedChainId.AVAX_FUJI,
    usdc: CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.AVAX_FUJI],
    eurc: CHAIN_IDS_TO_EURC_ADDRESSES[SupportedChainId.AVAX_FUJI],
  },
  polygonAmoy: {
    chainId: SupportedChainId.MATIC_AMOY,
    usdc: CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.MATIC_AMOY],
  },
  optimismSepolia: {
    chainId: SupportedChainId.OP_SEPOLIA,
    usdc: CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.OP_SEPOLIA],
  },
  unichainSepolia: {
    chainId: SupportedChainId.UNI_SEPOLIA,
    usdc: CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.UNI_SEPOLIA],
  },
  worldchainSepolia: {
    chainId: SupportedChainId.WORLDCHAIN_SEPOLIA,
    usdc: CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.WORLDCHAIN_SEPOLIA],
  },
} as const;

export type ContractKey = keyof typeof Contracts;

// ---------------------------------------------------------------------------
// USYC (Hashnote) Contract Addresses
// ---------------------------------------------------------------------------

export const UsycContracts = {
  /** Hashnote USYC token — yield-bearing T-Bill, ~4.5% APY, 6 decimals */
  token: '0x38D3A3f8717F4DB1CcB4Ad7D8C755919440848A3',
  /** Hashnote Teller — subscribe (USDC→USYC) and redeem (USYC→USDC) */
  teller: '0x96424C885951ceb4B79fecb934eD857999e6f82B',
  /** Chainlink USYC/USD oracle — aggregator interface, 8 decimals, updates daily ~9AM ET */
  oracle: '0x35b96d80C72f873bACc44A1fACfb1f5fac064f1a',
  /** Hashnote Entitlements — KYC gate for USYC access (entity wallet must be on-chain allowlisted) */
  entitlements: '0xFA4400c1B9AC496d9578B4B6507295A5aaD29EE7',
} as const;

// ---------------------------------------------------------------------------
// ACE (Automated Compliance Engine) Vault
// ---------------------------------------------------------------------------

export const AceContracts = {
  /** Chainlink ACE Vault — Sepolia testnet */
  vault: '0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13',
} as const;

// ---------------------------------------------------------------------------
// Circle Gateway Contract Addresses (Testnet — same on all chains)
// ---------------------------------------------------------------------------

export const GatewayContracts = {
  wallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
  minter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B',
} as const;
