// =============================================================================
// Layer 2 — AI Advocates
// Two calls to the SAME model with adversarial prompts.
// Neither advocate sees the other's output.
// =============================================================================

import { z } from 'zod'
import { parallelStructured } from '../gateway'
import { ARBITRATION_PROMPTS } from '@repo/contract-prompts'
import type { ArbitrationConfig } from '../config'

// -- Input -------------------------------------------------------------------

export interface AdvocateInput {
  contract: Record<string, unknown>
  deliverable: Record<string, unknown>
  evidence: Record<string, unknown>
  dispute: {
    filedBy: 'client' | 'provider'
    reason: string
    supportingEvidence: string[]
  }
  verificationReport: Record<string, unknown>
}

// -- Output Schema -----------------------------------------------------------

const CriterionAnalysisSchema = z.object({
  criterionId: z.string(),
  position: z.enum(['met', 'not_met']),
  argument: z.string(),
  evidenceCited: z.array(z.string()),
})

const KeyArgumentSchema = z.object({
  argument: z.string(),
  strength: z.enum(['strong', 'moderate', 'weak']),
  evidence: z.array(z.string()),
})

const AdvocateBriefSchema = z.object({
  positionSummary: z.string(),
  criteriaAnalysis: z.array(CriterionAnalysisSchema),
  keyArguments: z.array(KeyArgumentSchema),
  recommendedVerdict: z.enum(['APPROVE', 'DENY', 'PARTIAL']),
  recommendedAmountPct: z.number().min(0).max(100),
})

// -- Prompt Builder ----------------------------------------------------------

function buildAdvocatePrompt(input: AdvocateInput): string {
  return `
## Full Case Record
Contract: ${JSON.stringify(input.contract, null, 2)}

## Deliverable
${JSON.stringify(input.deliverable, null, 2)}

## Evidence (both parties)
${JSON.stringify(input.evidence, null, 2)}

## Dispute
Filed by: ${input.dispute.filedBy}
Reason: ${input.dispute.reason}
Supporting evidence: ${input.dispute.supportingEvidence.join(', ')}

## AI Verification Report (Layer 1)
${JSON.stringify(input.verificationReport, null, 2)}

Construct your brief.
`
}

// -- Execution ---------------------------------------------------------------

/**
 * Run both advocates in parallel through AI Gateway.
 * CRITICAL: Neither advocate sees the other's output — guaranteed by parallelStructured.
 */
export async function runAdvocates(input: AdvocateInput, config: ArbitrationConfig) {
  const prompt = buildAdvocatePrompt(input)

  const [providerResult, clientResult] = await parallelStructured([
    {
      model: config.layer2.model,
      system: ARBITRATION_PROMPTS.advocateProvider,
      prompt,
      schema: AdvocateBriefSchema,
      idPrefix: 'ab-provider',
    },
    {
      model: config.layer2.model,
      system: ARBITRATION_PROMPTS.advocateClient,
      prompt,
      schema: AdvocateBriefSchema,
      idPrefix: 'ab-client',
    },
  ])

  return {
    providerBrief: {
      briefId: providerResult.id,
      timestamp: providerResult.timestamp,
      advocateRole: 'pro_provider' as const,
      model: providerResult.model,
      ...providerResult.output,
      hash: providerResult.hash,
    },
    clientBrief: {
      briefId: clientResult.id,
      timestamp: clientResult.timestamp,
      advocateRole: 'pro_client' as const,
      model: clientResult.model,
      ...clientResult.output,
      hash: clientResult.hash,
    },
  }
}
