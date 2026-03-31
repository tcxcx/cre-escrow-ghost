/**
 * Escrow Service
 *
 * On-chain operations for EscrowWithAgentV3 contracts.
 * Reads use callView(). Writes go through CRE report() -> ACE PolicyEngine -> EscrowExtractor.
 *
 * EscrowExtractor decodes reports as:
 *   (uint8 actionType, uint256 milestoneIndex, address executorAgent, uint256 payeeBps, bytes32 receiptHash)
 *
 * @example
 * ```ts
 * const total = readTotalAmount(runtime, escrowAddr)
 * setMilestoneStatus(runtime, escrowAddr, 0, MILESTONE_STATUS.APPROVED)
 * ```
 */

import {
  EVMClient,
  getNetwork,
  hexToBase64,
  bytesToHex,
  type Runtime,
} from "@chainlink/cre-sdk"
import { encodeAbiParameters, parseAbiParameters, type Abi } from "viem"
import { callView } from "./evm"
import { ESCROW_V3_ABI } from "../abi/escrow-v3"

// ============================================================================
// Types
// ============================================================================

/** Config constraint for escrow operations */
interface EscrowConfig {
  chainSelectorName: string
  attestationContract: string
  gasLimit: string
  executorAgent: string
}

/**
 * EscrowExtractor action types.
 * Must match the enum in EscrowExtractor.sol.
 */
export const ESCROW_ACTION = {
  SET_STATUS: 0,
  APPROVE_MILESTONE: 1,
  LOCK_MILESTONE: 2,
  SET_DECISION: 3,
  EXECUTE_DECISION: 4,
  SET_MILESTONE_STATUS: 5,
} as const

/**
 * Milestone status enum.
 * Must match the enum in EscrowWithAgentV3.sol.
 */
export const MILESTONE_STATUS = {
  PENDING: 0,
  FUNDED: 1,
  IN_PROGRESS: 2,
  SUBMITTED: 3,
  APPROVED: 4,
  REJECTED: 5,
  DISPUTED: 6,
  LOCKED: 7,
  RELEASED: 8,
} as const

// ============================================================================
// Reads
// ============================================================================

/**
 * Read the total escrow amount.
 */
export function readTotalAmount<C extends EscrowConfig>(
  runtime: Runtime<C>,
  escrowAddress: string
): bigint {
  return callView(
    runtime,
    escrowAddress,
    ESCROW_V3_ABI as unknown as Abi,
    "totalAmount"
  )
}

// ============================================================================
// Writes (via CRE report -> EscrowExtractor)
// ============================================================================

/**
 * Encode an escrow action for CRE report().
 * The report is decoded by EscrowExtractor on-chain.
 */
function encodeEscrowReport(
  actionType: number,
  milestoneIndex: number,
  executorAgent: string,
  payeeBps: number,
  receiptHash: string
): string {
  return encodeAbiParameters(
    parseAbiParameters(
      "uint8 actionType, uint256 milestoneIndex, address executorAgent, uint256 payeeBps, bytes32 receiptHash"
    ),
    [
      actionType,
      BigInt(milestoneIndex),
      executorAgent as `0x${string}`,
      BigInt(payeeBps),
      (receiptHash ||
        "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
    ]
  )
}

/**
 * Submit a CRE report for an escrow action.
 * The report goes through: CRE consensus -> ACE PolicyEngine -> EscrowExtractor -> EscrowWithAgentV3
 */
function submitEscrowAction<C extends EscrowConfig>(
  runtime: Runtime<C>,
  escrowAddress: string,
  actionType: number,
  milestoneIndex: number,
  payeeBps = 0,
  receiptHash = ""
): string {
  const reportData = encodeEscrowReport(
    actionType,
    milestoneIndex,
    runtime.config.executorAgent,
    payeeBps,
    receiptHash
  )

  runtime.log(
    `Escrow action: type=${actionType} milestone=${milestoneIndex} escrow=${escrowAddress}`
  )

  // Sign via CRE consensus
  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result()

  // Write to escrow contract via ACE
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: runtime.config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(
      `submitEscrowAction: Network not found: ${runtime.config.chainSelectorName}`
    )
  }

  const evmClient = new EVMClient(network.chainSelector.selector)
  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: escrowAddress,
      report: reportResponse,
      gasConfig: { gasLimit: runtime.config.gasLimit },
    })
    .result()

  const txHash = bytesToHex(writeResult.txHash ?? new Uint8Array(32))
  runtime.log(`Escrow action tx: ${txHash}`)
  return txHash
}

/**
 * Set milestone status (APPROVED=4, REJECTED=5, etc.)
 * actionType = 5 (SET_MILESTONE_STATUS)
 */
export function setMilestoneStatus<C extends EscrowConfig>(
  runtime: Runtime<C>,
  escrowAddress: string,
  milestoneIndex: number,
  newStatus: number
): string {
  return submitEscrowAction(
    runtime,
    escrowAddress,
    ESCROW_ACTION.SET_MILESTONE_STATUS,
    milestoneIndex,
    newStatus
  )
}

/**
 * Lock a milestone for dispute resolution.
 * actionType = 2 (LOCK_MILESTONE)
 */
export function lockMilestone<C extends EscrowConfig>(
  runtime: Runtime<C>,
  escrowAddress: string,
  milestoneIndex: number
): string {
  return submitEscrowAction(
    runtime,
    escrowAddress,
    ESCROW_ACTION.LOCK_MILESTONE,
    milestoneIndex
  )
}

/**
 * Set the final decision (immutable once set).
 * actionType = 3 (SET_DECISION)
 */
export function setDecision<C extends EscrowConfig>(
  runtime: Runtime<C>,
  escrowAddress: string,
  milestoneIndex: number,
  payeeBps: number,
  receiptHash: string
): string {
  return submitEscrowAction(
    runtime,
    escrowAddress,
    ESCROW_ACTION.SET_DECISION,
    milestoneIndex,
    payeeBps,
    receiptHash
  )
}

/**
 * Execute an already-set decision (distribute funds).
 * actionType = 4 (EXECUTE_DECISION)
 */
export function executeDecision<C extends EscrowConfig>(
  runtime: Runtime<C>,
  escrowAddress: string,
  milestoneIndex: number
): string {
  return submitEscrowAction(
    runtime,
    escrowAddress,
    ESCROW_ACTION.EXECUTE_DECISION,
    milestoneIndex
  )
}
