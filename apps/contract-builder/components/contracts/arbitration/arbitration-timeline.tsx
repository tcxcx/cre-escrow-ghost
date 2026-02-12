'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import type { DisputePhase } from '@/types/arbitration'

interface ArbitrationTimelineProps {
  currentPhase: DisputePhase
  disputeWindowEnd?: string
  appealWindowEnd?: string
  tribunalUnanimous?: boolean
  className?: string
}

const layers = [
  { id: 'layer1', phases: ['dispute_window'] as DisputePhase[], label: 'L1', title: 'Verifier', desc: '1 model evaluates' },
  { id: 'layer2', phases: ['advocates'] as DisputePhase[], label: 'L2', title: 'Advocates', desc: '2 adversarial models' },
  { id: 'layer3', phases: ['tribunal', 'tribunal_decided', 'appeal_window'] as DisputePhase[], label: 'L3', title: 'Tribunal', desc: '3 judges, 3 providers' },
  { id: 'layer4', phases: ['supreme_court'] as DisputePhase[], label: 'L4', title: 'Supreme Court', desc: '5 judges, 5 providers' },
]

const phaseOrder: DisputePhase[] = ['dispute_window', 'advocates', 'tribunal', 'tribunal_decided', 'appeal_window', 'supreme_court', 'final']

function getStatus(layerPhases: DisputePhase[], current: DisputePhase, idx: number, unanimous?: boolean): 'done' | 'active' | 'pending' | 'skipped' {
  if (idx === 3 && unanimous && current === 'final') return 'skipped'
  for (const p of layerPhases) { if (p === current) return 'active' }
  const ci = phaseOrder.indexOf(current)
  const max = Math.max(...layerPhases.map(p => phaseOrder.indexOf(p)))
  return ci > max ? 'done' : 'pending'
}

function timeLeft(end?: string) {
  if (!end) return null
  const diff = new Date(end).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`
}

export function ArbitrationTimeline({ currentPhase, disputeWindowEnd, appealWindowEnd, tribunalUnanimous, className }: ArbitrationTimelineProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Progress</h3>
      {currentPhase === 'final' && (
        <Badge variant="outline" className="mb-3 text-xs">Resolved</Badge>
      )}
      {layers.map((layer, i) => {
        const status = getStatus(layer.phases, currentPhase, i, tribunalUnanimous)
        if (status === 'skipped') return (
          <div key={layer.id} className="flex items-center gap-3 py-2 opacity-40">
            <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] flex items-center justify-center font-mono line-through">{i + 1}</span>
            <span className="text-xs text-muted-foreground line-through">{layer.title} (skipped)</span>
          </div>
        )
        return (
          <div key={layer.id} className={cn('flex items-center gap-3 py-2', status === 'pending' && 'opacity-40')}>
            <span className={cn(
              'w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-mono shrink-0',
              status === 'done' ? 'bg-foreground text-background' : status === 'active' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}>
              {status === 'done' ? <Check className="w-3 h-3" /> : i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm', status === 'active' ? 'font-medium text-foreground' : 'text-muted-foreground')}>{layer.title}</p>
              <p className="text-xs text-muted-foreground">{layer.desc}</p>
            </div>
            {status === 'active' && i === 0 && disputeWindowEnd && (
              <span className="text-xs tabular-nums text-muted-foreground shrink-0">{timeLeft(disputeWindowEnd)}</span>
            )}
            {currentPhase === 'appeal_window' && i === 2 && appealWindowEnd && (
              <span className="text-xs tabular-nums text-muted-foreground shrink-0">{timeLeft(appealWindowEnd)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
