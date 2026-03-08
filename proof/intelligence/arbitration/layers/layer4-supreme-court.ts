// =============================================================================
// Layer 4 — AI Supreme Court
// 5 models from 5 DIFFERENT providers (excludes Layer 3 providers).
// Supermajority (4/5) required to OVERTURN the tribunal decision.
// =============================================================================

import { z } from 'zod'
import { parallelStructured } from '../gateway'
import { ARBITRATION_PROMPTS } from '@bu/contracts/prompts'
import type { ArbitrationConfig } from '../config'
import { aggregateSupremeCourt } from '../aggregation'

// -- Input -------------------------------------------------------------------

export interface SupremeCourtInput {
  contract: Record<string, unknown>
  deliverable: Record<string, unknown>
  evidence: Record<string, unknown>
  dispute: Record<string, unknown>
  verificationReport: Record<string, unknown>
  advocateBriefProvider: Record<string, unknown>
  advocateBriefClient: Record<string, unknown>
  tribunalVerdicts: Record<string, unknown>[]
  tribunalDecision: {
    direction: 'APPROVE' | 'DENY'
    paymentPct: number
    vote: '2-1'
    dissenter: 1 | 2 | 3
  }
}

// -- Output Schema -----------------------------------------------------------

const CriterionAnalysisSchema = z.object({
  criterionId: z.string(),
  met: z.boolean(),
  reasoning: z.string(),
})

const SCReasoningSchema = z.object({
  summary: z.string(),
  criteriaAnalysis: z.array(CriterionAnalysisSchema),
  responseToAdvocateA: z.string(),
  responseToAdvocateB: z.string(),
  responseToTribunalMajority: z.string(),
  responseToTribunalDissent: z.string(),
  upholdsTribunal: z.boolean(),
})

const SCVerdictSchema = z.object({
  verdict: z.enum(['APPROVE', 'DENY', 'PARTIAL']),
  paymentPct: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  reasoning: SCReasoningSchema,
})

// -- Prompt Builder ----------------------------------------------------------

function buildSCPrompt(input: SupremeCourtInput, judgeIndex: number): string {
  return `
## Full Case Record
Contract: ${JSON.stringify(input.contract, null, 2)}
Deliverable: ${JSON.stringify(input.deliverable, null, 2)}
Evidence: ${JSON.stringify(input.evidence, null, 2)}
Dispute: ${JSON.stringify(input.dispute, null, 2)}

## AI Verification Report (Layer 1)
${JSON.stringify(input.verificationReport, null, 2)}

## Advocate Briefs (Layer 2)
Provider Advocate: ${JSON.stringify(input.advocateBriefProvider, null, 2)}
Client Advocate: ${JSON.stringify(input.advocateBriefClient, null, 2)}

## Tribunal Verdicts (Layer 3)
${input.tribunalVerdicts.map((v, i) => `Judge ${i + 1}: ${JSON.stringify(v, null, 2)}`).join('\n\n')}

## Tribunal Aggregate Decision
Direction: ${input.tribunalDecision.direction}
Payment: ${input.tribunalDecision.paymentPct}%
Vote: ${input.tribunalDecision.vote}
Dissenting Judge: ${input.tribunalDecision.dissenter}

You are Supreme Court Judge ${judgeIndex} of 5. Review the full record including the tribunal's split decision, and render your verdict.
Remember: 4 of 5 votes are required to OVERTURN the tribunal.
`
}

// -- Execution ---------------------------------------------------------------

/**
 * Run all 5 Supreme Court judges in parallel via AI Gateway.
 * Each judge uses a DIFFERENT provider — none of which served on the tribunal.
 */
export async function runSupremeCourt(
  input: SupremeCourtInput,
  config: ArbitrationConfig,
) {
  const results = await parallelStructured(
    config.layer4.judges.map((judge, i) => ({
      model: judge.model,
      system: ARBITRATION_PROMPTS.supremeCourtJudge,
      prompt: buildSCPrompt(input, i + 1),
      schema: SCVerdictSchema,
      idPrefix: `sc-judge${i + 1}`,
    })),
  )

  const verdicts = results.map((r, i) => ({
    verdictId: r.id,
    timestamp: r.timestamp,
    judgeIndex: (i + 1) as 1 | 2 | 3 | 4 | 5,
    model: r.model,
    ...r.output,
    hash: r.hash,
  }))

  const decision = aggregateSupremeCourt(
    verdicts,
    input.tribunalDecision.direction,
    input.tribunalDecision.paymentPct,
  )

  return { verdicts, decision }
}
