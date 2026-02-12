// =============================================================================
// POST /api/v1/verify — Submit deliverable for Layer 1 verification
// GET  /api/v1/verify?milestone_id=xxx — Get verification report
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { runVerification, DEFAULT_ARBITRATION_CONFIG, type VerificationInput } from '@repo/contract-intelligence'

// In-memory store (replace with database in production)
const verificationStore = new Map<string, unknown>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as VerificationInput

    // Validate required fields
    if (!body.contract?.id || !body.contract?.milestone?.id) {
      return NextResponse.json(
        { error: 'Missing required contract or milestone ID' },
        { status: 400 },
      )
    }

    if (!body.contract.milestone.criteria?.length) {
      return NextResponse.json(
        { error: 'Milestone must have at least one criterion' },
        { status: 400 },
      )
    }

    // Run Layer 1 verification
    const report = await runVerification(body, DEFAULT_ARBITRATION_CONFIG)

    // Store report
    verificationStore.set(body.contract.milestone.id, {
      report,
      input: body,
      createdAt: new Date().toISOString(),
    })

    // Determine escrow state transition
    const escrowAction = report.verdict === 'PASS' && report.confidence >= 80
      ? 'AI_VERIFIED'
      : report.verdict === 'PASS' && report.confidence < 80
        ? 'AI_VERIFIED_ADVISORY'
        : 'AI_REJECTED'

    return NextResponse.json({
      report,
      escrowAction,
      disputeWindowEnd: report.verdict === 'PASS'
        ? new Date(Date.now() + DEFAULT_ARBITRATION_CONFIG.disputeWindowHours * 60 * 60 * 1000).toISOString()
        : null,
    })
  } catch (error) {
    console.error('[v1/verify] Error:', error)
    return NextResponse.json(
      { error: 'Verification failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  const milestoneId = request.nextUrl.searchParams.get('milestone_id')

  if (!milestoneId) {
    return NextResponse.json({ error: 'milestone_id is required' }, { status: 400 })
  }

  const stored = verificationStore.get(milestoneId)
  if (!stored) {
    return NextResponse.json({ error: 'Verification report not found' }, { status: 404 })
  }

  return NextResponse.json(stored)
}
