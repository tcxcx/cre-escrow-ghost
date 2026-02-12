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
import { handleVerify, type VerifyInput } from './handlers/verify'
import { handleDispute, type DisputeInput } from './handlers/dispute'
import { handleFinalize, type FinalizeInput } from './handlers/finalize'

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

const payloadSchema = z.discriminatedUnion('action', [
  verifyPayloadSchema,
  disputePayloadSchema,
  finalizePayloadSchema,
])

// ── Safe JSON Stringify ────────────────────────────────────────────────────

const safeJsonStringify = (obj: unknown): string =>
  JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? value.toString() : value), 2)

// ── HTTP Trigger Handler ───────────────────────────────────────────────────

const onHTTPTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): string => {
  runtime.log('=== BUFI Lifecycle Workflow ===')

  if (!payload.input || payload.input.length === 0) {
    throw new Error('HTTP trigger payload is required')
  }

  const payloadJson = JSON.parse(payload.input.toString())
  const parsed = payloadSchema.parse(payloadJson)

  runtime.log(`Action: ${parsed.action}`)

  switch (parsed.action) {
    case 'verify': {
      // Synchronous wrapper — CRE handlers must be sync
      // The handleVerify function uses runtime.* APIs which are sync in CRE context
      const input: VerifyInput = {
        milestoneId: parsed.milestoneId,
        milestoneTitle: parsed.milestoneTitle,
        criteria: parsed.criteria,
        submissionFiles: parsed.submissionFiles,
        submissionNotes: parsed.submissionNotes,
      }

      // Note: In CRE context, async/await is handled by the runtime
      // The HTTPClient calls are synchronous within the WASM sandbox
      const report = handleVerifySync(runtime, input)
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

      const result = handleDisputeSync(runtime, input)
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

      const result = handleFinalizeSync(runtime, input)
      return safeJsonStringify(result)
    }
  }
}

// ── Sync wrappers (CRE handlers are synchronous) ──────────────────────────
// These wrap the async handlers. In CRE WASM context, crypto.subtle.digest
// and other Web APIs are available synchronously within the sandbox.

function handleVerifySync(runtime: Runtime<Config>, input: VerifyInput): unknown {
  // In CRE, the runtime handles async internally
  // We call the handler directly — it uses runtime.* sync APIs
  return handleVerify(runtime, input)
}

function handleDisputeSync(runtime: Runtime<Config>, input: DisputeInput): unknown {
  return handleDispute(runtime, input)
}

function handleFinalizeSync(runtime: Runtime<Config>, input: FinalizeInput): unknown {
  return handleFinalize(runtime, input)
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
