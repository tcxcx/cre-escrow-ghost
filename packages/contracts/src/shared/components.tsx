/**
 * @package shared/components
 * Reusable UI atoms that were duplicated across views.
 * ContractStatusBadge was defined inline in contracts-widget.tsx
 * and manually reconstructed in 6+ other files.
 */

'use client'

import { Badge } from './ui/badge'
import { cn } from './lib/utils'
import {
  contractStatusConfig,
  milestoneStatusConfig,
  disputeStatusConfig,
  getStatusEntry,
  type StatusEntry,
} from './status'

// ──────────────────────────────────────────
// ContractStatusBadge
// ──────────────────────────────────────────

interface ContractStatusBadgeProps {
  status: string
  className?: string
  size?: 'sm' | 'default'
}

export function ContractStatusBadge({ status, className, size = 'default' }: ContractStatusBadgeProps) {
  const entry = getStatusEntry(contractStatusConfig, status)
  return (
    <Badge
      variant="outline"
      className={cn(
        size === 'sm' ? 'text-[10px] h-5 px-1.5' : 'text-xs',
        entry.bgColor,
        className,
      )}
    >
      {entry.label}
    </Badge>
  )
}

// ──────────────────────────────────────────
// MilestoneStatusBadge
// ──────────────────────────────────────────

interface MilestoneStatusBadgeProps {
  status: string
  className?: string
}

export function MilestoneStatusBadge({ status, className }: MilestoneStatusBadgeProps) {
  const entry = getStatusEntry(milestoneStatusConfig, status)
  return (
    <Badge variant="outline" className={cn('text-[10px]', entry.bgColor, className)}>
      {entry.label}
    </Badge>
  )
}

// ──────────────────────────────────────────
// DisputeStatusBadge
// ──────────────────────────────────────────

interface DisputeStatusBadgeProps {
  status: string
  className?: string
}

export function DisputeStatusBadge({ status, className }: DisputeStatusBadgeProps) {
  const entry = getStatusEntry(disputeStatusConfig, status)
  return (
    <Badge variant="outline" className={cn('text-xs', entry.bgColor, className)}>
      {entry.label}
    </Badge>
  )
}

// ──────────────────────────────────────────
// Generic StatusDot (for inline indicators)
// ──────────────────────────────────────────

interface StatusDotProps {
  status: string
  config: Record<string, StatusEntry>
  className?: string
}

export function StatusDot({ status, config, className }: StatusDotProps) {
  const entry = getStatusEntry(config, status)
  return (
    <span className={cn('inline-block w-2 h-2 rounded-full', entry.color.replace('text-', 'bg-'), className)} />
  )
}
