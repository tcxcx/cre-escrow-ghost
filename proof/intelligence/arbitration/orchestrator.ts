// =============================================================================
// Orchestrator — Full dispute resolution pipeline
// Coordinates all 4 layers in sequence, generating audit records at each step.
// =============================================================================

import { runVerification, type VerificationInput } from './layers/layer1-verifier'
import { runAdvocates, type AdvocateInput } from './layers/layer2-advocates'
import { runTribunal, type TribunalInput } from './layers/layer3-tribunal'
import { runSupremeCourt, type SupremeCourtInput } from './layers/layer4-supreme-court'
import { hashDocument, createAuditRecord, buildOnChainRecord } from './audit'
import type { ArbitrationConfig } from './config'
import { DEFAULT_ARBITRATION_CONFIG } from './config'

export type DisputePhase =
  | 'verification'
  | 'dispute_window'
  | 'advocates'
  | 'tribunal'
  | 'tribunal_decided'
  | 'appeal_window'
  | 'supreme_court'
  | 'final'

export interface DisputeState {
  phase: DisputePhase
  milestoneId: string
  contractId: string

  // Layer outputs (populated as pipeline progresses)
  verificationReport?: Awaited<ReturnType<typeof runVerification>>
  advocateBriefs?: Awaited<ReturnType<typeof runAdvocates>>
  tribunalResult?: Awaited<ReturnType<typeof runTribunal>>
  supremeCourtResult?: Awaited<ReturnType<typeof runSupremeCourt>>

  // Timing
  disputeWindowEnd?: string
  appealWindowEnd?: string

  // Audit
  auditRecords: ReturnType<typeof createAuditRecord>[]

  // Final outcome
  finalVerdict?: 'APPROVE' | 'DENY' | 'PARTIAL'
  finalPaymentPct?: number

  // Errors
  error?: string
}

type PhaseCallback = (state: DisputeState) => void | Promise<void>

/**
 * Run the full dispute resolution pipeline.
 *
 * The orchestrator drives the dispute through all layers:
 *   1. Verification (Layer 1) — already completed before dispute is filed
 *   2. Advocates (Layer 2) — triggered when dispute is filed
 *   3. Tribunal (Layer 3) — votes after advocates finish
 *   4. Supreme Court (Layer 4) — only if tribunal is 2-1 AND appeal is filed
 *
 * @param verificationInput - The original verification submission
 * @param disputeReason - Why the dispute was filed
 * @param disputeEvidence - Supporting evidence files
 * @param filedBy - Who filed the dispute
 * @param onPhaseChange - Callback for UI updates
 * @param config - Arbitration configuration
 */
export async function orchestrateDispute(params: {
  verificationInput: VerificationInput
  disputeReason: string
  disputeEvidence: string[]
  filedBy: 'client' | 'provider'
  fileAppeal?: boolean
  onPhaseChange?: PhaseCallback
  config?: ArbitrationConfig
}): Promise<DisputeState> {
  const config = params.config ?? DEFAULT_ARBITRATION_CONFIG
  const state: DisputeState = {
    phase: 'verification',
    milestoneId: params.verificationInput.contract.milestone.id,
    contractId: params.verificationInput.contract.id,
    auditRecords: [],
  }

  const notify = async () => {
    if (params.onPhaseChange) await params.onPhaseChange(state)
  }

  try {
    // =========================================================================
    // LAYER 1 — Verification
    // =========================================================================
    state.phase = 'verification'
    await notify()

    const verificationReport = await runVerification(params.verificationInput, config)
    state.verificationReport = verificationReport

    state.auditRecords.push(createAuditRecord({
      milestoneId: state.milestoneId,
      layer: 1,
      type: 'VerificationReport',
      title: 'AI Verification Report',
      document: verificationReport,
      hash: verificationReport.hash,
    }))

    // Check if verification passes
    if (verificationReport.verdict === 'FAIL') {
      state.phase = 'final'
      state.finalVerdict = 'DENY'
      state.finalPaymentPct = 0
      await notify()
      return state
    }

    // Open dispute window
    state.phase = 'dispute_window'
    state.disputeWindowEnd = new Date(
      Date.now() + config.disputeWindowHours * 60 * 60 * 1000,
    ).toISOString()
    await notify()

    // NOTE: In production, the dispute window is enforced by the smart contract.
    // The orchestrator proceeds immediately when a dispute is filed.

    // =========================================================================
    // LAYER 2 — Advocates
    // =========================================================================
    state.phase = 'advocates'
    await notify()

    const advocateInput: AdvocateInput = {
      contract: params.verificationInput.contract as unknown as Record<string, unknown>,
      deliverable: params.verificationInput.deliverable as unknown as Record<string, unknown>,
      evidence: params.verificationInput.evidence as unknown as Record<string, unknown>,
      dispute: {
        filedBy: params.filedBy,
        reason: params.disputeReason,
        supportingEvidence: params.disputeEvidence,
      },
      verificationReport: verificationReport as unknown as Record<string, unknown>,
    }

    const advocateBriefs = await runAdvocates(advocateInput, config)
    state.advocateBriefs = advocateBriefs

    state.auditRecords.push(
      createAuditRecord({
        milestoneId: state.milestoneId,
        layer: 2,
        type: 'AdvocateBrief_Provider',
        title: 'Provider Advocate Brief',
        document: advocateBriefs.providerBrief,
        hash: advocateBriefs.providerBrief.hash,
      }),
      createAuditRecord({
        milestoneId: state.milestoneId,
        layer: 2,
        type: 'AdvocateBrief_Client',
        title: 'Client Advocate Brief',
        document: advocateBriefs.clientBrief,
        hash: advocateBriefs.clientBrief.hash,
      }),
    )

    // =========================================================================
    // LAYER 3 — Tribunal
    // =========================================================================
    state.phase = 'tribunal'
    await notify()

    const tribunalInput: TribunalInput = {
      contract: params.verificationInput.contract as unknown as Record<string, unknown>,
      deliverable: params.verificationInput.deliverable as unknown as Record<string, unknown>,
      evidence: params.verificationInput.evidence as unknown as Record<string, unknown>,
      dispute: advocateInput.dispute as unknown as Record<string, unknown>,
      verificationReport: verificationReport as unknown as Record<string, unknown>,
      advocateBriefProvider: advocateBriefs.providerBrief as unknown as Record<string, unknown>,
      advocateBriefClient: advocateBriefs.clientBrief as unknown as Record<string, unknown>,
    }

    const tribunalResult = await runTribunal(tribunalInput, config)
    state.tribunalResult = tribunalResult

    // Audit each verdict + aggregate
    for (const verdict of tribunalResult.verdicts) {
      state.auditRecords.push(createAuditRecord({
        milestoneId: state.milestoneId,
        layer: 3,
        type: `TribunalVerdict_Judge${verdict.judgeIndex}`,
        title: `Tribunal Judge ${verdict.judgeIndex} (${verdict.model.provider})`,
        document: verdict,
        hash: verdict.hash,
      }))
    }
    const tribunalAggHash = await hashDocument(tribunalResult.decision)
    state.auditRecords.push(createAuditRecord({
      milestoneId: state.milestoneId,
      layer: 3,
      type: 'TribunalDecision_Aggregate',
      title: 'Tribunal Aggregate Decision',
      document: tribunalResult.decision,
      hash: tribunalAggHash,
    }))

    state.phase = 'tribunal_decided'
    await notify()

    // If unanimous (3-0), finalize immediately
    if (tribunalResult.decision.unanimous) {
      state.phase = 'final'
      state.finalVerdict = tribunalResult.decision.direction
      state.finalPaymentPct = tribunalResult.decision.paymentPct
      await notify()
      return state
    }

    // 2-1 split — open appeal window
    state.phase = 'appeal_window'
    state.appealWindowEnd = new Date(
      Date.now() + config.appealWindowHours * 60 * 60 * 1000,
    ).toISOString()
    await notify()

    // If no appeal, finalize with tribunal decision
    if (!params.fileAppeal) {
      state.phase = 'final'
      state.finalVerdict = tribunalResult.decision.direction
      state.finalPaymentPct = tribunalResult.decision.paymentPct
      await notify()
      return state
    }

    // =========================================================================
    // LAYER 4 — Supreme Court (appeal filed)
    // =========================================================================
    state.phase = 'supreme_court'
    await notify()

    const scInput: SupremeCourtInput = {
      contract: params.verificationInput.contract as unknown as Record<string, unknown>,
      deliverable: params.verificationInput.deliverable as unknown as Record<string, unknown>,
      evidence: params.verificationInput.evidence as unknown as Record<string, unknown>,
      dispute: advocateInput.dispute as unknown as Record<string, unknown>,
      verificationReport: verificationReport as unknown as Record<string, unknown>,
      advocateBriefProvider: advocateBriefs.providerBrief as unknown as Record<string, unknown>,
      advocateBriefClient: advocateBriefs.clientBrief as unknown as Record<string, unknown>,
      tribunalVerdicts: tribunalResult.verdicts as unknown as Record<string, unknown>[],
      tribunalDecision: {
        direction: tribunalResult.decision.direction,
        paymentPct: tribunalResult.decision.paymentPct,
        vote: '2-1',
        dissenter: tribunalResult.decision.dissenter!,
      },
    }

    const scResult = await runSupremeCourt(scInput, config)
    state.supremeCourtResult = scResult

    for (const verdict of scResult.verdicts) {
      state.auditRecords.push(createAuditRecord({
        milestoneId: state.milestoneId,
        layer: 4,
        type: `SupremeCourtVerdict_${verdict.judgeIndex}`,
        title: `Supreme Court Judge ${verdict.judgeIndex} (${verdict.model.provider})`,
        document: verdict,
        hash: verdict.hash,
      }))
    }
    const scAggHash = await hashDocument(scResult.decision)
    state.auditRecords.push(createAuditRecord({
      milestoneId: state.milestoneId,
      layer: 4,
      type: 'SupremeCourtDecision_Aggregate',
      title: 'Supreme Court Aggregate Decision',
      document: scResult.decision,
      hash: scAggHash,
    }))

    // Finalize
    state.phase = 'final'
    state.finalVerdict = scResult.decision.finalDirection
    state.finalPaymentPct = scResult.decision.paymentPct
    await notify()

    return state
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Unknown error during arbitration'
    await notify()
    return state
  }
}
