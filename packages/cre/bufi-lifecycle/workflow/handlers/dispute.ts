/**
 * WF-10+11: DisputeToTribunal
 *
 * Orchestrates the full dispute pipeline:
 *   Layer 2: Generate 2 adversarial advocate briefs (same provider, opposite roles)
 *   Layer 3: 3 tribunal juror verdicts from 3 different providers, 2/3 majority
 *
 * Pattern: bank-stablecoin-por-ace-ccip-workflow/main.ts (multi-step orchestration)
 */

import {
  HTTPClient,
  ConsensusAggregationByFields,
  median,
  type HTTPSendRequester,
  type Runtime,
} from '@chainlink/cre-sdk'
import { getLLMCaller, getSecretKeyForProvider, type LLMResponse } from '../adapters/llm'
import { hashDocument } from '../adapters/audit'
import { ADVOCATE_PROVIDER_PROMPT, ADVOCATE_CLIENT_PROMPT, TRIBUNAL_JUDGE_PROMPT } from '../prompts'
import type { Config } from '../main'

// ── Types ──────────────────────────────────────────────────────────────────

export interface DisputeInput {
  milestoneId: string
  milestoneTitle: string
  criteria: Array<{ id: string; text: string }>
  filedBy: 'payer' | 'payee'
  reason: string
  evidence: string[]
  verificationReportSummary: string
  verificationConfidence: number
}

export interface AdvocateBrief {
  briefId: string
  role: 'pro_provider' | 'pro_client'
  provider: string
  model: string
  summary: string
  recommendedVerdict: 'APPROVE' | 'DENY' | 'PARTIAL'
  recommendedPayeeBps: number
  arguments: string[]
  hash: string
}

export interface TribunalVerdict {
  verdictId: string
  judgeIndex: number
  provider: string
  model: string
  verdict: 'APPROVE' | 'DENY' | 'PARTIAL'
  payeeBps: number
  confidence: number
  reasoning: string
  hash: string
}

export interface TribunalAggregate {
  direction: 'APPROVE' | 'DENY' | 'PARTIAL'
  payeeBps: number
  unanimous: boolean
  vote: '3-0' | '2-1'
  dissenterIndex?: number
}

export interface DisputeResult {
  advocateBriefs: { provider: AdvocateBrief; client: AdvocateBrief }
  tribunalVerdicts: TribunalVerdict[]
  aggregate: TribunalAggregate
  allHashes: string[]
}

// Prompts imported from ../prompts.ts — principled legal personalities for all agents

// ── Handler ────────────────────────────────────────────────────────────────

export async function handleDispute(
  runtime: Runtime<Config>,
  input: DisputeInput
): Promise<DisputeResult> {
  const config = runtime.config
  const allHashes: string[] = []

  runtime.log(`[WF-10+11] Starting dispute for milestone: ${input.milestoneTitle}`)
  runtime.log(`[WF-10+11] Filed by: ${input.filedBy}, reason: ${input.reason}`)

  // ── Layer 2: Advocate Briefs ─────────────────────────────────────────────

  runtime.log('[WF-10] Layer 2: Generating advocate briefs...')

  const caseContext = `## Milestone: "${input.milestoneTitle}"
## Criteria: ${input.criteria.map((c) => c.text).join('; ')}
## Dispute filed by: ${input.filedBy}
## Reason: ${input.reason}
## Evidence: ${input.evidence.join(', ')}
## Verification Report: ${input.verificationReportSummary} (confidence: ${input.verificationConfidence}%)`

  const advocateSecretKey = getSecretKeyForProvider(config.advocates.provider)
  const advocateApiKey = runtime.getSecret({ id: advocateSecretKey }).result()

  const httpClient = new HTTPClient()

  // Provider advocate
  const providerBriefResult = httpClient.sendRequest(
    runtime,
    (sendRequester: HTTPSendRequester) => {
      const caller = getLLMCaller(config.advocates.provider, advocateApiKey.value, {
        provider: config.advocates.provider,
        model: config.advocates.model,
        systemPrompt: ADVOCATE_PROVIDER_PROMPT,
        userPrompt: caseContext,
        temperature: 0,
        responseFormat: 'json',
      })
      return { text: caller(sendRequester).text }
    },
    ConsensusAggregationByFields<{ text: string }>({
      text: (vals: string[]) => vals[0],
    }),
  )(config).result()

  const providerParsed = JSON.parse(providerBriefResult.text)
  const providerHash = await hashDocument(providerParsed)
  allHashes.push(providerHash)

  const providerBrief: AdvocateBrief = {
    briefId: `ab-prov-${Date.now()}`,
    role: 'pro_provider',
    provider: config.advocates.provider,
    model: config.advocates.model,
    summary: providerParsed.summary,
    recommendedVerdict: providerParsed.recommendedVerdict,
    recommendedPayeeBps: providerParsed.recommendedPayeeBps,
    arguments: providerParsed.arguments,
    hash: providerHash,
  }

  // Client advocate
  const clientBriefResult = httpClient.sendRequest(
    runtime,
    (sendRequester: HTTPSendRequester) => {
      const caller = getLLMCaller(config.advocates.provider, advocateApiKey.value, {
        provider: config.advocates.provider,
        model: config.advocates.model,
        systemPrompt: ADVOCATE_CLIENT_PROMPT,
        userPrompt: caseContext,
        temperature: 0,
        responseFormat: 'json',
      })
      return { text: caller(sendRequester).text }
    },
    ConsensusAggregationByFields<{ text: string }>({
      text: (vals: string[]) => vals[0],
    }),
  )(config).result()

  const clientParsed = JSON.parse(clientBriefResult.text)
  const clientHash = await hashDocument(clientParsed)
  allHashes.push(clientHash)

  const clientBrief: AdvocateBrief = {
    briefId: `ab-client-${Date.now()}`,
    role: 'pro_client',
    provider: config.advocates.provider,
    model: config.advocates.model,
    summary: clientParsed.summary,
    recommendedVerdict: clientParsed.recommendedVerdict,
    recommendedPayeeBps: clientParsed.recommendedPayeeBps,
    arguments: clientParsed.arguments,
    hash: clientHash,
  }

  runtime.log(`[WF-10] Provider advocate: ${providerBrief.recommendedVerdict} (${providerBrief.recommendedPayeeBps} bps)`)
  runtime.log(`[WF-10] Client advocate: ${clientBrief.recommendedVerdict} (${clientBrief.recommendedPayeeBps} bps)`)

  // ── Layer 3: Tribunal ────────────────────────────────────────────────────

  runtime.log('[WF-11] Layer 3: Running tribunal (3 judges)...')

  const tribunalContext = `${caseContext}

## Advocate Brief (Pro-Provider): ${providerBrief.summary}
Key arguments: ${providerBrief.arguments.join('; ')}

## Advocate Brief (Pro-Client): ${clientBrief.summary}
Key arguments: ${clientBrief.arguments.join('; ')}`

  const verdicts: TribunalVerdict[] = []

  for (let i = 0; i < config.tribunal.length; i++) {
    const judge = config.tribunal[i]
    const judgeSecretKey = getSecretKeyForProvider(judge.provider)
    const judgeApiKey = runtime.getSecret({ id: judgeSecretKey }).result()

    runtime.log(`[WF-11] Judge ${i + 1}: ${judge.provider}/${judge.model}`)

    const verdictResult = httpClient.sendRequest(
      runtime,
      (sendRequester: HTTPSendRequester) => {
        const caller = getLLMCaller(judge.provider, judgeApiKey.value, {
          provider: judge.provider,
          model: judge.model,
          systemPrompt: TRIBUNAL_JUDGE_PROMPT,
          userPrompt: tribunalContext,
          temperature: 0,
          responseFormat: 'json',
        })
        return { text: caller(sendRequester).text }
      },
      ConsensusAggregationByFields<{ text: string }>({
        text: (vals: string[]) => vals[0],
      }),
    )(config).result()

    const verdictParsed = JSON.parse(verdictResult.text)
    const verdictHash = await hashDocument(verdictParsed)
    allHashes.push(verdictHash)

    verdicts.push({
      verdictId: `tv-${i}-${Date.now()}`,
      judgeIndex: i + 1,
      provider: judge.provider,
      model: judge.model,
      verdict: verdictParsed.verdict,
      payeeBps: verdictParsed.payeeBps,
      confidence: verdictParsed.confidence,
      reasoning: verdictParsed.reasoning,
      hash: verdictHash,
    })

    runtime.log(`[WF-11] Judge ${i + 1} verdict: ${verdictParsed.verdict} (${verdictParsed.payeeBps} bps, confidence: ${verdictParsed.confidence}%)`)
  }

  // ── Aggregate Tribunal Decision ──────────────────────────────────────────

  const approveCount = verdicts.filter((v) => v.verdict === 'APPROVE').length
  const denyCount = verdicts.filter((v) => v.verdict === 'DENY').length
  const partialCount = verdicts.filter((v) => v.verdict === 'PARTIAL').length

  let direction: 'APPROVE' | 'DENY' | 'PARTIAL'
  if (approveCount >= 2) direction = 'APPROVE'
  else if (denyCount >= 2) direction = 'DENY'
  else direction = 'PARTIAL'

  const avgPayeeBps = Math.round(verdicts.reduce((sum, v) => sum + v.payeeBps, 0) / verdicts.length)
  const unanimous = approveCount === 3 || denyCount === 3
  const vote = unanimous ? '3-0' as const : '2-1' as const

  const dissenterIndex = !unanimous
    ? verdicts.findIndex((v) => v.verdict !== direction)
    : undefined

  const aggregate: TribunalAggregate = {
    direction,
    payeeBps: direction === 'APPROVE' ? 10000 : direction === 'DENY' ? 0 : avgPayeeBps,
    unanimous,
    vote,
    dissenterIndex: dissenterIndex !== undefined ? dissenterIndex + 1 : undefined,
  }

  const aggregateHash = await hashDocument(aggregate)
  allHashes.push(aggregateHash)

  runtime.log(`[WF-11] Tribunal decision: ${aggregate.direction} (${aggregate.vote}), payeeBps: ${aggregate.payeeBps}`)
  if (!aggregate.unanimous) {
    runtime.log(`[WF-11] Split decision — appeal window will open`)
  }

  return {
    advocateBriefs: { provider: providerBrief, client: clientBrief },
    tribunalVerdicts: verdicts,
    aggregate,
    allHashes,
  }
}
