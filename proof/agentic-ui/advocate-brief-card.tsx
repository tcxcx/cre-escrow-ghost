'use client'

import { useState } from 'react'
import { Badge } from '@bu/ui/badge'
import { cn } from '@bu/ui/cn'
import type { AdvocateBrief } from '@/types/arbitration'

interface AdvocateBriefCardProps {
  brief: AdvocateBrief
  partyName: string
  className?: string
}

const verdictLabel = { APPROVE: 'Release', DENY: 'Refund', PARTIAL: 'Partial' }

export function AdvocateBriefCard({ brief, partyName, className }: AdvocateBriefCardProps) {
  const [showArgs, setShowArgs] = useState(false)
  const isProvider = brief.advocateRole === 'pro_provider'

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{isProvider ? 'Provider' : 'Client'} Advocate</p>
          <p className="text-xs text-muted-foreground">{brief.model.provider}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {verdictLabel[brief.recommendedVerdict]}
          {brief.recommendedVerdict === 'PARTIAL' && ` ${brief.recommendedAmountPct}%`}
        </Badge>
      </div>

      {/* Position */}
      <p className="text-sm text-foreground leading-relaxed">{brief.positionSummary}</p>

      {/* Arguments (collapsed by default) */}
      <button
        type="button"
        onClick={() => setShowArgs(!showArgs)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showArgs ? 'Hide' : 'Show'} {brief.keyArguments.length} arguments
      </button>

      {showArgs && (
        <div className="space-y-2">
          {brief.keyArguments.map((arg, i) => (
            <div key={i} className="text-sm">
              <span className="text-xs text-muted-foreground mr-2">{arg.strength}</span>
              <span className="text-foreground">{arg.argument}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground font-mono">{brief.hash.slice(0, 16)}...</p>
    </div>
  )
}
