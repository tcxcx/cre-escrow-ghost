// =============================================================================
// BUFI Intelligence Package — Adversarial AI Arbitration System
// =============================================================================
// Central orchestration layer for all AI-powered contract operations:
//   Layer 1: AI Verification (single model, deliverable evaluation)
//   Layer 2: AI Advocates (adversarial briefs, same provider)
//   Layer 3: AI Tribunal (3 judges, 3 providers, majority vote)
//   Layer 4: AI Supreme Court (5 judges, 5 providers, supermajority override)
// =============================================================================

// -- Gateway (DRY entry point for all AI calls) --
export { structured, parallelStructured, extractProvider } from './gateway'
export type { GatewayCallOptions, GatewayResult } from './gateway'

// -- Layers --
export { runVerification, type VerificationInput } from './layers/layer1-verifier'
export { runAdvocates, type AdvocateInput } from './layers/layer2-advocates'
export { runTribunal, type TribunalInput } from './layers/layer3-tribunal'
export { runSupremeCourt, type SupremeCourtInput } from './layers/layer4-supreme-court'

// -- Orchestration --
export { orchestrateDispute } from './orchestrator'
export type { DisputePhase, DisputeState } from './orchestrator'

// -- Aggregation (deterministic, mirrors on-chain logic) --
export { aggregateTribunal, aggregateSupremeCourt } from './aggregation'

// -- Audit --
export { hashDocument, createAuditRecord, buildOnChainRecord } from './audit'



// -- Config --
export { DEFAULT_ARBITRATION_CONFIG } from './config'
export type { ArbitrationConfig } from './config'
