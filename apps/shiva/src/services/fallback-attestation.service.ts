/**
 * Fallback Attestation Service
 *
 * Publishes a BUAttestation on-chain when the CRE workflow is unavailable
 * and Shiva runs inline AI verification as a fallback. This maintains an
 * on-chain audit trail even when CRE is down.
 *
 * Non-blocking — callers should wrap in try/catch and log warnings on failure.
 */

import { createWalletClient, http, keccak256, toHex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { createLogger } from '@bu/logger'

const logger = createLogger({ prefix: 'fallback-attestation' })

const BU_ATTESTATION_ADDRESS = '0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C' as const

/** OpType enum values matching BUAttestation contract */
const OP_TYPE_ESCROW_VERIFY = 11

const ATTEST_ABI = [
  {
    name: 'attest',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'opType', type: 'uint8' },
      { name: 'entityId', type: 'string' },
      { name: 'dataHash', type: 'bytes32' },
      { name: 'metadata', type: 'string' },
    ],
    outputs: [],
  },
] as const

interface FallbackAttestationParams {
  agreementId: string
  milestoneIndex: number
  verdict: unknown
  source: string
}

/**
 * Publish a BUAttestation on-chain for a fallback verification result.
 *
 * Requires `CRE_ETH_PRIVATE_KEY` env var to be set.
 * Silently returns if the key is not configured.
 */
export async function publishFallbackAttestation(params: FallbackAttestationParams): Promise<void> {
  const deployerKey = process.env.CRE_ETH_PRIVATE_KEY
  if (!deployerKey) {
    logger.debug('CRE_ETH_PRIVATE_KEY not set, skipping fallback attestation')
    return
  }

  const account = privateKeyToAccount(deployerKey as `0x${string}`)
  const client = createWalletClient({
    account,
    chain: sepolia,
    transport: http(),
  })

  const dataHash = keccak256(toHex(JSON.stringify(params.verdict)))
  const metadata = JSON.stringify({
    source: params.source,
    milestone: params.milestoneIndex,
    timestamp: Math.floor(Date.now() / 1000),
  })

  const txHash = await client.writeContract({
    address: BU_ATTESTATION_ADDRESS,
    abi: ATTEST_ABI,
    functionName: 'attest',
    args: [
      OP_TYPE_ESCROW_VERIFY,
      params.agreementId,
      dataHash,
      metadata,
    ],
  })

  logger.info('Fallback attestation published', {
    agreementId: params.agreementId,
    txHash,
  })
}
