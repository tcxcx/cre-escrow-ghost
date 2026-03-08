/**
 * @package shared/status
 * Centralized status configuration maps.
 * Eliminates 5+ duplicate statusConfig objects across
 * contracts-list, home-dashboard, dispute-view, escrow-transaction-history, submission-timeline.
 */

// ──────────────────────────────────────────
// Contract Status
// ──────────────────────────────────────────

export interface StatusEntry {
  label: string
  color: string      // Tailwind class string
  bgColor: string    // For badge backgrounds
  icon?: string      // Lucide icon name
}

export const contractStatusConfig: Record<string, StatusEntry> = {
  draft: {
    label: 'Draft',
    color: 'text-zinc-500',
    bgColor: 'bg-zinc-500/10 text-zinc-500',
    icon: 'FileEdit',
  },
  'pending-signatures': {
    label: 'Pending Signatures',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 text-amber-500',
    icon: 'PenLine',
  },
  pending_signatures: {
    label: 'Pending Signatures',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 text-amber-500',
    icon: 'PenLine',
  },
  'pending-funding': {
    label: 'Pending Funding',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 text-blue-500',
    icon: 'Wallet',
  },
  funded: {
    label: 'Funded',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10 text-emerald-500',
    icon: 'CheckCircle2',
  },
  active: {
    label: 'Active',
    color: 'text-primary',
    bgColor: 'bg-primary/10 text-primary',
    icon: 'Play',
  },
  completed: {
    label: 'Completed',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10 text-cyan-500',
    icon: 'CheckCircle2',
  },
  disputed: {
    label: 'Disputed',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10 text-destructive',
    icon: 'AlertTriangle',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-400/10 text-zinc-400',
    icon: 'XCircle',
  },
}

// ──────────────────────────────────────────
// Milestone Status
// ──────────────────────────────────────────

export const milestoneStatusConfig: Record<string, StatusEntry> = {
  pending: {
    label: 'Pending',
    color: 'text-zinc-500',
    bgColor: 'bg-zinc-500/10 text-zinc-500',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 text-blue-500',
  },
  submitted: {
    label: 'Submitted',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 text-amber-500',
  },
  verifying: {
    label: 'Verifying',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 text-purple-500',
  },
  approved: {
    label: 'Approved',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10 text-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10 text-destructive',
  },
  released: {
    label: 'Released',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10 text-cyan-500',
  },
}

// ──────────────────────────────────────────
// Transaction Status (escrow)
// ──────────────────────────────────────────

export const transactionStatusConfig: Record<string, StatusEntry> = {
  confirmed: {
    label: 'Confirmed',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10 text-emerald-500',
  },
  pending: {
    label: 'Pending',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 text-amber-500',
  },
  failed: {
    label: 'Failed',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10 text-destructive',
  },
}

// ──────────────────────────────────────────
// Dispute / Arbitration Status
// ──────────────────────────────────────────

export const disputeStatusConfig: Record<string, StatusEntry> = {
  filed: {
    label: 'Filed',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 text-amber-500',
    icon: 'FileWarning',
  },
  under_review: {
    label: 'Under Review',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 text-blue-500',
    icon: 'Search',
  },
  advocate_briefs: {
    label: 'Advocate Briefs',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 text-purple-500',
    icon: 'Scale',
  },
  tribunal: {
    label: 'Tribunal',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 text-orange-500',
    icon: 'Gavel',
  },
  appealed: {
    label: 'Appealed',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10 text-red-500',
    icon: 'AlertOctagon',
  },
  resolved: {
    label: 'Resolved',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10 text-emerald-500',
    icon: 'CheckCircle2',
  },
}

// ──────────────────────────────────────────
// Submission Status (verification timeline)
// ──────────────────────────────────────────

export const submissionStatusConfig: Record<string, StatusEntry> = {
  submitted: {
    label: 'Submitted',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 text-blue-500',
  },
  passed: {
    label: 'Passed',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10 text-emerald-500',
  },
  failed: {
    label: 'Failed',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10 text-destructive',
  },
  pending: {
    label: 'Pending Review',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 text-amber-500',
  },
}

/**
 * Generic helper: get a status entry from any config map, with a fallback.
 */
export function getStatusEntry(
  config: Record<string, StatusEntry>,
  status: string
): StatusEntry {
  return config[status] ?? {
    label: status.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    color: 'text-muted-foreground',
    bgColor: 'bg-muted text-muted-foreground',
  }
}
