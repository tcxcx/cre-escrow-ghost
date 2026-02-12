/**
 * ERC-8004 Identity Registry Adapter
 *
 * Wraps IDENTITY_REGISTRY_ABI for agent registration, URI management,
 * and wallet verification. All function signatures per:
 * https://eips.ethereum.org/EIPS/eip-8004#identity-registry
 */

import {
  encodeFunctionData,
  decodeFunctionResult,
  type PublicClient,
  type WalletClient,
} from 'viem'
import { IDENTITY_REGISTRY_ABI, type Address } from './index'

// ── Read Functions ─────────────────────────────────────────────────────────

/** Get the owner of an agent NFT (ERC-721 ownerOf) */
export async function getAgentOwner(
  client: PublicClient,
  registryAddress: Address,
  agentId: bigint
): Promise<Address> {
  const data = await client.readContract({
    address: registryAddress,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'ownerOf',
    args: [agentId],
  })
  return data as Address
}

/** Get the agentURI (ERC-721 tokenURI) */
export async function getAgentURI(
  client: PublicClient,
  registryAddress: Address,
  agentId: bigint
): Promise<string> {
  const data = await client.readContract({
    address: registryAddress,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'tokenURI',
    args: [agentId],
  })
  return data as string
}

/** Get agent's verified wallet address */
export async function getAgentWallet(
  client: PublicClient,
  registryAddress: Address,
  agentId: bigint
): Promise<Address> {
  const data = await client.readContract({
    address: registryAddress,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'getAgentWallet',
    args: [agentId],
  })
  return data as Address
}

/** Get on-chain metadata for an agent */
export async function getAgentMetadata(
  client: PublicClient,
  registryAddress: Address,
  agentId: bigint,
  metadataKey: string
): Promise<`0x${string}`> {
  const data = await client.readContract({
    address: registryAddress,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'getMetadata',
    args: [agentId, metadataKey],
  })
  return data as `0x${string}`
}

/**
 * Verify an agent is registered and owned by the expected address.
 * Returns true if ownerOf(agentId) === expectedOwner.
 */
export async function verifyAgent(
  client: PublicClient,
  registryAddress: Address,
  agentId: bigint,
  expectedOwner: Address
): Promise<boolean> {
  try {
    const owner = await getAgentOwner(client, registryAddress, agentId)
    return owner.toLowerCase() === expectedOwner.toLowerCase()
  } catch {
    // ownerOf reverts if agent doesn't exist
    return false
  }
}

// ── Write Functions ────────────────────────────────────────────────────────

/**
 * Register a new agent with a URI.
 * Returns the transaction hash. The agentId (tokenId) must be read from the
 * Registered event in the transaction receipt.
 */
export async function registerAgent(
  walletClient: WalletClient,
  registryAddress: Address,
  agentURI: string
): Promise<`0x${string}`> {
  const txHash = await walletClient.writeContract({
    address: registryAddress,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'register',
    args: [agentURI],
  })
  return txHash
}

/** Update an agent's URI */
export async function setAgentURI(
  walletClient: WalletClient,
  registryAddress: Address,
  agentId: bigint,
  newURI: string
): Promise<`0x${string}`> {
  const txHash = await walletClient.writeContract({
    address: registryAddress,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'setAgentURI',
    args: [agentId, newURI],
  })
  return txHash
}

/**
 * Set the agent's verified wallet address.
 * Requires EIP-712 signature from the new wallet for EOAs,
 * or ERC-1271 for smart contract wallets.
 */
export async function setAgentWalletAddress(
  walletClient: WalletClient,
  registryAddress: Address,
  agentId: bigint,
  newWallet: Address,
  deadline: bigint,
  signature: `0x${string}`
): Promise<`0x${string}`> {
  const txHash = await walletClient.writeContract({
    address: registryAddress,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'setAgentWallet',
    args: [agentId, newWallet, deadline, signature],
  })
  return txHash
}

/** Set on-chain metadata for an agent */
export async function setAgentMetadata(
  walletClient: WalletClient,
  registryAddress: Address,
  agentId: bigint,
  metadataKey: string,
  metadataValue: `0x${string}`
): Promise<`0x${string}`> {
  const txHash = await walletClient.writeContract({
    address: registryAddress,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'setMetadata',
    args: [agentId, metadataKey, metadataValue],
  })
  return txHash
}

// ── Calldata Encoding (for CRE EVMClient) ──────────────────────────────────

/**
 * Encode register(agentURI) calldata for use with CRE EVMClient.
 * CRE workflows can't use viem WalletClient directly; they need raw calldata.
 */
export function encodeRegisterCalldata(agentURI: string): `0x${string}` {
  return encodeFunctionData({
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'register',
    args: [agentURI],
  })
}

/** Encode setAgentURI calldata */
export function encodeSetAgentURICalldata(agentId: bigint, newURI: string): `0x${string}` {
  return encodeFunctionData({
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'setAgentURI',
    args: [agentId, newURI],
  })
}

/** Encode ownerOf calldata for read via CRE EVMClient.callContract */
export function encodeOwnerOfCalldata(agentId: bigint): `0x${string}` {
  return encodeFunctionData({
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'ownerOf',
    args: [agentId],
  })
}

/** Decode ownerOf return data */
export function decodeOwnerOfResult(data: `0x${string}`): Address {
  return decodeFunctionResult({
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'ownerOf',
    data,
  }) as Address
}
