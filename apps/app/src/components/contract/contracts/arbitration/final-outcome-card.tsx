'use client'

import { Badge } from '@bu/ui/badge'
import { cn } from '@bu/ui/cn'
import type { DisputeRecord } from '@/types/arbitration'

interface FinalOutcomeCardProps {
  dispute: DisputeRecord
  className?: string
}

export function FinalOutcomeCard({ dispute, className }: FinalOutcomeCardProps) {
  if (!dispute.finalVerdict || dispute.phase !== 'final') return null

  const pct = dispute.finalPaymentPct ?? 0
  const providerAmt = (dispute.disputedAmount * pct) / 100
  const clientAmt = dispute.disputedAmount - providerAmt

  const label = dispute.finalVerdict === 'APPROVE' ? 'Full Release' : dispute.finalVerdict === 'DENY' ? 'Full Refund' : `Split ${pct}%`
  const hadAppeal = !!dispute.supremeCourtDecision

  return (
    <div className={cn('rounded-xl border border-border bg-card p-5 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-foreground">Final Verdict</h2>
        <Badge variant="outline" className="text-xs">{label}</Badge>
      </div>

      <div className="flex items-baseline gap-8">
        <div>
          <span className="text-2xl font-semibold tabular-nums text-foreground">${providerAmt.toLocaleString()}</span>
          <span className="ml-1.5 text-sm text-muted-foreground">to provider</span>
        </div>
        <div>
          <span className="text-2xl font-semibold tabular-nums text-foreground">${clientAmt.toLocaleString()}</span>
          <span className="ml-1.5 text-sm text-muted-foreground">refunded</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Resolved {dispute.resolvedAt ? new Date(dispute.resolvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
        {hadAppeal
          ? ` via Supreme Court (${dispute.supremeCourtDecision?.vote})`
          : ` via Tribunal (${dispute.tribunalDecision?.vote})`
        }.
        {' '}{dispute.auditTrail.length} documents on-chain.
      </p>
    </div>
  )
}
