/**
 * BUFI API Client — Frontend calls to the thin Hono gateway
 *
 * All orchestration happens server-side via CRE workflows.
 * The UI just sends events and reads state.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'

async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options?.headers || {}),
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((error as { error?: string }).error || `API error: ${res.status}`)
  }

  return res.json() as Promise<T>
}

// ── Agreement APIs ─────────────────────────────────────────────────────────

export async function createAgreementFromTemplate(params: {
  title: string
  agreementJson: unknown
  agreementHash: string
  tokenAddress: string
  payerAddress: string
  payeeAddress: string
  totalAmount: number
  milestones: Array<{
    title: string
    amount: number
    acceptanceCriteria: unknown[]
    dueDate?: string
  }>
}) {
  return apiRequest<{ success: boolean; agreementId: string }>('/agreements/from-template', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}

export async function uploadAgreementDocument(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return apiRequest<{ success: boolean; agreementId: string; documentPath: string }>(
    '/agreements/upload',
    { method: 'POST', body: formData }
  )
}

export async function getAgreement(agreementId: string) {
  return apiRequest<Record<string, unknown>>(`/agreements/${agreementId}`)
}

export async function listAgreements(params?: { limit?: number; offset?: number }) {
  const query = new URLSearchParams()
  if (params?.limit !== undefined) query.set('limit', String(params.limit))
  if (params?.offset !== undefined) query.set('offset', String(params.offset))
  const suffix = query.toString().length > 0 ? `?${query.toString()}` : ''
  return apiRequest<{ agreements: Array<Record<string, unknown>> }>(`/agreements${suffix}`)
}

export async function getAgreementArtifacts(agreementId: string) {
  return apiRequest<{ artifacts: unknown[] }>(`/agreements/${agreementId}/artifacts`)
}

export async function getMilestoneReceipt(agreementId: string, milestoneId: string) {
  return apiRequest<Record<string, unknown>>(
    `/agreements/${agreementId}/milestones/${milestoneId}/receipt`
  )
}

export async function getMilestoneVerification(agreementId: string, milestoneId: string) {
  return apiRequest<Record<string, unknown>>(
    `/agreements/${agreementId}/milestones/${milestoneId}/verification`
  )
}

export async function signAgreement(
  agreementId: string,
  role: 'payer' | 'payee',
  signerAddress: string
) {
  return apiRequest<{ success: boolean; status: string }>(`/agreements/${agreementId}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, signerAddress }),
  })
}

export async function fundAgreement(
  agreementId: string,
  amount: number,
  txHash: string
) {
  return apiRequest<{ success: boolean; fundedAmount: number }>(`/agreements/${agreementId}/fund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, txHash }),
  })
}

// ── Milestone APIs ─────────────────────────────────────────────────────────

export async function submitDeliverable(
  agreementId: string,
  milestoneId: string,
  files: File[],
  notes?: string
) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  if (notes) formData.append('notes', notes)

  return apiRequest<{ success: boolean; submissionId: string }>(
    `/agreements/${agreementId}/milestones/${milestoneId}/submit`,
    { method: 'POST', body: formData }
  )
}

export async function fileDispute(
  agreementId: string,
  milestoneId: string,
  params: {
    filedBy: 'payer' | 'payee'
    reason: string
    evidenceFiles?: string[]
  }
) {
  return apiRequest<{ success: boolean; disputeId: string }>(
    `/agreements/${agreementId}/milestones/${milestoneId}/dispute`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }
  )
}

// ── Agent APIs ─────────────────────────────────────────────────────────────

export async function listAgents(kind?: string) {
  const query = kind ? `?kind=${kind}` : ''
  return apiRequest<{ agents: unknown[] }>(`/agents/erc8004${query}`)
}

export async function getAgent(agentId: string) {
  return apiRequest<Record<string, unknown>>(`/agents/erc8004/${agentId}`)
}

export async function registerAgent(params: {
  kind: string
  agentId: string
  agentUri: string
  ownerAddress: string
  chainId?: number
  agentWallet?: string
  modelId?: string
  provider?: string
}) {
  return apiRequest<{ success: boolean; agent: unknown }>('/agents/erc8004/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}

// ── Document Analysis (existing) ───────────────────────────────────────────

export async function analyzeDocument(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return apiRequest<{ amounts: unknown[]; tasks: unknown[]; milestones?: unknown[] }>(
    '/contracts/analyze',
    { method: 'POST', body: formData }
  )
}
