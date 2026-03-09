/**
 * Ghost Transfer Workflow Handler
 *
 * Monitors ConfidentialTransfer events on GhostUSDC (Arbitrum Sepolia)
 * and syncs the private DON state:
 *   1. Detect encrypted transfer event
 *   2. Verify both parties are compliant
 *   3. Update DON state balances (CRE-private, never on-chain)
 *   4. Publish attestation (proves compliant transfer, no amounts)
 *
 * Trigger: EVM Log (ConfidentialTransfer event from GhostUSDC)
 */

import {
  bytesToHex,
  type Runtime,
  type EVMLog,
} from "@chainlink/cre-sdk"
import { decodeEventLog, decodeFunctionResult, keccak256, toBytes, toHex, type Abi } from "viem"
import { withLog } from "../shared/triggers"
import { publishAttestation } from "../shared/services/attestation"
import { callViewRaw } from "../shared/services/evm"
import { readGhostIndicator } from "../shared/services/fhe"
import { aceClient, shivaClient } from "../shared/clients/presets"
import { GHOST_USDC_ABI } from "../shared/abi/ghost-usdc"
import type { Config } from "./types"

// ============================================================================
// Clients & Constants
// ============================================================================

const ace = aceClient<Config>()

// ConfidentialTransfer(address indexed from, address indexed to)
const CONFIDENTIAL_TRANSFER_TOPIC = keccak256(toBytes("ConfidentialTransfer(address,address)"))

// ============================================================================
// Handler: ConfidentialTransfer Event Monitor (Log Trigger)
// ============================================================================

/**
 * This handler watches for ConfidentialTransfer events on the FHE chain.
 * Since amounts are encrypted, we can only see the from/to addresses.
 * CRE uses its operator access to decrypt in TEE and sync DON state.
 */
const transferMonitor = withLog<Config>(
  {
    getAddresses: (config) => [config.ghostUsdcAddress],
    getTopics: () => [CONFIDENTIAL_TRANSFER_TOPIC],
    chainSelectorField: "fheChainSelectorName",
  },
  (runtime, log) => {
    // Decode event — only from/to are available (amount is encrypted)
    const decoded = decodeEventLog({
      abi: GHOST_USDC_ABI,
      data: bytesToHex(log.data) as `0x${string}`,
      topics: log.topics.map((t) => bytesToHex(t) as `0x${string}`),
    })

    const { from, to } = decoded.args as { from: string; to: string }
    runtime.log(`ConfidentialTransfer detected: from=${from} to=${to}`)

    // ── Step 1: Compliance verification ──────────────────────────────────
    runtime.log("Step 1: Verify both parties compliant")

    const senderKyc = ace.get(
      runtime,
      `/kyc?address=${from}`,
      (raw) => JSON.parse(raw) as { verified: boolean; level: string },
    )

    const recipientKyc = ace.get(
      runtime,
      `/kyc?address=${to}`,
      (raw) => JSON.parse(raw) as { verified: boolean; level: string },
    )

    if (!senderKyc.verified || !recipientKyc.verified) {
      runtime.log(
        `COMPLIANCE FLAG: sender=${senderKyc.verified} recipient=${recipientKyc.verified}`
      )
      // Note: GhostUSDC.confidentialTransfer() enforces PolicyEngine.checkTransfer()
      // at the token level — non-compliant transfers revert before reaching this handler.
      // If we see a flagged transfer here, it means PolicyEngine allowed it but ACE
      // DON state has stale KYC data. Flag for reconciliation, not reversal.
    }

    runtime.log(
      `Compliance: sender=${senderKyc.level} recipient=${recipientKyc.level}`
    )

    // ── Step 2: Read indicators (public state) ───────────────────────────
    runtime.log("Step 2: Read indicators")

    const senderIndicator = readGhostIndicator(runtime, from)
    const recipientIndicator = readGhostIndicator(runtime, to)

    runtime.log(
      `Indicators: sender=${senderIndicator} recipient=${recipientIndicator}`
    )

    // ── Step 3: Sync DON state ───────────────────────────────────────────
    runtime.log("Step 3: Sync DON state")

    // CRE as operator can request decrypted amount from FHE coprocessor.
    // In production, this uses FHE.sealoutput() with CRE's public key.
    // The decrypted amount stays in CRE TEE — never published on-chain.
    // For now, we record the transfer event and let DON state sync via ACE API.

    ace.get(
      runtime,
      `/transfers/sync?from=${from}&to=${to}&txHash=${bytesToHex(log.txHash ?? new Uint8Array(32))}`,
      (raw) => JSON.parse(raw) as { synced: boolean },
    )

    runtime.log("DON state synced")

    // ── Step 4: Publish attestation ──────────────────────────────────────
    runtime.log("Step 4: Publish attestation")

    const entityId = `ghost-transfer-${keccak256(toHex(`${from}${to}${bytesToHex(log.txHash ?? new Uint8Array(32))}`)).slice(0, 18)}`

    const result = publishAttestation(runtime, {
      type: "ghost_transfer",
      entityId,
      data: {
        fromHash: keccak256(toHex(from)),
        toHash: keccak256(toHex(to)),
        senderCompliant: senderKyc.verified,
        recipientCompliant: recipientKyc.verified,
        timestamp: 0, // Populated by attestation contract on-chain
      },
      metadata: JSON.stringify({
        operation: "ghost_transfer",
        senderIndicator: senderIndicator.toString(),
        recipientIndicator: recipientIndicator.toString(),
        compliance: senderKyc.verified && recipientKyc.verified ? "passed" : "flagged",
      }),
    })

    runtime.log(`Ghost transfer attestation: tx=${result.txHash}`)

    // ── Step 5: Post callback to Shiva ──────────────────────────────────
    runtime.log("Post callback to Shiva")
    const shiva = shivaClient<Config>()
    shiva.post(
      runtime,
      "/contracts/cre-callback/ghost-transfer",
      {
        workflow: "ghost-transfer",
        status: "verified",
        attestation_id: result.attestationId,
        attestation_tx: result.txHash,
      },
      (raw: string) => JSON.parse(raw) as { success: boolean },
    )

    return `Ghost transfer verified: ${from} → ${to}, tx=${result.txHash}`
  },
)

// ============================================================================
// Handler: Standard Transfer Event Monitor (EVM Log Trigger)
// ============================================================================

// PolicyEngine ABI fragment for isAllowed
const POLICY_ENGINE_ABI = [
  {
    name: "isAllowed",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const

/**
 * This handler watches for standard ERC-20 Transfer events on GhostUSDC.
 * Complements the ConfidentialTransfer monitor by catching any standard
 * Transfer(address,address,uint256) events for compliance monitoring.
 */
const ghostTransferLogMonitor = withLog<Config>(
  {
    getAddresses: (config) => [config.ghostUsdcAddress],
    getTopics: (config) => [config.transferEventTopic],
    chainSelectorField: "fheChainSelectorName" as keyof Config,
  },
  (runtime, log) => {
    runtime.log(`GhostUSDC Transfer event detected: tx=${bytesToHex(log.txHash ?? new Uint8Array())}`)

    // Decode transfer event topics
    const fromTopic = log.topics?.[1]
    const toTopic = log.topics?.[2]
    const from = fromTopic ? `0x${bytesToHex(fromTopic).slice(-40)}` : "0x0"
    const to = toTopic ? `0x${bytesToHex(toTopic).slice(-40)}` : "0x0"

    runtime.log(`Transfer: from=${from} to=${to}`)

    // Compliance check on both parties via PolicyEngine
    const fromAllowedRaw = callViewRaw(
      runtime,
      runtime.config.policyEngineAddress,
      POLICY_ENGINE_ABI as unknown as Abi,
      "isAllowed",
      [from],
    )
    const fromAllowed = decodeFunctionResult({
      abi: POLICY_ENGINE_ABI as unknown as Abi,
      functionName: "isAllowed",
      data: fromAllowedRaw,
    }) as boolean

    const toAllowedRaw = callViewRaw(
      runtime,
      runtime.config.policyEngineAddress,
      POLICY_ENGINE_ABI as unknown as Abi,
      "isAllowed",
      [to],
    )
    const toAllowed = decodeFunctionResult({
      abi: POLICY_ENGINE_ABI as unknown as Abi,
      functionName: "isAllowed",
      data: toAllowedRaw,
    }) as boolean

    if (!fromAllowed || !toAllowed) {
      runtime.log(`COMPLIANCE VIOLATION: from=${fromAllowed} to=${toAllowed}`)
    }

    // Publish attestation
    const txHashHex = bytesToHex(log.txHash ?? new Uint8Array())
    const entityId = `ghost-transfer-log-${keccak256(toHex(txHashHex)).slice(0, 18)}`

    const result = publishAttestation(runtime, {
      type: "ghost_transfer",
      entityId,
      data: {
        fromHash: keccak256(toHex(from)),
        toHash: keccak256(toHex(to)),
        fromCompliant: fromAllowed,
        toCompliant: toAllowed,
        txHash: txHashHex,
        timestamp: Math.floor(Date.now() / 1000),
      },
      metadata: JSON.stringify({
        operation: "ghost_transfer_log_monitor",
        trigger: "evm_log",
      }),
    })

    runtime.log(`Log monitor attestation published: tx=${result.txHash}`)

    // Callback to Shiva
    const shiva = shivaClient<Config>()
    shiva.post(
      runtime,
      "/contracts/cre-callback/ghost-transfer-log",
      {
        workflow: "ghost-transfer-log",
        status: "verified",
        from_compliant: fromAllowed,
        to_compliant: toAllowed,
        attestation_id: result.attestationId,
        attestation_tx: result.txHash,
      },
      (raw: string) => JSON.parse(raw) as { success: boolean },
    )

    return JSON.stringify({
      success: true,
      attestationId: result.attestationId,
      txHash: result.txHash,
    })
  },
)

// ============================================================================
// Workflow Init
// ============================================================================

export const initWorkflow = (config: Config) => [
  transferMonitor(config),
  ghostTransferLogMonitor(config),
]
