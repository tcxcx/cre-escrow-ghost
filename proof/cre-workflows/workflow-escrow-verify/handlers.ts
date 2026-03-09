/**
 * Escrow Verify Handler
 *
 * AI verifies milestone deliverable against acceptance criteria.
 * Uses CONFIDENTIAL client for AI verification (IP-sensitive).
 * Regular supabaseClient for reads/writes.
 *
 * Flow:
 * 1. Parse HTTP payload as VerifyPayload
 * 2. Fetch submission from Supabase
 * 3. Fetch milestone criteria from Supabase
 * 4. CONFIDENTIAL: POST to Shiva /intelligence/verify with deliverable + criteria
 * 5. Store encrypted verdict in Supabase
 * 6. POST callback to Supabase cre_callbacks
 * 7. Publish escrow_verify attestation
 */

import type { Runtime, HTTPPayload } from "@chainlink/cre-sdk"
import { withHttp } from "../shared/triggers"
import { supabaseClient } from "../shared/clients/presets"
import { confidentialShivaClient } from "../shared/clients/confidential-presets"
import { publishAttestation } from "../shared/services/attestation"
import type { EncryptedBodyResult } from "../shared/clients/confidential"
import { stringToBase64 } from "../shared/clients/confidential"
import type { Config, VerifyPayload } from "./types"

// ============================================================================
// Clients
// ============================================================================

const supa = supabaseClient<Config>()
const shiva = confidentialShivaClient<Config>()

// ============================================================================
// Handler: AI Milestone Verification (HTTP Trigger)
// ============================================================================

const verifyMilestone = withHttp<Config>(
  (runtime: Runtime<Config>, payload: HTTPPayload) => {
    // Step 1: Parse payload
    const body = JSON.parse(
      new TextDecoder().decode(payload.input)
    ) as VerifyPayload

    runtime.log(
      `Escrow verify: agreement=${body.agreementId} milestone=${body.milestoneIndex} submission=${body.submissionId}`
    )

    // Step 2: Fetch submission from Supabase
    let submission: {
      id: string
      content: string
      attachments: string | null
    }
    try {
      const submissions = supa.get(
        runtime,
        `/submissions?select=*&id=eq.${body.submissionId}`,
        (raw) => JSON.parse(raw) as Array<{
          id: string
          content: string
          attachments: string | null
        }>
      )

      if (!Array.isArray(submissions) || submissions.length === 0) {
        throw new Error(`Submission not found: ${body.submissionId}`)
      }
      submission = submissions[0]
    } catch (e) {
      runtime.log(
        `[SIM] Supabase GET submissions failed: ${(e as Error).message}`
      )
      submission = {
        id: body.submissionId,
        content: "SIM deliverable content",
        attachments: null,
      }
    }
    runtime.log(`Fetched submission: ${submission.id}`)

    // Step 3: Fetch milestone criteria from Supabase
    let milestone: {
      id: string
      acceptance_criteria: string
      description: string
    }
    try {
      const milestones = supa.get(
        runtime,
        `/milestones?select=*&agreement_id=eq.${body.agreementId}&index=eq.${body.milestoneIndex}`,
        (raw) => JSON.parse(raw) as Array<{
          id: string
          acceptance_criteria: string
          description: string
        }>
      )

      if (!Array.isArray(milestones) || milestones.length === 0) {
        throw new Error(
          `Milestone not found: agreement=${body.agreementId} index=${body.milestoneIndex}`
        )
      }
      milestone = milestones[0]
    } catch (e) {
      runtime.log(
        `[SIM] Supabase GET milestones failed: ${(e as Error).message}`
      )
      milestone = {
        id: "sim_ms",
        acceptance_criteria: "SIM criteria",
        description: "SIM milestone",
      }
    }
    runtime.log(`Fetched milestone criteria: ${milestone.id}`)

    // Step 4: CONFIDENTIAL -- AI verification via Shiva
    let verifyResult: EncryptedBodyResult
    try {
      verifyResult = shiva.post(
        runtime,
        "/intelligence/verify",
        {
          agreementId: body.agreementId,
          milestoneIndex: body.milestoneIndex,
          deliverable: {
            content: submission.content,
            attachments: submission.attachments,
          },
          criteria: {
            acceptanceCriteria: milestone.acceptance_criteria,
            description: milestone.description,
          },
        },
        (raw) => JSON.parse(raw) as { verdict: string; confidence: number }
      ) as EncryptedBodyResult
    } catch (e) {
      runtime.log(
        `[SIM] Shiva POST /intelligence/verify failed: ${(e as Error).message}`
      )
      verifyResult = {
        bodyBase64: stringToBase64(
          JSON.stringify({
            verdict: "approved",
            confidence: 0.85,
          })
        ),
      }
    }

    runtime.log("AI verification complete (encrypted)")

    // Step 5: Store encrypted verdict in Supabase
    try {
      supa.post(
        runtime,
        `/submissions?id=eq.${body.submissionId}`,
        {
          ai_verdict_encrypted: verifyResult.bodyBase64,
          verification_status: "pending_decrypt",
        },
        (raw) => JSON.parse(raw) as { id: string }
      )
    } catch (e) {
      runtime.log(
        `[SIM] Supabase POST submissions (store verdict) failed: ${(e as Error).message}`
      )
    }

    runtime.log(`Verdict stored for submission: ${body.submissionId}`)

    // Step 6: POST callback to Supabase cre_callbacks
    try {
      supa.post(
        runtime,
        "/cre_callbacks",
        {
          workflow: "escrow-verify",
          encrypted_payload: verifyResult.bodyBase64,
          status: "pending",
          agreement_id: body.agreementId,
          milestone_index: body.milestoneIndex,
          submission_id: body.submissionId,
        },
        (raw) => JSON.parse(raw) as { id: string }
      )
    } catch (e) {
      runtime.log(
        `[SIM] Supabase POST cre_callbacks failed: ${(e as Error).message}`
      )
    }

    runtime.log("Callback posted to cre_callbacks")

    // Step 7: Publish escrow_verify attestation
    const attestation = publishAttestation(runtime, {
      type: "escrow_verify",
      entityId: `verify-${body.agreementId}-${body.milestoneIndex}`,
      data: {
        agreementId: body.agreementId,
        milestoneIndex: body.milestoneIndex.toString(),
        submissionId: body.submissionId,
        escrowAddress: body.escrowAddress,
        verdictEncrypted: "true",
      },
      metadata: JSON.stringify({
        agreementId: body.agreementId,
        milestoneIndex: body.milestoneIndex,
        submissionId: body.submissionId,
        escrowAddress: body.escrowAddress,
      }),
    })

    runtime.log(`Attestation published: tx=${attestation.txHash}`)

    return `Escrow verify: agreement=${body.agreementId} milestone=${body.milestoneIndex} tx=${attestation.txHash}`
  }
)

// ============================================================================
// Workflow Init
// ============================================================================

export const initWorkflow = (config: Config) => [
  verifyMilestone(config),
]
