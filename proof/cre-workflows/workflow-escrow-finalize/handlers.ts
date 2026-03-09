/**
 * Escrow Finalize Handler
 *
 * Records final decision on-chain and distributes funds.
 * Uses CONFIDENTIAL Shiva client for receipt generation (IP-sensitive).
 * Regular supabaseClient for reads/writes.
 *
 * Flow:
 * 1. Parse HTTP payload as FinalizePayload
 * 2. Fetch agreement from Supabase
 * 3. CONFIDENTIAL: POST to Shiva /intelligence/receipt for FinalReceiptJSON
 * 4. Compute receiptHash = keccak256(toHex(receiptResult.bodyBase64))
 * 5. setDecision on-chain (payeeBps + receiptHash)
 * 6. executeDecision on-chain (distribute funds)
 * 7. setMilestoneStatus to RELEASED
 * 8. POST callback to Supabase cre_callbacks
 * 9. PATCH milestone state to "released"
 * 10. Publish escrow_finalize attestation
 */

import type { Runtime, HTTPPayload } from "@chainlink/cre-sdk"
import { keccak256, toHex } from "viem"
import { withHttp } from "../shared/triggers"
import { supabaseClient } from "../shared/clients/presets"
import { confidentialShivaClient } from "../shared/clients/confidential-presets"
import { publishAttestation } from "../shared/services/attestation"
import {
  setDecision,
  executeDecision,
  setMilestoneStatus,
  MILESTONE_STATUS,
} from "../shared/services/escrow"
import type { EncryptedBodyResult } from "../shared/clients/confidential"
import type { Config, FinalizePayload } from "./types"

// ============================================================================
// Clients
// ============================================================================

const supa = supabaseClient<Config>()
const shiva = confidentialShivaClient<Config>()

// ============================================================================
// Handler: Escrow Finalize (HTTP Trigger)
// ============================================================================

const escrowFinalize = withHttp<Config>(
  (runtime: Runtime<Config>, payload: HTTPPayload) => {
    // Step 1: Parse payload
    const body = JSON.parse(
      new TextDecoder().decode(payload.input)
    ) as FinalizePayload

    runtime.log(
      `Escrow finalize: agreement=${body.agreementId} milestone=${body.milestoneIndex} payeeBps=${body.payeeBps} source=${body.source}`
    )

    // Step 2: Fetch agreement from Supabase
    const agreements = supa.get(
      runtime,
      `/agreements?select=*&id=eq.${body.agreementId}`,
      (raw) => JSON.parse(raw) as Array<{
        id: string
        payer: string
        payee: string
        token_address: string
        escrow_address: string
      }>
    )

    if (!Array.isArray(agreements) || agreements.length === 0) {
      throw new Error(`Agreement not found: ${body.agreementId}`)
    }
    const agreement = agreements[0]
    runtime.log(`Fetched agreement: ${agreement.id}`)

    // Step 3: CONFIDENTIAL -- Generate final receipt via Shiva
    const receiptResult = shiva.post(
      runtime,
      "/intelligence/receipt",
      {
        agreementId: body.agreementId,
        milestoneIndex: body.milestoneIndex,
        payeeBps: body.payeeBps,
        source: body.source,
        payer: agreement.payer,
        payee: agreement.payee,
        escrowAddress: body.escrowAddress,
      },
      (raw) => JSON.parse(raw) as { receipt: string }
    ) as EncryptedBodyResult

    runtime.log("Receipt generated (encrypted)")

    // Step 4: Compute receiptHash from encrypted body
    const receiptHash = keccak256(toHex(receiptResult.bodyBase64))
    runtime.log(`Receipt hash: ${receiptHash}`)

    // Step 5: Set decision on-chain (immutable)
    const setDecisionTx = setDecision(
      runtime,
      body.escrowAddress,
      body.milestoneIndex,
      body.payeeBps,
      receiptHash
    )
    runtime.log(`setDecision tx: ${setDecisionTx}`)

    // Step 6: Execute decision on-chain (distribute funds)
    const executeTx = executeDecision(
      runtime,
      body.escrowAddress,
      body.milestoneIndex
    )
    runtime.log(`executeDecision tx: ${executeTx}`)

    // Step 7: Set milestone status to RELEASED
    const statusTx = setMilestoneStatus(
      runtime,
      body.escrowAddress,
      body.milestoneIndex,
      MILESTONE_STATUS.RELEASED
    )
    runtime.log(`setMilestoneStatus(RELEASED) tx: ${statusTx}`)

    // Step 8: POST callback to Supabase cre_callbacks
    supa.post(
      runtime,
      "/cre_callbacks",
      {
        workflow: "escrow-finalize",
        status: "completed",
        agreement_id: body.agreementId,
        milestone_index: body.milestoneIndex,
        escrow_address: body.escrowAddress,
        payee_bps: body.payeeBps,
        source: body.source,
        set_decision_tx: setDecisionTx,
        execute_decision_tx: executeTx,
        status_tx: statusTx,
        receipt_hash: receiptHash,
        yield_enabled: body.yieldEnabled ?? false,
      },
      (raw) => JSON.parse(raw) as { id: string }
    )

    runtime.log("Callback posted to cre_callbacks")

    // Step 9: PATCH milestone state to "released"
    supa.post(
      runtime,
      `/milestones?agreement_id=eq.${body.agreementId}&index=eq.${body.milestoneIndex}`,
      {
        state: "released",
        released_at: new Date().toISOString(),
        release_tx: executeTx,
      },
      (raw) => JSON.parse(raw) as { id: string }
    )

    runtime.log("Milestone state updated to released")

    // Step 10: Publish escrow_finalize attestation
    const attestation = publishAttestation(runtime, {
      type: "escrow_finalize",
      entityId: `finalize-${body.agreementId}-${body.milestoneIndex}`,
      data: {
        agreementId: body.agreementId,
        milestoneIndex: body.milestoneIndex.toString(),
        escrowAddress: body.escrowAddress,
        payeeBps: body.payeeBps.toString(),
        source: body.source,
        receiptHash,
        setDecisionTx,
        executeTx,
        statusTx,
      },
      metadata: JSON.stringify({
        agreementId: body.agreementId,
        milestoneIndex: body.milestoneIndex,
        escrowAddress: body.escrowAddress,
        payeeBps: body.payeeBps,
        source: body.source,
        yieldEnabled: body.yieldEnabled ?? false,
      }),
    })

    runtime.log(`Attestation published: tx=${attestation.txHash}`)

    return `Escrow finalize: agreement=${body.agreementId} milestone=${body.milestoneIndex} decision=${setDecisionTx} execute=${executeTx} attestation=${attestation.txHash}`
  }
)

// ============================================================================
// Workflow Init
// ============================================================================

export const initWorkflow = (config: Config) => [
  escrowFinalize(config),
]
