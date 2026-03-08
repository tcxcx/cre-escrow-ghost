'use client'

import { useEffect, useState, useCallback } from 'react'
import { getAgreement } from '@/lib/api/client'
import type { Agreement, Milestone } from '@/lib/api/client'
import type { ActivityType } from './activity-feed'

export interface DerivedActivityItem {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string
  txHash?: string
  metadata?: Record<string, unknown>
}

/**
 * Derive activity events from an agreement's data.
 * Since there is no dedicated activities table yet, we reconstruct
 * lifecycle events from the contract and milestone timestamps/states.
 */
function deriveActivities(agreement: Agreement): DerivedActivityItem[] {
  const events: DerivedActivityItem[] = []

  // 1. Contract created
  events.push({
    id: `${agreement.agreement_id}-created`,
    type: 'contract_deployed',
    title: 'Contract created',
    description: `"${agreement.title}" was created`,
    timestamp: agreement.created_at,
  })

  // 2. Signatures — derive from status progression
  //    If the contract is past pending-signatures, both parties signed.
  const postSignatureStatuses = [
    'pending-funding', 'funded', 'active', 'completed', 'disputed',
  ]
  const status = agreement.status

  if (postSignatureStatuses.includes(status) || status === 'pending_signatures') {
    // If still pending signatures, at least one party may have signed.
    // We can only infer — show payer signed if status moved past draft.
    if (status !== 'draft') {
      events.push({
        id: `${agreement.agreement_id}-payer-signed`,
        type: 'contract_signed',
        title: 'Payer signed',
        description: `${agreement.payer_address?.slice(0, 6) ?? 'Payer'}...${agreement.payer_address?.slice(-4) ?? ''} signed the agreement`,
        // Use created_at + small offset since we don't have exact sign time
        timestamp: agreement.updated_at,
      })
    }

    if (postSignatureStatuses.includes(status)) {
      events.push({
        id: `${agreement.agreement_id}-payee-signed`,
        type: 'contract_signed',
        title: 'Payee signed',
        description: `${agreement.payee_address?.slice(0, 6) ?? 'Payee'}...${agreement.payee_address?.slice(-4) ?? ''} signed the agreement`,
        timestamp: agreement.updated_at,
      })
    }
  }

  // 3. Escrow funded
  const postFundingStatuses = ['funded', 'active', 'completed', 'disputed']
  if (postFundingStatuses.includes(status)) {
    events.push({
      id: `${agreement.agreement_id}-funded`,
      type: 'escrow_funded',
      title: 'Escrow funded',
      description: `$${agreement.total_amount.toLocaleString()} deposited into escrow`,
      timestamp: agreement.updated_at,
      metadata: { amount: agreement.total_amount },
    })
  }

  // 4. Milestone events — derive from each milestone's state
  for (const milestone of agreement.milestones) {
    deriveMilestoneEvents(agreement.agreement_id, milestone, events)
  }

  // 5. Contract completed
  if (status === 'completed') {
    events.push({
      id: `${agreement.agreement_id}-completed`,
      type: 'payment_released',
      title: 'Contract completed',
      description: `All milestones verified and payments released`,
      timestamp: agreement.updated_at,
    })
  }

  // Sort by timestamp descending (most recent first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return events
}

function deriveMilestoneEvents(
  agreementId: string,
  milestone: Milestone,
  events: DerivedActivityItem[],
): void {
  const state = milestone.state

  // Submitted
  const postSubmissionStates = ['submitted', 'verifying', 'approved', 'rejected', 'released']
  if (postSubmissionStates.includes(state)) {
    events.push({
      id: `${agreementId}-ms-${milestone.id}-submitted`,
      type: 'milestone_submitted',
      title: `Deliverable submitted for "${milestone.title}"`,
      description: `Attempt ${milestone.current_attempt ?? 1} submitted for review`,
      timestamp: milestone.updated_at,
      metadata: { milestoneId: milestone.id, milestoneIndex: milestone.index },
    })
  }

  // AI verified
  const postVerificationStates = ['approved', 'rejected', 'released']
  if (postVerificationStates.includes(state)) {
    const passed = state !== 'rejected'
    events.push({
      id: `${agreementId}-ms-${milestone.id}-verified`,
      type: 'milestone_verified',
      title: `AI verified "${milestone.title}"`,
      description: passed
        ? `Milestone passed AI verification`
        : `Milestone did not pass AI verification`,
      timestamp: milestone.updated_at,
      metadata: { milestoneId: milestone.id, passed },
    })
  }

  // Payment released
  if (state === 'released') {
    events.push({
      id: `${agreementId}-ms-${milestone.id}-released`,
      type: 'payment_released',
      title: `Payment released for "${milestone.title}"`,
      description: `$${milestone.amount.toLocaleString()} released to payee`,
      timestamp: milestone.updated_at,
      metadata: { milestoneId: milestone.id, amount: milestone.amount },
    })
  }
}

/**
 * Hook that fetches a single agreement and derives activity events.
 */
export function useContractActivities(contractId: string) {
  const [activities, setActivities] = useState<DerivedActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const agreement = await getAgreement(contractId)
      setActivities(deriveActivities(agreement))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  return { activities, isLoading, error, refetch: fetchActivities }
}
