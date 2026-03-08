/**
 * CRE Workflow Trigger Service
 *
 * HTTP client that calls CRE workflow HTTP trigger endpoints.
 * CRE workflows expose HTTP endpoints when using `withHttp` trigger.
 * This service posts payloads to those endpoints and returns the result.
 *
 * In production, CRE workflows run on Chainlink DON nodes.
 * In simulation, they run locally via `cre run --non-interactive`.
 */

import { getEnvVar } from '@bu/env/workers'
import { createLogger } from '@bu/logger'

const logger = createLogger({ prefix: 'cre-trigger' })

interface CreWorkflowResult<T = unknown> {
  success: boolean
  data: T
  error?: string
}

/**
 * Trigger a CRE workflow via its HTTP endpoint.
 *
 * @param action - The workflow action identifier (maps to workflow name)
 * @param payload - JSON payload to send to the workflow
 * @returns Parsed response from the CRE workflow
 */
export async function triggerCreWorkflow<T = unknown>(
  payload: Record<string, unknown>,
): Promise<T> {
  const action = payload.action as string
  const baseUrl = getEnvVar('CRE_GATEWAY_URL') ?? 'http://localhost:8088'

  // Map action names to CRE workflow IDs
  const workflowMap: Record<string, string> = {
    analyze: 'workflow-escrow-verify',
    verify: 'workflow-escrow-verify',
    dispute: 'workflow-escrow-dispute',
    finalize: 'workflow-escrow-finalize',
    reputation: 'workflow-escrow-finalize',
    deploy: 'workflow-escrow-deploy',
    yield: 'workflow-escrow-yield',
    monitor: 'workflow-escrow-monitor',
  }

  const workflowId = workflowMap[action]
  if (!workflowId) {
    throw new Error(`Unknown CRE workflow action: ${action}`)
  }

  const url = `${baseUrl}/workflows/${workflowId}/trigger`

  logger.info(`Triggering CRE workflow`, { action, workflowId, url })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    logger.error(`CRE workflow failed`, { action, status: response.status, errorText })
    throw new Error(`CRE workflow ${action} failed (${response.status}): ${errorText}`)
  }

  const result = await response.json() as CreWorkflowResult<T>

  if (!result.success && result.error) {
    throw new Error(`CRE workflow ${action} returned error: ${result.error}`)
  }

  return (result.data ?? result) as T
}

/**
 * Trigger a CRE workflow and handle the result falling back to
 * the Shiva intelligence routes when CRE is unavailable.
 *
 * This provides resilience: if the CRE gateway is down, the AI
 * arbitration logic runs directly via @bu/intelligence/arbitration.
 */
export async function triggerCreWorkflowWithFallback<T = unknown>(
  payload: Record<string, unknown>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await triggerCreWorkflow<T>(payload)
  } catch (error) {
    logger.warn(`CRE workflow failed, using fallback`, {
      action: payload.action,
      error: (error as Error).message,
    })
    return fallback()
  }
}
