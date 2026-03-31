'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Target, DollarSign, AlertCircle } from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { useContractStore } from '@/lib/contract-store'
import type { MilestoneData } from '@bu/contracts/contract-flow'

interface MilestoneNodeData extends MilestoneData {
  label: string
}

export const MilestoneNode = memo(function MilestoneNode({
  data,
  selected,
  id,
}: NodeProps & { data: MilestoneNodeData }) {
  const invalidNodeIds = useContractStore((state) => state.invalidNodeIds)
  const isInvalid = invalidNodeIds.includes(id)

  const formattedAmount = data.amount > 0
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(data.amount)
    : null

  return (
    <div
      className={cn(
        'relative min-w-[200px] max-w-[280px] rounded-xl border-2 bg-card shadow-lg transition-all duration-200',
        isInvalid
          ? 'border-rojo hover:border-rose-400 animate-pulse'
          : 'border-violet-300 hover:border-violeta',
        selected && !isInvalid && 'ring-2 ring-violet-300 ring-offset-2 ring-offset-background',
        selected && isInvalid && 'ring-2 ring-rose-300 ring-offset-2 ring-offset-background'
      )}
    >
      {/* Validation indicator */}
      {isInvalid && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rojo flex items-center justify-center z-10">
          <AlertCircle className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-t-[10px]',
        isInvalid ? 'bg-rose-50 dark:bg-rose-950' : 'bg-violet-100 dark:bg-violet-900'
      )}>
        <div className={cn(
          'flex items-center justify-center w-6 h-6 rounded-md',
          isInvalid ? 'bg-rose-100 dark:bg-rose-900 text-rojo' : 'bg-violet-100 dark:bg-violet-900 text-purpura dark:text-violeta'
        )}>
          <Target className="w-3.5 h-3.5" />
        </div>
        <span className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          isInvalid ? 'text-rojo' : 'text-purpura dark:text-violeta'
        )}>
          Milestone
        </span>
        {formattedAmount && (
          <span className={cn(
            'ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
            isInvalid
              ? 'bg-rose-100 dark:bg-rose-900 text-rojo'
              : 'bg-violet-100 dark:bg-violet-900 text-purpura dark:text-lila'
          )}>
            <DollarSign className="w-3 h-3" />
            {formattedAmount.replace('$', '')}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        <h3 className="text-sm font-medium text-foreground truncate">
          {data.title || data.label}
        </h3>
        {data.description ? (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
            {data.description}
          </p>
        ) : (
          <p className="text-xs text-rojo mt-1">
            Description required
          </p>
        )}
        {data.verificationCriteria ? (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground/80 line-clamp-1">
              <span className="text-purpura dark:text-violet-300 font-medium">Verify:</span> {data.verificationCriteria}
            </p>
          </div>
        ) : (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-xs text-rose-400">
              Verification criteria required
            </p>
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          '!w-3 !h-3 !border-2',
          isInvalid
            ? '!bg-rojo !border-rose-300'
            : '!bg-violeta !border-lila'
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          '!w-3 !h-3 !border-2',
          isInvalid
            ? '!bg-rojo !border-rose-300'
            : '!bg-violeta !border-lila'
        )}
      />
    </div>
  )
})
