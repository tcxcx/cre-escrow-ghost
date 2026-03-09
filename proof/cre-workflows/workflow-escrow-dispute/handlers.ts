/**
 * Escrow Dispute Handler
 *
 * 4-layer AI arbitration pipeline for escrow disputes.
 * All AI calls use CONFIDENTIAL client (dispute evidence, advocate briefs,
 * tribunal verdicts are IP-sensitive). Regular supabaseClient for Supabase
 * and lockMilestone for on-chain.
 *
 * Flow:
 * 1. Lock milestone on-chain
 * 2. Fetch dispute context from Supabase (dispute record + agreement)
 * 3. Layer 2 -- Advocates: two sequential CONFIDENTIAL briefs (provider + client)
 * 4. Layer 3 -- Tribunal: CONFIDENTIAL 3-judge panel (majority 2)
 * 5. Layer 4 -- Supreme Court: CONFIDENTIAL 5-judge panel (supermajority 4) [only if appealFiled]
 * 6. Store callback in cre_callbacks
 * 7. Publish escrow_dispute attestation
 */

import type { Runtime, HTTPPayload } from "@chainlink/cre-sdk"
import { withHttp } from "../shared/triggers"
import { supabaseClient } from "../shared/clients/presets"
import { confidentialShivaClient } from "../shared/clients/confidential-presets"
import { publishAttestation } from "../shared/services/attestation"
import { lockMilestone } from "../shared/services/escrow"
import { keccak256, toHex } from "viem"
import type { EncryptedBodyResult } from "../shared/clients/confidential"
import type { Config, DisputePayload } from "./types"

// ============================================================================
// Clients
// ============================================================================

const supa = supabaseClient<Config>()
const shiva = confidentialShivaClient<Config>()

// ============================================================================
// Handler: 4-Layer AI Arbitration (HTTP Trigger)
// ============================================================================

const arbitrateDispute = withHttp<Config>(
  (runtime: Runtime<Config>, payload: HTTPPayload) => {
    // Step 1: Parse payload
    const body = JSON.parse(
      new TextDecoder().decode(payload.input)
    ) as DisputePayload

    runtime.log(
      `Escrow dispute: agreement=${body.agreementId} milestone=${body.milestoneIndex} dispute=${body.disputeId} appeal=${body.appealFiled ?? false}`
    )

    // Step 1: Lock milestone on-chain
    const lockTxHash = lockMilestone(
      runtime,
      body.escrowAddress,
      body.milestoneIndex
    )
    runtime.log(`Milestone locked: tx=${lockTxHash}`)

    // Step 2: Fetch dispute context from Supabase
    const disputes = supa.get(
      runtime,
      `/disputes?select=*&id=eq.${body.disputeId}`,
      (raw) =>
        JSON.parse(raw) as Array<{
          id: string
          reason: string
          evidence_urls: string[]
          filed_by: string
        }>
    )

    if (!Array.isArray(disputes) || disputes.length === 0) {
      throw new Error(`Dispute not found: ${body.disputeId}`)
    }
    const dispute = disputes[0]
    runtime.log(`Fetched dispute: ${dispute.id} filed_by=${dispute.filed_by}`)

    const agreements = supa.get(
      runtime,
      `/agreements?select=*&id=eq.${body.agreementId}`,
      (raw) =>
        JSON.parse(raw) as Array<{
          id: string
          agreement_json: string
        }>
    )

    if (!Array.isArray(agreements) || agreements.length === 0) {
      throw new Error(`Agreement not found: ${body.agreementId}`)
    }
    const agreement = agreements[0]
    runtime.log(`Fetched agreement: ${agreement.id}`)

    // Step 3: Layer 2 -- Advocates (two sequential CONFIDENTIAL briefs)

    // Provider advocate brief
    const providerBrief = shiva.post(
      runtime,
      "/intelligence/advocate",
      {
        role: "provider",
        disputeId: body.disputeId,
        reason: dispute.reason,
        evidenceUrls: dispute.evidence_urls,
        agreementJson: agreement.agreement_json,
        milestoneIndex: body.milestoneIndex,
      },
      (raw) => JSON.parse(raw) as { brief: string }
    ) as EncryptedBodyResult

    runtime.log("Provider advocate brief generated (encrypted)")

    // Client advocate brief
    const clientBrief = shiva.post(
      runtime,
      "/intelligence/advocate",
      {
        role: "client",
        disputeId: body.disputeId,
        reason: dispute.reason,
        evidenceUrls: dispute.evidence_urls,
        agreementJson: agreement.agreement_json,
        milestoneIndex: body.milestoneIndex,
      },
      (raw) => JSON.parse(raw) as { brief: string }
    ) as EncryptedBodyResult

    runtime.log("Client advocate brief generated (encrypted)")

    // Hash briefs for audit trail
    const providerBriefHash = keccak256(toHex(providerBrief.bodyBase64))
    const clientBriefHash = keccak256(toHex(clientBrief.bodyBase64))

    // Store advocate briefs in Supabase
    supa.post(
      runtime,
      "/arbitration_documents",
      {
        dispute_id: body.disputeId,
        doc_type: "advocate_brief",
        layer: 2,
        role: "provider",
        encrypted_content: providerBrief.bodyBase64,
        content_hash: providerBriefHash,
      },
      (raw) => JSON.parse(raw) as { id: string }
    )

    supa.post(
      runtime,
      "/arbitration_documents",
      {
        dispute_id: body.disputeId,
        doc_type: "advocate_brief",
        layer: 2,
        role: "client",
        encrypted_content: clientBrief.bodyBase64,
        content_hash: clientBriefHash,
      },
      (raw) => JSON.parse(raw) as { id: string }
    )

    runtime.log("Advocate briefs stored in arbitration_documents")

    // Step 4: Layer 3 -- Tribunal (3-judge panel, majority 2)
    const tribunalVerdict = shiva.post(
      runtime,
      "/intelligence/tribunal",
      {
        disputeId: body.disputeId,
        providerBriefEncrypted: providerBrief.bodyBase64,
        clientBriefEncrypted: clientBrief.bodyBase64,
        agreementJson: agreement.agreement_json,
        milestoneIndex: body.milestoneIndex,
        judgeCount: 3,
        majorityRequired: 2,
      },
      (raw) => JSON.parse(raw) as { verdict: string; votes: number[] }
    ) as EncryptedBodyResult

    runtime.log("Tribunal verdict rendered (encrypted)")

    const tribunalVerdictHash = keccak256(toHex(tribunalVerdict.bodyBase64))

    supa.post(
      runtime,
      "/arbitration_documents",
      {
        dispute_id: body.disputeId,
        doc_type: "tribunal_verdict",
        layer: 3,
        encrypted_content: tribunalVerdict.bodyBase64,
        content_hash: tribunalVerdictHash,
      },
      (raw) => JSON.parse(raw) as { id: string }
    )

    runtime.log("Tribunal verdict stored in arbitration_documents")

    // Step 5: Layer 4 -- Supreme Court (only if appealFiled)
    let supremeCourtVerdictHash = ""
    let finalLayer = 3

    if (body.appealFiled) {
      const supremeVerdict = shiva.post(
        runtime,
        "/intelligence/supreme-court",
        {
          disputeId: body.disputeId,
          tribunalVerdictEncrypted: tribunalVerdict.bodyBase64,
          providerBriefEncrypted: providerBrief.bodyBase64,
          clientBriefEncrypted: clientBrief.bodyBase64,
          agreementJson: agreement.agreement_json,
          milestoneIndex: body.milestoneIndex,
          judgeCount: 5,
          supermajorityRequired: 4,
        },
        (raw) => JSON.parse(raw) as { verdict: string; votes: number[] }
      ) as EncryptedBodyResult

      runtime.log("Supreme Court verdict rendered (encrypted)")

      supremeCourtVerdictHash = keccak256(toHex(supremeVerdict.bodyBase64))

      supa.post(
        runtime,
        "/arbitration_documents",
        {
          dispute_id: body.disputeId,
          doc_type: "supreme_court_verdict",
          layer: 4,
          encrypted_content: supremeVerdict.bodyBase64,
          content_hash: supremeCourtVerdictHash,
        },
        (raw) => JSON.parse(raw) as { id: string }
      )

      runtime.log("Supreme Court verdict stored in arbitration_documents")
      finalLayer = 4
    }

    // Step 6: Store callback in cre_callbacks
    supa.post(
      runtime,
      "/cre_callbacks",
      {
        workflow: "escrow-dispute",
        status: "pending",
        dispute_id: body.disputeId,
        agreement_id: body.agreementId,
        milestone_index: body.milestoneIndex,
        escrow_address: body.escrowAddress,
        appeal_filed: body.appealFiled ?? false,
        final_layer: finalLayer,
        provider_brief_hash: providerBriefHash,
        client_brief_hash: clientBriefHash,
        tribunal_verdict_hash: tribunalVerdictHash,
        supreme_court_verdict_hash: supremeCourtVerdictHash || null,
      },
      (raw) => JSON.parse(raw) as { id: string }
    )

    runtime.log("Callback posted to cre_callbacks")

    // Step 7: Publish escrow_dispute attestation
    const attestation = publishAttestation(runtime, {
      type: "escrow_dispute",
      entityId: `dispute-${body.disputeId}`,
      data: {
        disputeId: body.disputeId,
        agreementId: body.agreementId,
        milestoneIndex: body.milestoneIndex.toString(),
        escrowAddress: body.escrowAddress,
        finalLayer: finalLayer.toString(),
        appealFiled: (body.appealFiled ?? false).toString(),
        providerBriefHash,
        clientBriefHash,
        tribunalVerdictHash,
      },
      metadata: JSON.stringify({
        disputeId: body.disputeId,
        agreementId: body.agreementId,
        milestoneIndex: body.milestoneIndex,
        escrowAddress: body.escrowAddress,
        appealFiled: body.appealFiled ?? false,
        finalLayer,
      }),
    })

    runtime.log(`Attestation published: tx=${attestation.txHash}`)

    return `Escrow dispute: dispute=${body.disputeId} layers=2-${finalLayer} tx=${attestation.txHash}`
  }
)

// ============================================================================
// Workflow Init
// ============================================================================

export const initWorkflow = (config: Config) => [arbitrateDispute(config)]
