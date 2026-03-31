/**
 * AllowList Sync Workflow Handler
 *
 * HTTP trigger: Fired by Shiva after Persona KYC/KYB webhook processing.
 * Verifies the approval on-chain via PolicyEngine, reads AllowList status,
 * and publishes a trustless attestation.
 *
 * Flow:
 *   1. Parse KYC/KYB webhook payload
 *   2. Read current PolicyEngine AllowList status for wallet
 *   3. Publish attestation (kyc_verified or kyb_verified)
 */

import {
  decodeJson,
  type Runtime,
  type HTTPPayload,
} from "@chainlink/cre-sdk"
import { keccak256, toHex, decodeFunctionResult, type Abi } from "viem"
import { withHttp } from "../shared/triggers"
import { publishAttestation } from "../shared/services/attestation"
import { callViewRaw } from "../shared/services/evm"
import type { Config } from "./types"

// PolicyEngine ABI fragment
const POLICY_ENGINE_ABI = [
  {
    name: "isAllowed",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const

const allowlistSync = withHttp<Config>(
  (runtime, payload) => {
    const input = decodeJson(payload.input) as {
      action: string
      walletAddress: string
      approved: boolean
      verificationType: "kyc" | "kyb"
      personaInquiryId?: string
      status?: string
    }

    runtime.log(
      `AllowList sync: wallet=${input.walletAddress} type=${input.verificationType} approved=${input.approved}`
    )

    // ── Step 1: Read current AllowList status ────────────────────────────
    runtime.log("Step 1: Read PolicyEngine AllowList status")

    const rawResult = callViewRaw(
      runtime,
      runtime.config.policyEngineAddress,
      POLICY_ENGINE_ABI as unknown as Abi,
      "isAllowed",
      [input.walletAddress],
    )

    const currentlyOnList = decodeFunctionResult({
      abi: POLICY_ENGINE_ABI as unknown as Abi,
      functionName: "isAllowed",
      data: rawResult,
    }) as boolean
    runtime.log(`Current status: onAllowList=${currentlyOnList}`)

    // ── Step 2: Determine sync action ────────────────────────────────────
    let syncAction: "none" | "add" | "remove" = "none"

    if (input.approved && !currentlyOnList) {
      syncAction = "add"
    } else if (!input.approved && currentlyOnList) {
      syncAction = "remove"
    }

    runtime.log(`Sync action: ${syncAction}`)

    // Note: PolicyEngine.addToAllowList/removeFromAllowList requires owner/forwarder.
    // The actual AllowList mutation is done by Shiva via syncAllowListFromPersona().
    // CRE verifies state and publishes attestation for trustless audit trail.

    // ── Step 3: Publish attestation ──────────────────────────────────────
    runtime.log("Step 3: Publish attestation")

    const attestationType = input.verificationType === "kyc"
      ? "kyc_verified" as const
      : "kyb_verified" as const

    const entityId = `allowlist-${keccak256(toHex(input.walletAddress)).slice(0, 18)}`

    const result = publishAttestation(runtime, {
      type: attestationType,
      entityId,
      data: {
        walletHash: keccak256(toHex(input.walletAddress)),
        approved: input.approved,
        verificationType: input.verificationType,
        syncAction,
        previousStatus: currentlyOnList,
        timestamp: Math.floor(Date.now() / 1000),
      },
      metadata: JSON.stringify({
        operation: "allowlist_sync",
        personaInquiryId: input.personaInquiryId ?? "unknown",
        status: input.status ?? "unknown",
      }),
    })

    runtime.log(`AllowList attestation published: tx=${result.txHash}`)

    return JSON.stringify({
      success: true,
      txHash: result.txHash,
      attestationId: result.attestationId,
      syncAction,
    })
  },
)

export const initWorkflow = (config: Config) => [
  allowlistSync(config),
]
