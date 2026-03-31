'use client'

import { useState } from 'react'
import { Badge } from '@bu/ui/badge'
import { cn } from '@bu/ui/cn'
import type { SupremeCourtDecision, SupremeCourtJudgeVerdict } from '@/types/arbitration'

interface SupremeCourtPanelProps {
  decision: SupremeCourtDecision
  tribunalDirection: string
  className?: string
}

const verdictLabel = { APPROVE: 'Approve', DENY: 'Deny', PARTIAL: 'Partial' }

function JusticeRow({ v }: { v: SupremeCourtJudgeVerdict }) {
  const [open, setOpen] = useState(false)
  const upholds = v.reasoning.upholdsTribunal
  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Justice {v.judgeIndex}</span>
          <span className="text-xs text-muted-foreground">{v.model.provider}</span>
          <span className={cn('text-xs', upholds ? 'text-muted-foreground' : 'text-foreground font-medium')}>{upholds ? 'upholds' : 'overturns'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {verdictLabel[v.verdict]}{(v.verdict === 'PARTIAL' || v.verdict === 'APPROVE') ? ` ${v.paymentPct}%` : ''}
          </Badge>
          <span className="text-xs tabular-nums text-muted-foreground">{v.confidence}%</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{v.reasoning.summary}</p>
      <button type="button" onClick={() => setOpen(!open)} className="text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors">
        {open ? 'Less' : 'Full reasoning'}
      </button>
      {open && (
        <div className="mt-2 space-y-2 text-xs text-muted-foreground">
          <p>Re majority: {v.reasoning.responseToTribunalMajority}</p>
          <p>Re dissent: {v.reasoning.responseToTribunalDissent}</p>
          <p className="font-mono">{v.hash.slice(0, 20)}...</p>
        </div>
      )}
    </div>
  )
}

export function SupremeCourtPanel({ decision, tribunalDirection, className }: SupremeCourtPanelProps) {
  const upholdCount = decision.verdicts.filter(v => v.reasoning.upholdsTribunal).length

  return (
    <div className={cn('space-y-2', className)}>
      {/* Aggregate */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-xs">{decision.overturned ? 'Overturned' : 'Upheld'} ({decision.vote})</Badge>
        {(decision.finalDirection === 'PARTIAL' || (decision.finalDirection === 'APPROVE' && decision.paymentPct < 100)) && (
          <span className="text-xs text-muted-foreground">{decision.paymentPct}% payment</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {upholdCount}/5 upheld the tribunal's {tribunalDirection.toLowerCase()} decision.
        {decision.overturned ? ' 4/5 threshold met -- decision overturned.' : ' Overturn threshold not met.'}
      </p>

      {/* Justices */}
      <div className="divide-y divide-border">
        {decision.verdicts.map(v => <JusticeRow key={v.verdictId} v={v} />)}
      </div>
    </div>
  )
}
