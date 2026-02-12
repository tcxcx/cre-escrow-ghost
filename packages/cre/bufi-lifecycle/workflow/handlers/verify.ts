/**
 * WF-08: VerifyDeliverable
 *
 * Pattern: cre-por-llm-demo/por/main.ts (HTTPClient + ConsensusAggregationByFields)
 *
 * Verifies a deliverable against milestone acceptance criteria using an LLM.
 * Produces a VerificationReport artifact with hash.
 */

import {
  ConsensusAggregationByFields,
  HTTPClient,
  median,
  type HTTPSendRequester,
  type Runtime,
} from '@chainlink/cre-sdk'
import { getLLMCaller, getSecretKeyForProvider, type LLMResponse } from '../adapters/llm'
import { hashDocument } from '../adapters/audit'
import { VERIFIER_SYSTEM_PROMPT } from '../prompts'
import type { Config } from '../main'

export interface VerifyInput {
  milestoneId: string
  milestoneTitle: string
  criteria: Array<{
    id: string
    text: string
    type: string
    threshold?: string
  }>
  submissionFiles: string[]
  submissionNotes?: string
}

export interface CriterionResult {
  criterionId: string
  met: boolean
  confidence: number
  reasoning: string
}

export interface VerificationReport {
  reportId: string
  timestamp: string
  provider: string
  model: string
  verdict: 'PASS' | 'FAIL'
  confidence: number
  criteriaResults: CriterionResult[]
  summary: string
  hash: string
}

// Prompt imported from ../prompts.ts — principled Verification Officer personality

function buildVerifyPrompt(input: VerifyInput): string {
  const criteriaList = input.criteria
    .map((c, i) => `${i + 1}. [${c.id}] (${c.type}) ${c.text}${c.threshold ? ` — Threshold: ${c.threshold}` : ''}`)
    .join('\n')

  return `## Milestone: "${input.milestoneTitle}" (${input.milestoneId})

## Acceptance Criteria
${criteriaList}

## Submitted Deliverables
Files: ${input.submissionFiles.join(', ')}
${input.submissionNotes ? `Notes: ${input.submissionNotes}` : ''}

Evaluate each criterion and produce your verification report.`
}

/**
 * Run Layer 1 verification inside CRE with DON consensus.
 *
 * Pattern: HTTPClient.sendRequest(runtime, fetchFn, consensusAgg)(config).result()
 */
export async function handleVerify(
  runtime: Runtime<Config>,
  input: VerifyInput
): Promise<VerificationReport> {
  const { verifier } = runtime.config

  runtime.log(`[WF-08] Verifying milestone: ${input.milestoneTitle}`)
  runtime.log(`[WF-08] Using ${verifier.provider}/${verifier.model}`)

  // Get API key from CRE secrets
  const secretKey = getSecretKeyForProvider(verifier.provider)
  const apiKeySecret = runtime.getSecret({ id: secretKey }).result()

  const prompt = buildVerifyPrompt(input)

  // Build the LLM call function for CRE HTTPClient
  const llmCallFn = (sendRequester: HTTPSendRequester): { confidence: number; responseText: string } => {
    const caller = getLLMCaller(verifier.provider, apiKeySecret.value, {
      provider: verifier.provider,
      model: verifier.model,
      systemPrompt: VERIFIER_SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature: 0,
      responseFormat: 'json',
    })

    const response = caller(sendRequester)
    const parsed = JSON.parse(response.text)
    return {
      confidence: parsed.confidence ?? 0,
      responseText: response.text,
    }
  }

  // Execute with CRE consensus
  const httpClient = new HTTPClient()
  const consensusResult = httpClient
    .sendRequest(
      runtime,
      llmCallFn,
      ConsensusAggregationByFields<{ confidence: number; responseText: string }>({
        confidence: median,
        responseText: (values: string[]) => values[0], // take first for text
      }),
    )(runtime.config)
    .result()

  // Parse the full response
  const parsed = JSON.parse(consensusResult.responseText)
  const hash = await hashDocument(parsed)

  const report: VerificationReport = {
    reportId: `vr-${Date.now()}`,
    timestamp: new Date().toISOString(),
    provider: verifier.provider,
    model: verifier.model,
    verdict: parsed.verdict,
    confidence: consensusResult.confidence,
    criteriaResults: parsed.criteriaResults ?? [],
    summary: parsed.summary ?? '',
    hash,
  }

  runtime.log(`[WF-08] Verdict: ${report.verdict} (confidence: ${report.confidence}%)`)
  runtime.log(`[WF-08] Report hash: ${report.hash}`)

  return report
}
