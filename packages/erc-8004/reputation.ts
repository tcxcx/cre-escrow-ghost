/**
 * ERC-8004 Reputation Registry Adapter
 *
 * Wraps REPUTATION_REGISTRY_ABI for posting and reading feedback signals.
 * All function signatures per:
 * https://eips.ethereum.org/EIPS/eip-8004#reputation-registry
 *
 * Feedback semantics:
 *   - value (int128) + valueDecimals (uint8, 0-18): signed fixed-point score
 *   - tag1, tag2: developer-defined strings for filtering
 *   - feedbackURI: off-chain JSON with full context
 *   - feedbackHash: keccak256 of feedbackURI content (integrity check)
 */

import {
  encodeFunctionData,
  decodeFunctionResult,
  keccak256,
  toBytes,
  type PublicClient,
  type WalletClient,
} from 'viem'
import { REPUTATION_REGISTRY_ABI, type Address } from './index'
import { BUFI_FEEDBACK_TAGS } from './types'

// ── Types ──────────────────────────────────────────────────────────────────

export interface FeedbackParams {
  agentId: bigint
  /** Signed fixed-point value (e.g., 87 for 87/100) */
  value: bigint
  /** Decimal places (0 for integer scores, 2 for percentages like 99.77) */
  valueDecimals: number
  /** Primary tag (e.g., "accuracy", "consistency") */
  tag1: string
  /** Secondary tag (e.g., case ID, milestone ID) */
  tag2: string
  /** API endpoint being rated (optional) */
  endpoint?: string
  /** URI to off-chain feedback JSON */
  feedbackURI?: string
  /** keccak256 hash of feedbackURI content for integrity */
  feedbackHash?: `0x${string}`
}

export interface FeedbackSummary {
  count: bigint
  summaryValue: bigint
  summaryValueDecimals: number
}

export interface FeedbackEntry {
  value: bigint
  valueDecimals: number
  tag1: string
  tag2: string
  isRevoked: boolean
}

// ── Read Functions ─────────────────────────────────────────────────────────

/** Get aggregated feedback summary for an agent, filtered by clients and tags */
export async function getReputationSummary(
  client: PublicClient,
  registryAddress: Address,
  agentId: bigint,
  clientAddresses: Address[],
  tag1 = '',
  tag2 = ''
): Promise<FeedbackSummary> {
  const result = await client.readContract({
    address: registryAddress,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'getSummary',
    args: [agentId, clientAddresses, tag1, tag2],
  })
  const [count, summaryValue, summaryValueDecimals] = result as [bigint, bigint, number]
  return { count, summaryValue, summaryValueDecimals }
}

/** Read a specific feedback entry */
export async function readFeedback(
  client: PublicClient,
  registryAddress: Address,
  agentId: bigint,
  clientAddress: Address,
  feedbackIndex: bigint
): Promise<FeedbackEntry> {
  const result = await client.readContract({
    address: registryAddress,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'readFeedback',
    args: [agentId, clientAddress, feedbackIndex],
  })
  const [value, valueDecimals, tag1, tag2, isRevoked] = result as [bigint, number, string, string, boolean]
  return { value, valueDecimals, tag1, tag2, isRevoked }
}

// ── Write Functions ────────────────────────────────────────────────────────

/**
 * Post feedback for an agent on the Reputation Registry.
 *
 * Per ERC-8004: the feedback submitter MUST NOT be the agent owner
 * or an approved operator for agentId.
 */
export async function giveFeedback(
  walletClient: WalletClient,
  registryAddress: Address,
  params: FeedbackParams
): Promise<`0x${string}`> {
  const txHash = await walletClient.writeContract({
    address: registryAddress,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'giveFeedback',
    args: [
      params.agentId,
      params.value,
      params.valueDecimals,
      params.tag1,
      params.tag2,
      params.endpoint ?? '',
      params.feedbackURI ?? '',
      params.feedbackHash ?? ('0x' + '0'.repeat(64)) as `0x${string}`,
    ],
  })
  return txHash
}

/** Revoke previously given feedback */
export async function revokeFeedback(
  walletClient: WalletClient,
  registryAddress: Address,
  agentId: bigint,
  feedbackIndex: bigint
): Promise<`0x${string}`> {
  const txHash = await walletClient.writeContract({
    address: registryAddress,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'revokeFeedback',
    args: [agentId, feedbackIndex],
  })
  return txHash
}

/** Append a response to existing feedback */
export async function appendResponse(
  walletClient: WalletClient,
  registryAddress: Address,
  agentId: bigint,
  clientAddress: Address,
  feedbackIndex: bigint,
  responseURI: string,
  responseHash: `0x${string}`
): Promise<`0x${string}`> {
  const txHash = await walletClient.writeContract({
    address: registryAddress,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'appendResponse',
    args: [agentId, clientAddress, feedbackIndex, responseURI, responseHash],
  })
  return txHash
}

// ── Calldata Encoding (for CRE EVMClient) ──────────────────────────────────

/** Encode giveFeedback calldata for CRE EVMClient */
export function encodeGiveFeedbackCalldata(params: FeedbackParams): `0x${string}` {
  return encodeFunctionData({
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'giveFeedback',
    args: [
      params.agentId,
      params.value,
      params.valueDecimals,
      params.tag1,
      params.tag2,
      params.endpoint ?? '',
      params.feedbackURI ?? '',
      params.feedbackHash ?? ('0x' + '0'.repeat(64)) as `0x${string}`,
    ],
  })
}

// ── BUFI-specific Feedback Builders ────────────────────────────────────────

/**
 * Build feedback params for juror accuracy after a case resolves.
 * @param agentId - Juror's ERC-8004 agentId
 * @param accuracyScore - 0-100 (did juror agree with final outcome?)
 * @param caseId - Dispute/case identifier for tag2
 */
export function buildJurorAccuracyFeedback(
  agentId: bigint,
  accuracyScore: number,
  caseId: string
): FeedbackParams {
  return {
    agentId,
    value: BigInt(Math.round(accuracyScore)),
    valueDecimals: 0,
    tag1: BUFI_FEEDBACK_TAGS.ACCURACY,
    tag2: caseId,
  }
}

/**
 * Build feedback params for juror consistency (majority agreement).
 * @param agentId - Juror's ERC-8004 agentId
 * @param agreedWithMajority - true if juror matched majority
 * @param caseId - Dispute/case identifier
 */
export function buildJurorConsistencyFeedback(
  agentId: bigint,
  agreedWithMajority: boolean,
  caseId: string
): FeedbackParams {
  return {
    agentId,
    value: agreedWithMajority ? 1n : 0n,
    valueDecimals: 0,
    tag1: BUFI_FEEDBACK_TAGS.CONSISTENCY,
    tag2: caseId,
  }
}

/**
 * Build feedback params for verifier accuracy.
 * @param agentId - Verifier's ERC-8004 agentId
 * @param confidenceScore - 0-100 confidence from VerificationReport
 * @param caseId - Milestone/submission identifier
 */
export function buildVerifierAccuracyFeedback(
  agentId: bigint,
  confidenceScore: number,
  caseId: string
): FeedbackParams {
  return {
    agentId,
    value: BigInt(Math.round(confidenceScore)),
    valueDecimals: 0,
    tag1: BUFI_FEEDBACK_TAGS.VERIFICATION_ACCURACY,
    tag2: caseId,
  }
}

/**
 * Compute keccak256 hash of a feedback JSON string.
 * Per ERC-8004: feedbackHash is keccak256 of the content referenced by feedbackURI.
 */
export function computeFeedbackHash(jsonContent: string): `0x${string}` {
  return keccak256(toBytes(jsonContent))
}
