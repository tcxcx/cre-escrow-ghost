'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Percent, AlertCircle } from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { useContractStore } from '@/lib/contract-store'
import type { CommissionData } from '@bu/contracts/contract-flow'

interface CommissionNodeData extends CommissionData {
  label: string
}

export const CommissionNode = memo(function CommissionNode({
  data,
  selected,
  id,
}: NodeProps & { data: CommissionNodeData }) {
  const invalidNodeIds = useContractStore((state) => state.invalidNodeIds)
  const isInvalid = invalidNodeIds.includes(id)

  return (
    <div
      className={cn(
        'relative min-w-[160px] rounded-xl border-2 bg-card shadow-lg transition-all duration-200',
        isInvalid
          ? 'border-rojo hover:border-rose-400 animate-pulse'
          : 'border-pink-200 hover:border-belanova',
        selected && !isInvalid && 'ring-2 ring-pink-200 ring-offset-2 ring-offset-background',
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
        isInvalid ? 'bg-rose-50 dark:bg-rose-950' : 'bg-pink-50 dark:bg-pink-950'
      )}>
        <div className={cn(
          'flex items-center justify-center w-6 h-6 rounded-md',
          isInvalid ? 'bg-rose-100 dark:bg-rose-900 text-rojo' : 'bg-pink-100 dark:bg-pink-900 text-belanova dark:text-belanova'
        )}>
          <Percent className="w-3.5 h-3.5" />
        </div>
        <span className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          isInvalid ? 'text-rojo' : 'text-belanova dark:text-belanova'
        )}>
          Commission
        </span>
        <span className={cn(
          'ml-auto px-2 py-0.5 rounded-full text-xs font-bold',
          isInvalid ? 'bg-rose-100 dark:bg-rose-900 text-rojo' : 'bg-pink-100 dark:bg-pink-900 text-belanova dark:text-belanova'
        )}>
          {data.percentage}%
        </span>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        <h3 className="text-sm font-medium text-foreground truncate">
          {data.recipientName || data.label}
        </h3>
        {data.recipientName ? null : (
          <p className="text-xs text-rojo mt-0.5">Name required</p>
        )}
        {data.recipientAddress ? (
          <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
            {data.recipientAddress.slice(0, 8)}...{data.recipientAddress.slice(-6)}
          </p>
        ) : (
          <p className="text-xs text-rose-400 mt-0.5">Address required</p>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          '!w-3 !h-3 !border-2',
          isInvalid ? '!bg-rojo !border-rose-300' : '!bg-belanova !border-pink-200'
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          '!w-3 !h-3 !border-2',
          isInvalid ? '!bg-rojo !border-rose-300' : '!bg-belanova !border-pink-200'
        )}
      />
    </div>
  )
})
