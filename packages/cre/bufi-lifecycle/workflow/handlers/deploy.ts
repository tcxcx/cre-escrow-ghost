import { createArtifact } from '../adapters/audit'
import type { Config } from '../main'
import type { Runtime } from '@chainlink/cre-sdk'

export interface DeployInput {
  agreementId: string
  agreementJson: Record<string, unknown>
}

export interface DeployResult {
  agreementId: string
  escrowFactory: string
  escrowAddress: string
  txHash: string
  deploymentArtifactHash: string
  deploymentArtifactRef: string
}

export async function handleDeploy(
  runtime: Runtime<Config>,
  input: DeployInput
): Promise<DeployResult> {
  const escrowFactory = runtime.config.escrowFactory
  if (!escrowFactory) {
    throw new Error('escrowFactory is not configured')
  }

  // CRE deploy step returns deterministic deployment intent data.
  // The on-chain execution is performed by the downstream gateway/operator.
  const deploymentIntent = {
    agreementId: input.agreementId,
    escrowFactory,
    chainSelectorName: runtime.config.chainSelectorName,
    timestamp: new Date().toISOString(),
    agreementHashHint:
      typeof input.agreementJson.hashing === 'object' &&
      input.agreementJson.hashing !== null &&
      'agreementHash' in input.agreementJson.hashing
        ? (input.agreementJson.hashing as { agreementHash?: string }).agreementHash ?? null
        : null,
  }

  const artifact = await createArtifact(
    deploymentIntent,
    'DeploymentReceipt',
    `agreements/${input.agreementId}`
  )

  return {
    agreementId: input.agreementId,
    escrowFactory,
    escrowAddress: '',
    txHash: '',
    deploymentArtifactHash: artifact.sha256,
    deploymentArtifactRef: artifact.storageRef,
  }
}
