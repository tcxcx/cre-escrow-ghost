/**
 * Attestation Service
 *
 * One function call to publish a verified attestation on-chain:
 * encode -> sign via CRE consensus -> write to BUAttestation.sol
 *
 * @example
 * ```ts
 * const result = publishAttestation(runtime, {
 *   type: "transfer_verify",
 *   entityId: "transfer-abc-123",
 *   data: { amount: "100.00", to: "0x..." },
 *   metadata: '{"verified": true}',
 * })
 * runtime.log(`Attestation tx: ${result.txHash}`)
 * ```
 */

import {
  EVMClient,
  getNetwork,
  hexToBase64,
  bytesToHex,
  type Runtime,
} from "@chainlink/cre-sdk"
import { encodeAbiParameters, parseAbiParameters, keccak256, toHex } from "viem"
import type { AttestationConfig, AttestationData, AttestationResult } from "../types"
import { ATTESTATION_OP_TYPES } from "../types"

/**
 * Publish a verified attestation on-chain.
 *
 * This function:
 * 1. Hashes the attestation data (keccak256)
 * 2. ABI-encodes the full attestation payload
 * 3. Signs it via CRE consensus (ECDSA over keccak256)
 * 4. Writes the signed report to BUAttestation.sol via onReport()
 *
 * @template C - Workflow config type (must extend AttestationConfig)
 * @param runtime - CRE runtime instance
 * @param attestation - The attestation data to publish
 * @returns Transaction hash and attestation metadata
 */
export function publishAttestation<C extends AttestationConfig>(
  runtime: Runtime<C>,
  attestation: AttestationData
): AttestationResult {
  const opType = ATTESTATION_OP_TYPES[attestation.type]
  const dataHash = keccak256(toHex(JSON.stringify(attestation.data)))
  const timestamp = Math.floor(Date.now() / 1000)

  runtime.log(
    `Publishing attestation: type=${attestation.type} entity=${attestation.entityId}`
  )

  // 1. ABI-encode the attestation payload
  const reportData = encodeAbiParameters(
    parseAbiParameters(
      "uint8 opType, string entityId, bytes32 dataHash, uint256 timestamp, string metadata"
    ),
    [
      opType,
      attestation.entityId,
      dataHash as `0x${string}`,
      BigInt(timestamp),
      attestation.metadata ?? "",
    ]
  )

  // 2. Sign via CRE consensus
  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result()

  // 3. Resolve chain and write on-chain
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: runtime.config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(
      `publishAttestation: Network not found: ${runtime.config.chainSelectorName}`
    )
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: runtime.config.attestationContract,
      report: reportResponse,
      gasConfig: { gasLimit: runtime.config.gasLimit },
    })
    .result()

  const txHash = bytesToHex(writeResult.txHash ?? new Uint8Array(32))
  const attestationId = keccak256(
    toHex(`${opType}${attestation.entityId}${timestamp}`)
  )

  runtime.log(`Attestation published: tx=${txHash}`)

  return {
    txHash,
    attestationId,
    dataHash,
    timestamp,
  }
}
