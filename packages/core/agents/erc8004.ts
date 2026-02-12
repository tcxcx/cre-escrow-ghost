import type { PublicClient, WalletClient } from 'viem'
import { type Address } from '@repo/erc-8004'
import { registerAgent, getAgentOwner, setAgentURI } from '@repo/erc-8004/identity'
import { giveFeedback, type FeedbackParams } from '@repo/erc-8004/reputation'

export interface RegisterAgentParams {
  identityRegistry: Address
  agentURI: string
  ownerAddress: Address
}

export async function registerAgentOnchain(
  walletClient: WalletClient,
  params: RegisterAgentParams
): Promise<`0x${string}`> {
  return registerAgent(walletClient, params.identityRegistry, params.agentURI)
}

export async function readAgentOwner(
  publicClient: PublicClient,
  identityRegistry: Address,
  agentId: bigint
): Promise<Address> {
  return getAgentOwner(publicClient, identityRegistry, agentId)
}

export async function updateAgentUri(
  walletClient: WalletClient,
  identityRegistry: Address,
  agentId: bigint,
  newUri: string
): Promise<`0x${string}`> {
  return setAgentURI(walletClient, identityRegistry, agentId, newUri)
}

export async function postReputationFeedback(
  walletClient: WalletClient,
  reputationRegistry: Address,
  feedback: FeedbackParams
): Promise<`0x${string}`> {
  return giveFeedback(walletClient, reputationRegistry, feedback)
}
