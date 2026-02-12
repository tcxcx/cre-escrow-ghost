import type { Runtime } from '@chainlink/cre-sdk'
import type { Config } from '../main'
import { createArtifact } from '../adapters/audit'

export interface ReputationInput {
  disputeId: string
  jurorAgentIds: string[]
  majorityAgentIds: string[]
  overturned: boolean
}

export interface ReputationResult {
  disputeId: string
  receipts: Array<{
    jurorAgentId: string
    tags: string[]
    score: number
    receiptHash: string
  }>
}

export async function handleReputation(
  _runtime: Runtime<Config>,
  input: ReputationInput
): Promise<ReputationResult> {
  const receipts: ReputationResult['receipts'] = []

  for (const jurorAgentId of input.jurorAgentIds) {
    const alignedWithMajority = input.majorityAgentIds.includes(jurorAgentId)
    const score = alignedWithMajority ? 100 : 20
    const payload = {
      disputeId: input.disputeId,
      jurorAgentId,
      tags: ['accuracy', 'consistency', 'was_overturned'],
      score,
      alignedWithMajority,
      overturned: input.overturned,
      timestamp: new Date().toISOString(),
    }
    const artifact = await createArtifact(
      payload,
      'ReputationUpdateReceipt',
      `disputes/${input.disputeId}`
    )
    receipts.push({
      jurorAgentId,
      tags: payload.tags,
      score,
      receiptHash: artifact.sha256,
    })
  }

  return {
    disputeId: input.disputeId,
    receipts,
  }
}
