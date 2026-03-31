/* eslint-disable no-console */

type JsonRecord = Record<string, unknown>

const API_BASE = process.env.BUFI_API_BASE_URL ?? 'http://127.0.0.1:8787'
const ESCROW_ADDRESS = process.env.BUFI_SMOKE_ESCROW_ADDRESS ?? ''

async function request<T = JsonRecord>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options)
  const text = await res.text()
  let parsed: unknown = {}
  try {
    parsed = text ? JSON.parse(text) : {}
  } catch {
    parsed = { raw: text }
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} @ ${path}\n${JSON.stringify(parsed, null, 2)}`)
  }
  return parsed as T
}

async function run() {
  console.log(`\nBUFI smoke test against ${API_BASE}\n`)

  await request('/health')
  console.log('0) API health check passed')

  const agreementPayload = {
    title: 'Hackathon Smoke Agreement',
    agreementJson: {
      schemaVersion: '1.0',
      title: 'Hackathon Smoke Agreement',
      currency: 'USDC',
      parties: [
        { role: 'payer', name: 'Smoke Client' },
        { role: 'payee', name: 'Smoke Provider' },
      ],
      milestones: [
        {
          title: 'Smoke milestone',
          description: 'Single milestone for API smoke test',
          amount: 100,
          acceptanceCriteria: [{ id: 'c1', text: 'Deliver a smoke test artifact' }],
          dueDate: null,
        },
      ],
      fees: { protocolFeeBps: 50 },
    },
    agreementHash: `smoke-${Date.now()}`,
    tokenAddress: '0x5425890298aed601595a70AB815c96711a31Bc65',
    payerAddress: '0x1111111111111111111111111111111111111111',
    payeeAddress: '0x2222222222222222222222222222222222222222',
    totalAmount: 100,
    milestones: [
      {
        title: 'Smoke milestone',
        amount: 100,
        acceptanceCriteria: [{ id: 'c1', text: 'Deliver a smoke test artifact' }],
      },
    ],
  }

  const created = await request<{ agreementId: string }>(
    '/agreements/from-template',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agreementPayload),
    }
  )
  const agreementId = created.agreementId
  if (!agreementId) {
    throw new Error('agreementId missing from /agreements/from-template response')
  }
  console.log(`1) Created agreement: ${agreementId}`)

  await request(`/agreements/${agreementId}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'payer',
      signerAddress: '0x1111111111111111111111111111111111111111',
    }),
  })
  await request(`/agreements/${agreementId}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'payee',
      signerAddress: '0x2222222222222222222222222222222222222222',
    }),
  })
  console.log('2) Signed as payer and payee')

  await request(`/agreements/${agreementId}/fund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 100,
      txHash: `0xsmoke${Date.now().toString(16).padStart(58, '0')}`.slice(0, 66),
    }),
  })
  console.log('3) Funded agreement')

  const agreement = await request<JsonRecord>(`/agreements/${agreementId}`)
  const milestones = Array.isArray(agreement.milestones)
    ? (agreement.milestones as JsonRecord[])
    : []
  const milestoneId = milestones[0]?.id
  if (typeof milestoneId !== 'string' || milestoneId.length === 0) {
    throw new Error('No milestone found after agreement creation')
  }
  console.log(`4) Resolved milestone: ${milestoneId}`)

  const fd = new FormData()
  fd.append(
    'files',
    new File([`Smoke deliverable ${new Date().toISOString()}`], 'deliverable.txt', {
      type: 'text/plain',
    })
  )
  fd.append('notes', 'Automated smoke submission')
  await request(`/agreements/${agreementId}/milestones/${milestoneId}/submit`, {
    method: 'POST',
    body: fd,
  })
  console.log('5) Submitted deliverable')

  await request(`/agreements/${agreementId}/milestones/${milestoneId}/dispute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filedBy: 'payer',
      reason: 'Smoke dispute to exercise arbitration path',
      evidenceFiles: [],
    }),
  })
  console.log('6) Filed dispute')

  if (ESCROW_ADDRESS) {
    await request(`/agreements/${agreementId}/milestones/${milestoneId}/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payeeBps: 7000,
        escrowAddress: ESCROW_ADDRESS,
        executorAgentId: '1',
        jurorAgentIds: ['2', '3', '4'],
        majorityAgentIds: ['2', '3'],
      }),
    })
    console.log('7) Finalized (with configured escrow address)')
  } else {
    console.log('7) Skipped finalize (set BUFI_SMOKE_ESCROW_ADDRESS to enable)')
  }

  const artifacts = await request(`/agreements/${agreementId}/artifacts`)
  console.log('8) Artifacts fetched')

  let receiptStatus = 'skipped'
  try {
    await request(`/agreements/${agreementId}/milestones/${milestoneId}/receipt`)
    receiptStatus = 'ok'
  } catch {
    receiptStatus = 'unavailable'
  }
  console.log(`9) Receipt check: ${receiptStatus}`)

  console.log('\nSmoke test complete.')
  console.log(JSON.stringify({ agreementId, milestoneId, artifacts }, null, 2))
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error('\nSmoke test failed:\n', message)
  if (message.includes('supabaseUrl is required')) {
    console.error(
      '\nHint: API worker env is missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY.\n' +
        'Create apps/api/.dev.vars from apps/api/.dev.vars.example before running.'
    )
  }
  process.exit(1)
})
