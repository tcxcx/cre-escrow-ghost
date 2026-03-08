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
          ? 'border-[#FF507A] hover:border-[#FF507A]/80 animate-pulse' 
          : 'border-[#C4A1FF]/50 hover:border-[#C4A1FF]',
        selected && !isInvalid && 'ring-2 ring-[#C4A1FF]/50 ring-offset-2 ring-offset-background',
        selected && isInvalid && 'ring-2 ring-[#FF507A]/50 ring-offset-2 ring-offset-background'
      )}
    >
      {/* Validation indicator */}
      {isInvalid && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#FF507A] flex items-center justify-center z-10">
          <AlertCircle className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-t-[10px]',
        isInvalid ? 'bg-[#FF507A]/10' : 'bg-[#C4A1FF]/10'
      )}>
        <div className={cn(
          'flex items-center justify-center w-6 h-6 rounded-md',
          isInvalid ? 'bg-[#FF507A]/20 text-[#FF507A]' : 'bg-[#C4A1FF]/20 text-[#6854CF] dark:text-[#C4A1FF]'
        )}>
          <Target className="w-3.5 h-3.5" />
        </div>
        <span className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          isInvalid ? 'text-[#FF507A]' : 'text-[#6854CF] dark:text-[#C4A1FF]'
        )}>
          Milestone
        </span>
        {formattedAmount && (
          <span className={cn(
            'ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
            isInvalid 
              ? 'bg-[#FF507A]/20 text-[#FF507A]' 
              : 'bg-[#C4A1FF]/20 text-[#6854CF] dark:text-[#E2D0FC]'
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
          <p className="text-xs text-[#FF507A] mt-1">
            Description required
          </p>
        )}
        {data.verificationCriteria ? (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground/80 line-clamp-1">
              <span className="text-[#6854CF] dark:text-[#C4A1FF]/80 font-medium">Verify:</span> {data.verificationCriteria}
            </p>
          </div>
        ) : (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-xs text-[#FF507A]/80">
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
            ? '!bg-[#FF507A] !border-[#FF507A]/50' 
            : '!bg-[#C4A1FF] !border-[#E2D0FC]'
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          '!w-3 !h-3 !border-2',
          isInvalid 
            ? '!bg-[#FF507A] !border-[#FF507A]/50' 
            : '!bg-[#C4A1FF] !border-[#E2D0FC]'
        )}
      />
    </div>
  )
})
