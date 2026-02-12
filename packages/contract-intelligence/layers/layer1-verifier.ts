// =============================================================================
// Layer 1 — AI Verifier
// Single model evaluates deliverable against contract criteria.
// Handles the happy path (~85-90% of cases).
// =============================================================================

import { z } from 'zod'
import { structured } from '../gateway'
import { ARBITRATION_PROMPTS } from '@repo/contract-prompts'
import type { ArbitrationConfig } from '../config'

// -- Input -------------------------------------------------------------------

export interface VerificationInput {
  contract: {
    id: string
    milestone: {
      id: string
      title: string
      criteria: {
        id: string
        description: string
        type: 'binary' | 'quantitative' | 'qualitative'
        threshold?: string
      }[]
    }
  }
  deliverable: {
    files: string[] // IPFS hashes or URLs
    providerNotes?: string
  }
  evidence: {
    files: string[]
    description: string
  }
}

// -- Output Schema -----------------------------------------------------------

const CriterionEvaluationSchema = z.object({
  criterionId: z.string(),
  met: z.boolean(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
})

const VerificationReportSchema = z.object({
  verdict: z.enum(['PASS', 'FAIL']),
  confidence: z.number().min(0).max(100),
  criteriaEvaluation: z.array(CriterionEvaluationSchema),
  summary: z.string(),
  evidenceAnalyzed: z.array(z.string()),
})

// -- Prompt Builder ----------------------------------------------------------

function buildVerificationPrompt(input: VerificationInput): string {
  return `
## Contract
Contract ID: ${input.contract.id}
Milestone: "${input.contract.milestone.title}" (${input.contract.milestone.id})

## Acceptance Criteria
${input.contract.milestone.criteria.map((c, i) => `${i + 1}. [${c.id}] (${c.type}) ${c.description}${c.threshold ? ` — Threshold: ${c.threshold}` : ''}`).join('\n')}

## Deliverable
Files submitted: ${input.deliverable.files.join(', ')}
${input.deliverable.providerNotes ? `Provider notes: ${input.deliverable.providerNotes}` : ''}

## Evidence
Files: ${input.evidence.files.join(', ')}
Description: ${input.evidence.description}

Evaluate each criterion and produce your verification report.
`
}

// -- Execution ---------------------------------------------------------------

export async function runVerification(
  input: VerificationInput,
  config: ArbitrationConfig,
) {
  const result = await structured({
    model: config.layer1.model,
    system: ARBITRATION_PROMPTS.verifier,
    prompt: buildVerificationPrompt(input),
    schema: VerificationReportSchema,
    idPrefix: 'vr',
  })

  return {
    reportId: result.id,
    timestamp: result.timestamp,
    model: result.model,
    ...result.output,
    hash: result.hash,
  }
}
