'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { TribunalDecision, TribunalJudgeVerdict } from '@/types/arbitration'

interface TribunalPanelProps {
  decision: TribunalDecision
  className?: string
}

const verdictLabel = { APPROVE: 'Approve', DENY: 'Deny', PARTIAL: 'Partial' }

function JudgeRow({ v, isDissenter }: { v: TribunalJudgeVerdict; isDissenter: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={cn('py-3', isDissenter && 'opacity-60')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Judge {v.judgeIndex}</span>
          <span className="text-xs text-muted-foreground">{v.model.provider}</span>
          {isDissenter && <span className="text-xs text-muted-foreground">(dissent)</span>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {verdictLabel[v.verdict]}{v.verdict === 'PARTIAL' ? ` ${v.paymentPct}%` : ''}
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
          {v.reasoning.criteriaAnalysis.map(c => (
            <p key={c.criterionId}><span className={c.met ? 'text-foreground' : ''}>{c.met ? '+' : '-'}</span> {c.reasoning}</p>
          ))}
          <p className="font-mono">{v.hash.slice(0, 20)}...</p>
        </div>
      )}
    </div>
  )
}

export function TribunalPanel({ decision, className }: TribunalPanelProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Aggregate */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-xs">{decision.direction} ({decision.vote})</Badge>
        {decision.direction === 'APPROVE' && decision.paymentPct < 100 && (
          <span className="text-xs text-muted-foreground">{decision.paymentPct}% payment</span>
        )}
        {decision.appealable && (
          <span className="text-xs text-muted-foreground">Appealable (2-1)</span>
        )}
      </div>

      {/* Judges */}
      <div className="divide-y divide-border">
        {decision.verdicts.map(v => (
          <JudgeRow key={v.verdictId} v={v} isDissenter={decision.dissenter === v.judgeIndex} />
        ))}
      </div>
    </div>
  )
}
