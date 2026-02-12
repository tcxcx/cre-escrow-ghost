/**
 * BUFI Contracts Lifecycle — CRE Main Entry Point
 *
 * Registers HTTP trigger handlers for the entire escrow + arbitration lifecycle.
 * CRE is the core orchestrator — the API gateway sends events here.
 *
 * Workflow handlers:
 *   WF-08: VerifyDeliverable  — Layer 1 AI verification
 *   WF-10+11: DisputeToTribunal — Layer 2 advocates + Layer 3 tribunal
 *   WF-13: FinalizeAndExecute — Build receipt, execute on-chain split
 *
 * Pattern: stablecoin-ace-ccip/bank-stablecoin-por-ace-ccip-workflow/main.ts
 */

import {
  cre,
  Runner,
  type Runtime,
  type HTTPPayload,
} from '@chainlink/cre-sdk'
import { z } from 'zod'
import { handleAnalyze, type AnalyzeInput } from './handlers/analyze'
import { handleDeploy, type DeployInput } from './handlers/deploy'
import { handleVerify, type VerifyInput } from './handlers/verify'
import { handleDispute, type DisputeInput } from './handlers/dispute'
import { handleFinalize, type FinalizeInput } from './handlers/finalize'
import { handleReputation, type ReputationInput } from './handlers/reputation'

// ── Config Schema ──────────────────────────────────────────────────────────

const modelSchema = z.object({
  provider: z.string(),
  model: z.string(),
})

const configSchema = z.object({
  chainSelectorName: z.string(),
  escrowFactory: z.string(),
  identityRegistry: z.string(),
  reputationRegistry: z.string(),
  usdcAddress: z.string(),
  eurcAddress: z.string(),
  gasLimit: z.string(),
  protocolFeeBps: z.number(),
  protocolFeeRecipient: z.string(),
  supabaseUrl: z.string(),
  verifier: modelSchema,
  advocates: modelSchema,
  tribunal: z.array(modelSchema),
  supremeCourt: z.array(modelSchema),
})

export type Config = z.infer<typeof configSchema>

// ── Payload Schemas ────────────────────────────────────────────────────────

const verifyPayloadSchema = z.object({
  action: z.literal('verify'),
  milestoneId: z.string(),
  milestoneTitle: z.string(),
  criteria: z.array(z.object({
    id: z.string(),
    text: z.string(),
    type: z.string().default('qualitative'),
    threshold: z.string().optional(),
  })),
  submissionFiles: z.array(z.string()),
  submissionNotes: z.string().optional(),
})

const analyzePayloadSchema = z.object({
  action: z.literal('analyze'),
  agreementId: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  documentBase64: z.string(),
})

const deployPayloadSchema = z.object({
  action: z.literal('deploy'),
  agreementId: z.string(),
  agreementJson: z.record(z.string(), z.unknown()),
})

const disputePayloadSchema = z.object({
  action: z.literal('dispute'),
  milestoneId: z.string(),
  milestoneTitle: z.string(),
  criteria: z.array(z.object({ id: z.string(), text: z.string() })),
  filedBy: z.enum(['payer', 'payee']),
  reason: z.string(),
  evidence: z.array(z.string()),
  verificationReportSummary: z.string(),
  verificationConfidence: z.number(),
})

const finalizePayloadSchema = z.object({
  action: z.literal('finalize'),
  agreementId: z.string(),
  milestoneId: z.string(),
  milestoneIndex: z.number(),
  escrowAddress: z.string(),
  payeeBps: z.number(),
  allArtifactHashes: z.array(z.string()),
  agentIdentities: z.object({
    executorAgentId: z.string(),
    verifierAgentId: z.string().optional(),
    advocateAgentIds: z.array(z.string()).optional(),
    tribunalAgentIds: z.array(z.string()).optional(),
  }),
})

const reputationPayloadSchema = z.object({
  action: z.literal('reputation'),
  disputeId: z.string(),
  jurorAgentIds: z.array(z.string()),
  majorityAgentIds: z.array(z.string()),
  overturned: z.boolean().default(false),
})

const payloadSchema = z.discriminatedUnion('action', [
  analyzePayloadSchema,
  deployPayloadSchema,
  verifyPayloadSchema,
  disputePayloadSchema,
  finalizePayloadSchema,
  reputationPayloadSchema,
])

// ── Safe JSON Stringify ────────────────────────────────────────────────────

const safeJsonStringify = (obj: unknown): string =>
  JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? value.toString() : value), 2)

// ── HTTP Trigger Handler ───────────────────────────────────────────────────

const onHTTPTrigger = async (runtime: Runtime<Config>, payload: HTTPPayload): Promise<string> => {
  runtime.log('=== BUFI Lifecycle Workflow ===')

  if (!payload.input || payload.input.length === 0) {
    throw new Error('HTTP trigger payload is required')
  }

  const payloadJson = JSON.parse(payload.input.toString())
  const parsed = payloadSchema.parse(payloadJson)

  runtime.log(`Action: ${parsed.action}`)

  switch (parsed.action) {
    case 'analyze': {
      const input: AnalyzeInput = {
        agreementId: parsed.agreementId,
        fileName: parsed.fileName,
        contentType: parsed.contentType,
        documentBase64: parsed.documentBase64,
      }
      const report = await handleAnalyze(runtime, input)
      return safeJsonStringify(report)
    }

    case 'deploy': {
      const input: DeployInput = {
        agreementId: parsed.agreementId,
        agreementJson: parsed.agreementJson,
      }
      const report = await handleDeploy(runtime, input)
      return safeJsonStringify(report)
    }

    case 'verify': {
      const input: VerifyInput = {
        milestoneId: parsed.milestoneId,
        milestoneTitle: parsed.milestoneTitle,
        criteria: parsed.criteria,
        submissionFiles: parsed.submissionFiles,
        submissionNotes: parsed.submissionNotes,
      }
      const report = await handleVerify(runtime, input)
      return safeJsonStringify(report)
    }

    case 'dispute': {
      const input: DisputeInput = {
        milestoneId: parsed.milestoneId,
        milestoneTitle: parsed.milestoneTitle,
        criteria: parsed.criteria,
        filedBy: parsed.filedBy,
        reason: parsed.reason,
        evidence: parsed.evidence,
        verificationReportSummary: parsed.verificationReportSummary,
        verificationConfidence: parsed.verificationConfidence,
      }

      const result = await handleDispute(runtime, input)
      return safeJsonStringify(result)
    }

    case 'finalize': {
      const input: FinalizeInput = {
        agreementId: parsed.agreementId,
        milestoneId: parsed.milestoneId,
        milestoneIndex: parsed.milestoneIndex,
        escrowAddress: parsed.escrowAddress,
        payeeBps: parsed.payeeBps,
        allArtifactHashes: parsed.allArtifactHashes,
        agentIdentities: parsed.agentIdentities,
      }

      const result = await handleFinalize(runtime, input)
      return safeJsonStringify(result)
    }

    case 'reputation': {
      const input: ReputationInput = {
        disputeId: parsed.disputeId,
        jurorAgentIds: parsed.jurorAgentIds,
        majorityAgentIds: parsed.majorityAgentIds,
        overturned: parsed.overturned,
      }
      const result = await handleReputation(runtime, input)
      return safeJsonStringify(result)
    }
  }
}

// ── Workflow Init ──────────────────────────────────────────────────────────

const initWorkflow = (config: Config) => {
  const httpTrigger = new cre.capabilities.HTTPCapability()

  return [
    cre.handler(httpTrigger.trigger({}), onHTTPTrigger),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>({
    configSchema,
  })
  await runner.run(initWorkflow)
}

main()
