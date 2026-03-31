// =============================================================================
// Aggregation Logic — Deterministic decision rules
// These functions are pure — given the same verdicts, they always produce
// the same decision. They mirror the on-chain smart contract logic.
// =============================================================================

interface VerdictLike {
  verdict: 'APPROVE' | 'DENY' | 'PARTIAL'
  paymentPct: number
  confidence: number
}

// -- Layer 3: Tribunal (2/3 majority) ----------------------------------------

export function aggregateTribunal(verdicts: (VerdictLike & { judgeIndex: 1 | 2 | 3 })[]) {
  if (verdicts.length !== 3) throw new Error('Tribunal requires exactly 3 verdicts')

  // Count directions: APPROVE and PARTIAL count as "approve side"
  const approveSide = verdicts.filter(v => v.verdict === 'APPROVE' || v.verdict === 'PARTIAL')
  const denySide = verdicts.filter(v => v.verdict === 'DENY')

  const approveCount = approveSide.length
  const denyCount = denySide.length

  let direction: 'APPROVE' | 'DENY'
  let paymentPct: number

  if (approveCount >= 2) {
    direction = 'APPROVE'
    // Average of approving judges' payment percentages
    paymentPct = Math.round(
      approveSide.reduce((sum, v) => sum + v.paymentPct, 0) / approveSide.length,
    )
  } else {
    direction = 'DENY'
    paymentPct = 0
  }

  const unanimous = approveCount === 3 || denyCount === 3
  const vote = unanimous ? '3-0' as const : '2-1' as const

  // Find dissenter (if split)
  let dissenter: 1 | 2 | 3 | undefined
  if (!unanimous) {
    if (approveCount >= 2) {
      dissenter = denySide[0]?.judgeIndex
    } else {
      dissenter = approveSide[0]?.judgeIndex
    }
  }

  return {
    direction,
    paymentPct,
    unanimous,
    appealable: !unanimous,
    vote,
    dissenter,
  }
}

// -- Layer 4: Supreme Court (4/5 supermajority to overturn) ------------------

export function aggregateSupremeCourt(
  verdicts: (VerdictLike & { judgeIndex: 1 | 2 | 3 | 4 | 5 })[],
  tribunalDirection: 'APPROVE' | 'DENY',
  tribunalPaymentPct: number,
) {
  if (verdicts.length !== 5) throw new Error('Supreme Court requires exactly 5 verdicts')

  // Count how many disagree with the tribunal
  const overturnVotes = verdicts.filter(v => {
    if (tribunalDirection === 'APPROVE') {
      return v.verdict === 'DENY'
    }
    return v.verdict === 'APPROVE' || v.verdict === 'PARTIAL'
  })

  const overturnCount = overturnVotes.length
  const upholdCount = 5 - overturnCount
  const overturned = overturnCount >= 4 // Supermajority required

  let finalDirection: 'APPROVE' | 'DENY' | 'PARTIAL'
  let paymentPct: number

  if (overturned) {
    // Tribunal overturned — use Supreme Court's direction
    const overturningVerdicts = overturnVotes
    paymentPct = Math.round(
      overturningVerdicts.reduce((sum, v) => sum + v.paymentPct, 0) / overturningVerdicts.length,
    )
    finalDirection = tribunalDirection === 'APPROVE' ? 'DENY' : 'APPROVE'
  } else {
    // Tribunal decision stands
    finalDirection = tribunalDirection
    paymentPct = tribunalPaymentPct
  }

  const vote = `${Math.max(upholdCount, overturnCount)}-${Math.min(upholdCount, overturnCount)}`

  return {
    overturned,
    finalDirection,
    paymentPct,
    vote,
  }
}
