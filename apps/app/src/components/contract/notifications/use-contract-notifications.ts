'use client'

import { useEffect, useState, useCallback } from 'react'
import { listAgreements } from '@/lib/api/client'
import type { AgreementSummary } from '@/lib/api/client'
import { getContractDestination } from '@bu/contracts/shared'
import type { NotificationType } from './notifications-panel'

export interface DerivedNotification {
  id: string
  type: NotificationType
  title: string
  description: string
  contractName?: string
  timestamp: string
  read: boolean
  actionUrl?: string
}

/**
 * Derive pending-action notifications from the list of agreements.
 * Each notification links to the page where the user can take action.
 */
function deriveNotifications(agreements: AgreementSummary[]): DerivedNotification[] {
  const notifications: DerivedNotification[] = []

  for (const agreement of agreements) {
    const status = agreement.status

    // Unsigned contracts -> needs signature
    if (status === 'pending-signatures' || status === 'pending_signatures') {
      notifications.push({
        id: `${agreement.agreement_id}-needs-signature`,
        type: 'contract_received',
        title: 'Signature required',
        description: `"${agreement.title}" is awaiting signatures`,
        contractName: agreement.title,
        timestamp: formatRelativeTime(agreement.updated_at),
        read: false,
        actionUrl: getContractDestination(agreement.agreement_id, status),
      })
    }

    // Unfunded contracts -> needs funding
    if (status === 'pending-funding') {
      notifications.push({
        id: `${agreement.agreement_id}-needs-funding`,
        type: 'payment_released',
        title: 'Funding required',
        description: `"${agreement.title}" is signed but awaiting escrow funding`,
        contractName: agreement.title,
        timestamp: formatRelativeTime(agreement.updated_at),
        read: false,
        actionUrl: getContractDestination(agreement.agreement_id, status),
      })
    }

    // Active contracts with milestones awaiting submission
    if (status === 'active' || status === 'funded') {
      const pendingMilestones = agreement.milestones?.filter(
        (m) => m.state === 'pending' || m.state === 'in_progress'
      ) ?? []

      if (pendingMilestones.length > 0) {
        notifications.push({
          id: `${agreement.agreement_id}-milestones-pending`,
          type: 'milestone_verified',
          title: `${pendingMilestones.length} milestone${pendingMilestones.length > 1 ? 's' : ''} awaiting submission`,
          description: `"${agreement.title}" has deliverables ready to submit`,
          contractName: agreement.title,
          timestamp: formatRelativeTime(agreement.updated_at),
          read: false,
          actionUrl: getContractDestination(agreement.agreement_id, status),
        })
      }
    }

    // Disputed contracts -> action needed
    if (status === 'disputed') {
      notifications.push({
        id: `${agreement.agreement_id}-disputed`,
        type: 'dispute_opened',
        title: 'Dispute filed',
        description: `A dispute has been opened on "${agreement.title}"`,
        contractName: agreement.title,
        timestamp: formatRelativeTime(agreement.updated_at),
        read: false,
        actionUrl: getContractDestination(agreement.agreement_id, status),
      })
    }
  }

  // Sort by most recent first
  notifications.sort((a, b) => {
    // Find the original agreement to get raw timestamps for sorting
    const aAgreement = agreements.find(
      (ag) => a.id.startsWith(ag.agreement_id)
    )
    const bAgreement = agreements.find(
      (ag) => b.id.startsWith(ag.agreement_id)
    )
    const aTime = aAgreement ? new Date(aAgreement.updated_at).getTime() : 0
    const bTime = bAgreement ? new Date(bAgreement.updated_at).getTime() : 0
    return bTime - aTime
  })

  return notifications
}

function formatRelativeTime(isoDate: string): string {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Hook that fetches all agreements and derives actionable notifications.
 */
export function useContractNotifications() {
  const [notifications, setNotifications] = useState<DerivedNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { agreements } = await listAgreements()
      setNotifications(deriveNotifications(agreements))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return {
    notifications,
    isLoading,
    error,
    markRead,
    markAllRead,
    dismiss,
    refetch: fetchNotifications,
  }
}
