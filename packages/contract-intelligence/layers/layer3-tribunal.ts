// =============================================================================
// Layer 3 — AI Tribunal
// 3 independent models from 3 DIFFERENT providers. Majority vote (2/3).
// Each judge deliberates independently — no judge sees another's verdict.
// =============================================================================

import { z } from 'zod'
import { parallelStructured } from '../gateway'
import { ARBITRATION_PROMPTS } from '@repo/contract-prompts'
import type { ArbitrationConfig } from '../config'
import { aggregateTribunal } from '../aggregation'

// -- Input -------------------------------------------------------------------

export interface TribunalInput {
  contract: Record<string, unknown>
  deliverable: Record<string, unknown>
  evidence: Record<string, unknown>
  dispute: Record<string, unknown>
  verificationReport: Record<string, unknown>
  advocateBriefProvider: Record<string, unknown>
  advocateBriefClient: Record<string, unknown>
}

// -- Output Schema -----------------------------------------------------------

const CriterionAnalysisSchema = z.object({
  criterionId: z.string(),
  met: z.boolean(),
  reasoning: z.string(),
})

const JudgeReasoningSchema = z.object({
  summary: z.string(),
  criteriaAnalysis: z.array(CriterionAnalysisSchema),
  responseToAdvocateA: z.string(),
  responseToAdvocateB: z.string(),
})

const TribunalVerdictSchema = z.object({
  verdict: z.enum(['APPROVE', 'DENY', 'PARTIAL']),
  paymentPct: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  reasoning: JudgeReasoningSchema,
})

// -- Prompt Builder ----------------------------------------------------------

function buildTribunalPrompt(input: TribunalInput, judgeIndex: number): string {
  return `
## Full Case Record
Contract: ${JSON.stringify(input.contract, null, 2)}
Deliverable: ${JSON.stringify(input.deliverable, null, 2)}
Evidence: ${JSON.stringify(input.evidence, null, 2)}
Dispute: ${JSON.stringify(input.dispute, null, 2)}

## AI Verification Report (Layer 1)
${JSON.stringify(input.verificationReport, null, 2)}

## Advocate Brief — Pro Provider (Layer 2A)
${JSON.stringify(input.advocateBriefProvider, null, 2)}

## Advocate Brief — Pro Client (Layer 2B)
${JSON.stringify(input.advocateBriefClient, null, 2)}

You are Judge ${judgeIndex} of 3 on this tribunal. Render your independent verdict.
`
}

// -- Execution ---------------------------------------------------------------

/**
 * Run all 3 tribunal judges in parallel via AI Gateway.
 * CRITICAL: Each judge deliberates independently — guaranteed by parallelStructured.
 * Each judge uses a DIFFERENT provider model for diversity of reasoning.
 */
export async function runTribunal(input: TribunalInput, config: ArbitrationConfig) {
  const results = await parallelStructured(
    config.layer3.judges.map((judge, i) => ({
      model: judge.model,
      system: ARBITRATION_PROMPTS.tribunalJudge,
      prompt: buildTribunalPrompt(input, i + 1),
      schema: TribunalVerdictSchema,
      idPrefix: `tv-judge${i + 1}`,
    })),
  )

  const verdicts = results.map((r, i) => ({
    verdictId: r.id,
    timestamp: r.timestamp,
    judgeIndex: (i + 1) as 1 | 2 | 3,
    model: r.model,
    ...r.output,
    hash: r.hash,
  }))

  const decision = aggregateTribunal(verdicts)

  return { verdicts, decision }
}
