/**
 * ERC-8004 (Trustless Agents) — Registry addresses + minimal ABI helpers.
 *
 * Source of addresses: erc-8004/erc-8004-contracts README.
 *
 * Notes:
 * - The repo currently lists the same registry addresses reused across many mainnets,
 *   and the same addresses reused across many testnets.
 * - For newer / nonstandard networks (e.g., MegaETH, Monad), chainIds may vary—prefer
 *   passing explicit addresses or extending the CHAIN_ID_MAP below in your app.
 */

export type Address = `0x${string}`

export type Erc8004RegistryAddresses = {
  identityRegistry: Address
  reputationRegistry: Address
  validationRegistry?: Address // optional; spec/impl still evolving
}

export type KnownChain =
  | 'ethereum'
  | 'sepolia'
  | 'base'
  | 'baseSepolia'
  | 'polygon'
  | 'polygonAmoy'
  | 'arbitrum'
  | 'arbitrumSepolia'
  | 'optimism'
  | 'optimismSepolia'
  | 'linea'
  | 'lineaSepolia'
  | 'avalanche'
  | 'avalancheFuji'
  | 'celo'
  | 'celoAlfajores'
  | 'gnosis'
  | 'scroll'
  | 'scrollSepolia'

/**
 * Canonical addresses as shown in the README.
 */
export const ERC8004_ADDRESSES: Record<'mainnet' | 'testnet', Erc8004RegistryAddresses> = {
  mainnet: {
    identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
  },
  testnet: {
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
}

/**
 * Common EVM chainIds → which address set to use.
 * Extend freely as you add networks.
 */
export const ERC8004_CHAIN_ID_MAP: Record<number, keyof typeof ERC8004_ADDRESSES> = {
  // Ethereum
  1: 'mainnet',
  11155111: 'testnet', // Sepolia

  // Base
  8453: 'mainnet',
  84532: 'testnet', // Base Sepolia

  // Polygon
  137: 'mainnet',
  80002: 'testnet', // Amoy

  // Arbitrum
  42161: 'mainnet',
  421614: 'testnet', // Arbitrum Sepolia

  // Optimism
  10: 'mainnet',
  11155420: 'testnet', // Optimism Sepolia

  // Linea
  59144: 'mainnet',
  59141: 'testnet', // Linea Sepolia

  // Avalanche
  43114: 'mainnet',
  43113: 'testnet', // Fuji

  // Celo
  42220: 'mainnet',
  44787: 'testnet', // Alfajores

  // Gnosis
  100: 'mainnet',

  // Scroll
  534352: 'mainnet',
  534351: 'testnet', // Scroll Sepolia
}

/**
 * Resolve ERC-8004 registry addresses for a chainId.
 * Returns undefined if the chainId is unknown to the map.
 */
export function getErc8004AddressesByChainId(chainId: number): Erc8004RegistryAddresses | undefined {
  const tier = ERC8004_CHAIN_ID_MAP[chainId]
  return tier ? ERC8004_ADDRESSES[tier] : undefined
}

/**
 * Resolve ERC-8004 registry addresses by "known chain" key used in your app.
 * This is sometimes simpler than chainIds when you already have a network selector.
 */
export function getErc8004AddressesByKnownChain(chain: KnownChain): Erc8004RegistryAddresses {
  const isMainnet =
    chain === 'ethereum' ||
    chain === 'base' ||
    chain === 'polygon' ||
    chain === 'arbitrum' ||
    chain === 'optimism' ||
    chain === 'linea' ||
    chain === 'avalanche' ||
    chain === 'celo' ||
    chain === 'gnosis' ||
    chain === 'scroll'

  return isMainnet ? ERC8004_ADDRESSES.mainnet : ERC8004_ADDRESSES.testnet
}

/**
 * Minimal ABI fragments (viem/ethers compatible).
 * Keep these small to avoid bundling full artifacts.
 */
export const IDENTITY_REGISTRY_ABI = [
  // ERC-721 basics
  { type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ name: 'agentId', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'tokenURI', stateMutability: 'view', inputs: [{ name: 'agentId', type: 'uint256' }], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'setApprovalForAll', stateMutability: 'nonpayable', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },

  // ERC-8004 core
  { type: 'function', name: 'register', stateMutability: 'nonpayable', inputs: [{ name: 'agentURI', type: 'string' }], outputs: [{ name: 'agentId', type: 'uint256' }] },
  { type: 'function', name: 'setAgentURI', stateMutability: 'nonpayable', inputs: [{ name: 'agentId', type: 'uint256' }, { name: 'newURI', type: 'string' }], outputs: [] },

  // Optional on-chain metadata
  { type: 'function', name: 'getMetadata', stateMutability: 'view', inputs: [{ name: 'agentId', type: 'uint256' }, { name: 'metadataKey', type: 'string' }], outputs: [{ type: 'bytes' }] },
  { type: 'function', name: 'setMetadata', stateMutability: 'nonpayable', inputs: [{ name: 'agentId', type: 'uint256' }, { name: 'metadataKey', type: 'string' }, { name: 'metadataValue', type: 'bytes' }], outputs: [] },

  // Reserved "agentWallet" helpers
  { type: 'function', name: 'getAgentWallet', stateMutability: 'view', inputs: [{ name: 'agentId', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'unsetAgentWallet', stateMutability: 'nonpayable', inputs: [{ name: 'agentId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'setAgentWallet', stateMutability: 'nonpayable', inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'newWallet', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ], outputs: [] },
] as const

export const REPUTATION_REGISTRY_ABI = [
  { type: 'function', name: 'getIdentityRegistry', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },

  // Write
  { type: 'function', name: 'giveFeedback', stateMutability: 'nonpayable', inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'endpoint', type: 'string' },
      { name: 'feedbackURI', type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' },
    ], outputs: [] },

  { type: 'function', name: 'revokeFeedback', stateMutability: 'nonpayable', inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'feedbackIndex', type: 'uint64' },
    ], outputs: [] },

  { type: 'function', name: 'appendResponse', stateMutability: 'nonpayable', inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddress', type: 'address' },
      { name: 'feedbackIndex', type: 'uint64' },
      { name: 'responseURI', type: 'string' },
      { name: 'responseHash', type: 'bytes32' },
    ], outputs: [] },

  // Read
  { type: 'function', name: 'readFeedback', stateMutability: 'view', inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddress', type: 'address' },
      { name: 'feedbackIndex', type: 'uint64' },
    ], outputs: [
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'isRevoked', type: 'bool' },
    ] },

  { type: 'function', name: 'readAllFeedback', stateMutability: 'view', inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddresses', type: 'address[]' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'includeRevoked', type: 'bool' },
    ], outputs: [
      { name: 'clients', type: 'address[]' },
      { name: 'feedbackIndexes', type: 'uint64[]' },
      { name: 'values', type: 'int128[]' },
      { name: 'valueDecimals', type: 'uint8[]' },
      { name: 'tag1s', type: 'string[]' },
      { name: 'tag2s', type: 'string[]' },
      { name: 'revokedStatuses', type: 'bool[]' },
    ] },

  { type: 'function', name: 'getSummary', stateMutability: 'view', inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddresses', type: 'address[]' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
    ], outputs: [
      { name: 'count', type: 'uint64' },
      { name: 'summaryValue', type: 'int128' },
      { name: 'summaryValueDecimals', type: 'uint8' },
    ] },
] as const

/**
 * Validation Registry ABI — per ERC-8004 spec Validation Registry section.
 * https://eips.ethereum.org/EIPS/eip-8004
 */
export const VALIDATION_REGISTRY_ABI = [
  { type: 'function', name: 'getIdentityRegistry', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },

  // Write
  { type: 'function', name: 'validationRequest', stateMutability: 'nonpayable', inputs: [
      { name: 'validatorAddress', type: 'address' },
      { name: 'agentId', type: 'uint256' },
      { name: 'requestURI', type: 'string' },
      { name: 'requestHash', type: 'bytes32' },
    ], outputs: [] },

  { type: 'function', name: 'validationResponse', stateMutability: 'nonpayable', inputs: [
      { name: 'requestHash', type: 'bytes32' },
      { name: 'response', type: 'uint8' },
      { name: 'responseURI', type: 'string' },
      { name: 'responseHash', type: 'bytes32' },
      { name: 'tag', type: 'string' },
    ], outputs: [] },

  // Read
  { type: 'function', name: 'getValidationStatus', stateMutability: 'view', inputs: [
      { name: 'requestHash', type: 'bytes32' },
    ], outputs: [
      { name: 'validatorAddress', type: 'address' },
      { name: 'agentId', type: 'uint256' },
      { name: 'response', type: 'uint8' },
      { name: 'responseHash', type: 'bytes32' },
      { name: 'tag', type: 'string' },
      { name: 'lastUpdate', type: 'uint256' },
    ] },

  { type: 'function', name: 'getSummary', stateMutability: 'view', inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'validatorAddresses', type: 'address[]' },
      { name: 'tag', type: 'string' },
    ], outputs: [
      { name: 'count', type: 'uint64' },
      { name: 'averageResponse', type: 'uint8' },
    ] },

  { type: 'function', name: 'getAgentValidations', stateMutability: 'view', inputs: [
      { name: 'agentId', type: 'uint256' },
    ], outputs: [
      { name: 'requestHashes', type: 'bytes32[]' },
    ] },

  { type: 'function', name: 'getValidatorRequests', stateMutability: 'view', inputs: [
      { name: 'validatorAddress', type: 'address' },
    ], outputs: [
      { name: 'requestHashes', type: 'bytes32[]' },
    ] },
] as const

/**
 * Convenience: compute the ERC-8004 "agentRegistry" string for the IdentityRegistry on a given chainId.
 * Spec format: {namespace}:{chainId}:{identityRegistry} where namespace is "eip155" for EVM.
 */
export function formatAgentRegistry(chainId: number, identityRegistry: Address): string {
  return `eip155:${chainId}:${identityRegistry}`
}

// Re-export sub-modules
export * from './types'
export * from './registration'
