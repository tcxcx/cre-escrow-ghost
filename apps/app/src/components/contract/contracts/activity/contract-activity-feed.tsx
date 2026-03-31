'use client'

import React from 'react'
import { ActivityFeed } from './activity-feed'
import { ActivityFeedSkeleton } from '../skeletons'
import { useContractActivities } from './use-contract-activities'

interface ContractActivityFeedProps {
  contractId: string
}

/**
 * Wired activity feed that fetches contract data and derives lifecycle events.
 *
 * Events are derived from the agreement and milestone states since there is no
 * dedicated activities table yet:
 *   - Contract creation date -> "Contract created"
 *   - Signatures -> "Payer/Payee signed"
 *   - Funding -> "Escrow funded"
 *   - Milestone submissions -> "Deliverable submitted for [milestone]"
 *   - AI verifications -> "AI verified [milestone]"
 *   - Disputes -> "Dispute filed"
 *   - Completion -> "Contract completed"
 */
export function ContractActivityFeed({ contractId }: ContractActivityFeedProps) {
  const { activities, isLoading, error } = useContractActivities(contractId)

  if (isLoading) {
    return <ActivityFeedSkeleton count={4} />
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load activity: {error}
      </div>
    )
  }

  return <ActivityFeed activities={activities} />
}
