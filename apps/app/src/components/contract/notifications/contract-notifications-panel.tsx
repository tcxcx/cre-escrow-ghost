'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { NotificationsPanel } from './notifications-panel'
import { useContractNotifications } from './use-contract-notifications'

/**
 * Wired notifications panel that fetches all contracts and derives
 * pending action notifications:
 *   - Unsigned contracts needing signatures
 *   - Unfunded contracts needing escrow deposits
 *   - Active contracts with milestones awaiting submission
 *   - Disputed contracts requiring attention
 *
 * Each notification links to the relevant contract page.
 */
export function ContractNotificationsPanel() {
  const router = useRouter()
  const {
    notifications,
    markRead,
    markAllRead,
    dismiss,
  } = useContractNotifications()

  const handleMarkRead = (id: string) => {
    const notification = notifications.find((n) => n.id === id)
    markRead(id)
    // Navigate to the action URL when clicking a notification
    if (notification?.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  return (
    <NotificationsPanel
      notifications={notifications}
      onMarkAllRead={markAllRead}
      onMarkRead={handleMarkRead}
      onDismiss={dismiss}
    />
  )
}
