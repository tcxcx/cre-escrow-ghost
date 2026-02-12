/**
 * WF-13: FinalizeAndExecute
 *
 * Pattern: bank-stablecoin-por-ace-ccip-workflow/main.ts (mintWithACE function)
 *
 * 1. Computes payout plan (payee BPS, payer BPS, fees)
 * 2. Builds FinalReceiptJSON root artifact
 * 3. Calls EscrowWithAgentV3.setDecision(..., finalReceiptHash) via DON-signed report
 * 4. Calls EscrowWithAgentV3.executeDecision(...) via DON-signed report
 */

import {
  bytesToHex,
  EVMClient,
  getNetwork,
  hexToBase64,
  type Runtime,
  TxStatus,
} from '@chainlink/cre-sdk'
import { encodeAbiParameters, parseAbiParameters } from 'viem'
import { hashDocument } from '../adapters/audit'
import type { Config } from '../main'

// ── Types ──────────────────────────────────────────────────────────────────

export interface FinalizeInput {
  agreementId: string
  milestoneId: string
  milestoneIndex: number
  escrowAddress: string
  payeeBps: number
  allArtifactHashes: string[]
  agentIdentities: {
    executorAgentId: string
    verifierAgentId?: string
    advocateAgentIds?: string[]
    tribunalAgentIds?: string[]
  }
}

export interface FinalizeResult {
  receiptHash: string
  setDecisionTxHash: string
  executeDecisionTxHash: string
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function handleFinalize(
  runtime: Runtime<Config>,
  input: FinalizeInput
): Promise<FinalizeResult> {
  const config = runtime.config

  runtime.log(`[WF-13] Finalizing milestone ${input.milestoneIndex} for agreement ${input.agreementId}`)
  runtime.log(`[WF-13] Decision: payee gets ${input.payeeBps} bps (${input.payeeBps / 100}%)`)

  // ── Build FinalReceiptJSON ─────────────────────────────────────────────

  const receipt = {
    schemaVersion: '1.0',
    agreementId: input.agreementId,
    milestoneId: input.milestoneId,
    decision: {
      type: input.payeeBps === 10000 ? 'approve' : input.payeeBps === 0 ? 'deny' : 'split',
      payeeBps: input.payeeBps,
      payerBps: 10000 - input.payeeBps,
    },
    agentIdentities: input.agentIdentities,
    artifacts: input.allArtifactHashes.map((hash, i) => ({
      index: i,
      hash,
    })),
    onchain: {
      escrowAddress: input.escrowAddress,
      chain: 'avalanche-fuji',
      chainId: 43113,
    },
    timestamp: new Date().toISOString(),
  }

  const receiptHash = await hashDocument(receipt)
  runtime.log(`[WF-13] Receipt hash: ${receiptHash}`)

  // ── Get EVM Client ─────────────────────────────────────────────────────

  const network = getNetwork({
    chainFamily: 'evm',
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  // ── Encode setDecision report ──────────────────────────────────────────
  // Report format: (uint8 actionType, uint256 milestoneIndex, address executorAgent, uint256 payeeBps, bytes32 receiptHash)
  // actionType = 3 (SET_DECISION)

  const setDecisionData = encodeAbiParameters(
    parseAbiParameters('uint8 actionType, uint256 milestoneIndex, address executorAgent, uint256 payeeBps, bytes32 receiptHash'),
    [
      3, // SET_DECISION
      BigInt(input.milestoneIndex),
      '0x0000000000000000000000000000000000000000', // executor address — filled by Forwarder context
      BigInt(input.payeeBps),
      `0x${receiptHash}` as `0x${string}`,
    ]
  )

  runtime.log('[WF-13] Submitting setDecision report...')

  const setDecisionReport = runtime
    .report({
      encodedPayload: hexToBase64(setDecisionData),
      encoderName: 'evm',
      signingAlgo: 'ecdsa',
      hashingAlgo: 'keccak256',
    })
    .result()

  const setDecisionResp = evmClient
    .writeReport(runtime, {
      receiver: input.escrowAddress,
      report: setDecisionReport,
      gasConfig: { gasLimit: config.gasLimit },
    })
    .result()

  if (setDecisionResp.txStatus !== TxStatus.SUCCESS) {
    throw new Error(`setDecision failed: ${setDecisionResp.errorMessage || setDecisionResp.txStatus}`)
  }

  const setDecisionTxHash = bytesToHex(setDecisionResp.txHash || new Uint8Array(32))
  runtime.log(`[WF-13] setDecision tx: ${setDecisionTxHash}`)

  // ── Encode executeDecision report ──────────────────────────────────────
  // actionType = 4 (EXECUTE)

  const executeData = encodeAbiParameters(
    parseAbiParameters('uint8 actionType, uint256 milestoneIndex, address executorAgent, uint256 payeeBps, bytes32 receiptHash'),
    [
      4, // EXECUTE
      BigInt(input.milestoneIndex),
      '0x0000000000000000000000000000000000000000',
      BigInt(input.payeeBps),
      `0x${receiptHash}` as `0x${string}`,
    ]
  )

  runtime.log('[WF-13] Submitting executeDecision report...')

  const executeReport = runtime
    .report({
      encodedPayload: hexToBase64(executeData),
      encoderName: 'evm',
      signingAlgo: 'ecdsa',
      hashingAlgo: 'keccak256',
    })
    .result()

  const executeResp = evmClient
    .writeReport(runtime, {
      receiver: input.escrowAddress,
      report: executeReport,
      gasConfig: { gasLimit: config.gasLimit },
    })
    .result()

  if (executeResp.txStatus !== TxStatus.SUCCESS) {
    throw new Error(`executeDecision failed: ${executeResp.errorMessage || executeResp.txStatus}`)
  }

  const executeDecisionTxHash = bytesToHex(executeResp.txHash || new Uint8Array(32))
  runtime.log(`[WF-13] executeDecision tx: ${executeDecisionTxHash}`)
  runtime.log('[WF-13] Finalization complete.')

  return {
    receiptHash,
    setDecisionTxHash,
    executeDecisionTxHash,
  }
}
