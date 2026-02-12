/**
 * ERC-8004 Validation Registry Adapter
 *
 * Wraps VALIDATION_REGISTRY_ABI for requesting and recording
 * independent validation of agent work. Per:
 * https://eips.ethereum.org/EIPS/eip-8004#validation-registry
 *
 * BUFI usage: after CRE Layer 1 verification produces a VerificationReport,
 * the executor calls validationRequest() to anchor the proof on-chain,
 * then validationResponse() with the confidence score (0-100).
 * The escrow contract can then read getValidationStatus(requestHash)
 * to confirm verification before allowing execution.
 */

import {
  encodeFunctionData,
  decodeFunctionResult,
  type PublicClient,
  type WalletClient,
} from 'viem'
import { VALIDATION_REGISTRY_ABI, type Address } from './index'

// ── Types ──────────────────────────────────────────────────────────────────

export interface ValidationStatus {
  validatorAddress: Address
  agentId: bigint
  /** Response score 0-100 (0=failed, 100=passed, intermediate=spectrum) */
  response: number
  responseHash: `0x${string}`
  tag: string
  lastUpdate: bigint
}

// ── Read Functions ─────────────────────────────────────────────────────────

/** Get the status of a validation request */
export async function getValidationStatus(
  client: PublicClient,
  registryAddress: Address,
  requestHash: `0x${string}`
): Promise<ValidationStatus> {
  const result = await client.readContract({
    address: registryAddress,
    abi: VALIDATION_REGISTRY_ABI,
    functionName: 'getValidationStatus',
    args: [requestHash],
  })
  const [validatorAddress, agentId, response, responseHash, tag, lastUpdate] =
    result as [Address, bigint, number, `0x${string}`, string, bigint]
  return { validatorAddress, agentId, response, responseHash, tag, lastUpdate }
}

/** Get aggregated validation statistics for an agent */
export async function getValidationSummary(
  client: PublicClient,
  registryAddress: Address,
  agentId: bigint,
  validatorAddresses: Address[] = [],
  tag = ''
): Promise<{ count: bigint; averageResponse: number }> {
  const result = await client.readContract({
    address: registryAddress,
    abi: VALIDATION_REGISTRY_ABI,
    functionName: 'getSummary',
    args: [agentId, validatorAddresses, tag],
  })
  const [count, averageResponse] = result as [bigint, number]
  return { count, averageResponse }
}

/** Get all validation request hashes for an agent */
export async function getAgentValidations(
  client: PublicClient,
  registryAddress: Address,
  agentId: bigint
): Promise<`0x${string}`[]> {
  const result = await client.readContract({
    address: registryAddress,
    abi: VALIDATION_REGISTRY_ABI,
    functionName: 'getAgentValidations',
    args: [agentId],
  })
  return result as `0x${string}`[]
}

/** Get all request hashes assigned to a validator */
export async function getValidatorRequests(
  client: PublicClient,
  registryAddress: Address,
  validatorAddress: Address
): Promise<`0x${string}`[]> {
  const result = await client.readContract({
    address: registryAddress,
    abi: VALIDATION_REGISTRY_ABI,
    functionName: 'getValidatorRequests',
    args: [validatorAddress],
  })
  return result as `0x${string}`[]
}

// ── Write Functions ────────────────────────────────────────────────────────

/**
 * Request validation of agent work.
 * MUST be called by the owner or operator of agentId.
 *
 * @param validatorAddress - Address of the validator contract
 * @param agentId - The agent requesting validation
 * @param requestURI - Off-chain data for the validator (e.g., VerificationReport JSON)
 * @param requestHash - keccak256 commitment to the request data
 */
export async function requestValidation(
  walletClient: WalletClient,
  registryAddress: Address,
  validatorAddress: Address,
  agentId: bigint,
  requestURI: string,
  requestHash: `0x${string}`
): Promise<`0x${string}`> {
  const txHash = await walletClient.writeContract({
    address: registryAddress,
    abi: VALIDATION_REGISTRY_ABI,
    functionName: 'validationRequest',
    args: [validatorAddress, agentId, requestURI, requestHash],
  })
  return txHash
}

/**
 * Respond to a validation request.
 * MUST be called by the validatorAddress specified in the original request.
 *
 * Can be called multiple times for the same requestHash (progressive validation).
 *
 * @param requestHash - The request being responded to
 * @param response - Score 0-100 (0=failed, 100=passed)
 * @param responseURI - Off-chain evidence (optional)
 * @param responseHash - keccak256 of responseURI content (optional)
 * @param tag - Custom categorization (e.g., "layer1", "soft-finality")
 */
export async function respondToValidation(
  walletClient: WalletClient,
  registryAddress: Address,
  requestHash: `0x${string}`,
  response: number,
  responseURI = '',
  responseHash: `0x${string}` = `0x${'0'.repeat(64)}` as `0x${string}`,
  tag = ''
): Promise<`0x${string}`> {
  const txHash = await walletClient.writeContract({
    address: registryAddress,
    abi: VALIDATION_REGISTRY_ABI,
    functionName: 'validationResponse',
    args: [requestHash, response, responseURI, responseHash, tag],
  })
  return txHash
}

// ── Calldata Encoding (for CRE EVMClient) ──────────────────────────────────

/** Encode validationRequest calldata for CRE */
export function encodeValidationRequestCalldata(
  validatorAddress: Address,
  agentId: bigint,
  requestURI: string,
  requestHash: `0x${string}`
): `0x${string}` {
  return encodeFunctionData({
    abi: VALIDATION_REGISTRY_ABI,
    functionName: 'validationRequest',
    args: [validatorAddress, agentId, requestURI, requestHash],
  })
}

/** Encode validationResponse calldata for CRE */
export function encodeValidationResponseCalldata(
  requestHash: `0x${string}`,
  response: number,
  responseURI = '',
  responseHash: `0x${string}` = `0x${'0'.repeat(64)}` as `0x${string}`,
  tag = ''
): `0x${string}` {
  return encodeFunctionData({
    abi: VALIDATION_REGISTRY_ABI,
    functionName: 'validationResponse',
    args: [requestHash, response, responseURI, responseHash, tag],
  })
}

/** Encode getValidationStatus calldata for CRE EVMClient.callContract */
export function encodeGetValidationStatusCalldata(
  requestHash: `0x${string}`
): `0x${string}` {
  return encodeFunctionData({
    abi: VALIDATION_REGISTRY_ABI,
    functionName: 'getValidationStatus',
    args: [requestHash],
  })
}
