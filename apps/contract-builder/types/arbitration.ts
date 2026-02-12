'use client'

// =============================================================================
// BUFI Adversarial AI Arbitration System — Type Definitions
// Spec v0.1 — 4-Layer Architecture
// =============================================================================

// -- Shared ------------------------------------------------------------------

export interface AIModelInfo {
  provider: string
  modelId: string
  version: string
}

// -- Smart Contract States ---------------------------------------------------

export type MilestoneEscrowState =
  | 'FUNDED'
  | 'AI_VERIFIED'
  | 'AI_REJECTED'
  | 'RELEASED'
  | 'DISPUTED'
  | 'TRIBUNAL_DECIDED'
  | 'APPEALED'
  | 'FINAL_APPROVED'
  | 'FINAL_DENIED'
  | 'FINAL_SPLIT'

// -- Layer 1: AI Verifier ----------------------------------------------------

export type CriterionType = 'binary' | 'quantitative' | 'qualitative'
export type VerificationVerdict = 'PASS' | 'FAIL'

export interface VerificationCriterionInput {
  id: string
  description: string
  type: CriterionType
  threshold?: string
}

export interface CriterionEvaluation {
  criterionId: string
  criterionDescription: string
  met: boolean
  confidence: number
  reasoning: string
}

export interface VerificationReport {
  reportId: string
  timestamp: string
  model: AIModelInfo
  verdict: VerificationVerdict
  confidence: number
  criteriaEvaluation: CriterionEvaluation[]
  summary: string
  evidenceAnalyzed: string[]
  hash: string
}

// -- Layer 2: AI Advocates ---------------------------------------------------

export type AdvocateRole = 'pro_provider' | 'pro_client'

export interface AdvocateArgument {
  argument: string
  strength: 'strong' | 'moderate' | 'weak'
  evidence: string[]
}

export interface AdvocateCriterionAnalysis {
  criterionId: string
  criterionDescription: string
  position: 'met' | 'not_met'
  argument: string
  evidenceCited: string[]
}

export type AdvocateVerdict = 'APPROVE' | 'DENY' | 'PARTIAL'

export interface AdvocateBrief {
  briefId: string
  timestamp: string
  advocateRole: AdvocateRole
  model: AIModelInfo
  positionSummary: string
  criteriaAnalysis: AdvocateCriterionAnalysis[]
  keyArguments: AdvocateArgument[]
  recommendedVerdict: AdvocateVerdict
  recommendedAmountPct: number
  hash: string
}

// -- Layer 3: AI Tribunal ----------------------------------------------------

export type TribunalVerdict = 'APPROVE' | 'DENY' | 'PARTIAL'

export interface TribunalJudgeCriterion {
  criterionId: string
  met: boolean
  reasoning: string
}

export interface TribunalJudgeReasoning {
  summary: string
  criteriaAnalysis: TribunalJudgeCriterion[]
  responseToAdvocateA: string
  responseToAdvocateB: string
}

export interface TribunalJudgeVerdict {
  verdictId: string
  timestamp: string
  judgeIndex: 1 | 2 | 3
  model: AIModelInfo
  verdict: TribunalVerdict
  paymentPct: number
  confidence: number
  reasoning: TribunalJudgeReasoning
  hash: string
}

export interface TribunalDecision {
  direction: 'APPROVE' | 'DENY'
  paymentPct: number
  unanimous: boolean
  appealable: boolean
  vote: '3-0' | '2-1'
  verdicts: TribunalJudgeVerdict[]
  dissenter?: 1 | 2 | 3
}

// -- Layer 4: AI Supreme Court -----------------------------------------------

export interface SupremeCourtJudgeVerdict {
  verdictId: string
  timestamp: string
  judgeIndex: 1 | 2 | 3 | 4 | 5
  model: AIModelInfo
  verdict: TribunalVerdict
  paymentPct: number
  confidence: number
  reasoning: TribunalJudgeReasoning & {
    responseToTribunalMajority: string
    responseToTribunalDissent: string
    upholdsTribunal: boolean
  }
  hash: string
}

export interface SupremeCourtDecision {
  overturned: boolean
  finalDirection: 'APPROVE' | 'DENY' | 'PARTIAL'
  paymentPct: number
  vote: string // e.g. "4-1", "3-2"
  verdicts: SupremeCourtJudgeVerdict[]
}

// -- Dispute (aggregate record) ----------------------------------------------

export type DisputePhase =
  | 'dispute_window'   // After Layer 1 pass, 72h window
  | 'advocates'        // Layer 2 generating briefs
  | 'tribunal'         // Layer 3 voting
  | 'tribunal_decided' // Waiting for appeal or auto-execute
  | 'appeal_window'    // 48h appeal window (2-1 only)
  | 'supreme_court'    // Layer 4 voting
  | 'final'            // Terminal — escrow action executed

export interface DisputeRecord {
  id: string
  contractId: string
  contractName: string
  milestoneId: string
  milestoneName: string
  filedBy: 'payer' | 'payee'
  filedAt: string
  reason: string
  supportingEvidence: string[]
  disputedAmount: number
  currency: string
  phase: DisputePhase
  escrowState: MilestoneEscrowState
  
  // Layer 1
  verificationReport: VerificationReport
  
  // Layer 2 (populated when phase >= 'advocates')
  advocateBriefProvider?: AdvocateBrief
  advocateBriefClient?: AdvocateBrief
  
  // Layer 3 (populated when phase >= 'tribunal_decided')
  tribunalDecision?: TribunalDecision
  
  // Layer 4 (populated when phase >= 'final' with appeal)
  supremeCourtDecision?: SupremeCourtDecision
  
  // Timeline windows
  disputeWindowEnd?: string
  appealWindowEnd?: string
  resolvedAt?: string
  
  // Final outcome
  finalVerdict?: 'APPROVE' | 'DENY' | 'PARTIAL'
  finalPaymentPct?: number
  
  // On-chain audit
  auditTrail: AuditDocument[]
}

export interface AuditDocument {
  id: string
  layer: 1 | 2 | 3 | 4
  type: string
  title: string
  hash: string
  ipfsCid?: string
  timestamp: string
}

// -- Arbitration Config (per-contract) ---------------------------------------

export interface ArbitrationConfig {
  disputeWindowHours: number
  maxResubmissions: number
  verificationConfidenceThreshold: number
  layer1Provider: string
  layer1Model: string
  layer2Provider: string
  layer2Model: string
  tribunalProviders: [string, string, string]
  tribunalModels: [string, string, string]
  supremeCourtProviders: string[]
  supremeCourtModels: string[]
}

export const DEFAULT_ARBITRATION_CONFIG: ArbitrationConfig = {
  disputeWindowHours: 72,
  maxResubmissions: 3,
  verificationConfidenceThreshold: 80,
  layer1Provider: 'anthropic',
  layer1Model: 'claude-sonnet-4-5-20250929',
  layer2Provider: 'anthropic',
  layer2Model: 'claude-sonnet-4-5-20250929',
  tribunalProviders: ['anthropic', 'openai', 'google'],
  tribunalModels: ['claude-sonnet-4-5-20250929', 'gpt-4o', 'gemini-2.0-flash'],
  supremeCourtProviders: ['mistral', 'meta', 'cohere', 'xai', 'amazon'],
  supremeCourtModels: ['mistral-large', 'llama-3.3-70b', 'command-r-plus', 'grok-2', 'nova-pro'],
}
