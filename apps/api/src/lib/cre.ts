import type { Env } from './env'

export async function triggerCreWorkflow<TResponse>(
  env: Env,
  payload: Record<string, unknown>
): Promise<TResponse> {
  if (!env.CRE_WORKFLOW_URL) {
    throw new Error('CRE_WORKFLOW_URL is not configured')
  }

  const response = await fetch(env.CRE_WORKFLOW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(env.CRE_WORKFLOW_API_KEY
        ? {
            Authorization: `Bearer ${env.CRE_WORKFLOW_API_KEY}`,
          }
        : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`CRE workflow error (${response.status}): ${text}`)
  }

  return (await response.json()) as TResponse
}
