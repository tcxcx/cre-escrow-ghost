'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { GitBranch, AlertCircle } from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { useContractStore } from '@/lib/contract-store'
import type { ConditionData } from '@bu/contracts/contract-flow'

interface ConditionNodeData extends ConditionData {
  label: string
}

export const ConditionNode = memo(function ConditionNode({
  data,
  selected,
  id,
}: NodeProps & { data: ConditionNodeData }) {
  const invalidNodeIds = useContractStore((state) => state.invalidNodeIds)
  const isInvalid = invalidNodeIds.includes(id)

  return (
    <div
      className={cn(
        'relative min-w-[180px] max-w-[240px] rounded-xl border-2 bg-card shadow-lg transition-all duration-200',
        isInvalid
          ? 'border-rojo hover:border-rose-400 animate-pulse'
          : 'border-amber-200 hover:border-amarillo',
        selected && !isInvalid && 'ring-2 ring-amber-200 ring-offset-2 ring-offset-background',
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
        isInvalid ? 'bg-rose-50 dark:bg-rose-950' : 'bg-amber-50 dark:bg-amber-950'
      )}>
        <div className={cn(
          'flex items-center justify-center w-6 h-6 rounded-md',
          isInvalid ? 'bg-rose-100 dark:bg-rose-900 text-rojo' : 'bg-amber-100 dark:bg-amber-900 text-amarillo dark:text-amarillo'
        )}>
          <GitBranch className="w-3.5 h-3.5" />
        </div>
        <span className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          isInvalid ? 'text-rojo' : 'text-amarillo dark:text-amarillo'
        )}>
          {data.type === 'if-else' ? 'Condition' : data.type === 'approval' ? 'Approval' : 'Timer'}
        </span>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        <h3 className="text-sm font-medium text-foreground line-clamp-2">
          {data.label}
        </h3>
        {data.condition ? (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 italic">
            "{data.condition}"
          </p>
        ) : (
          <p className="text-xs text-rojo mt-1">
            Condition required
          </p>
        )}
      </div>

      {/* Branch Labels */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2 rounded-b-[10px] border-t',
        isInvalid ? 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800' : 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'
      )}>
        <span className="text-xs text-vverde font-medium">{data.trueLabel}</span>
        <span className="text-xs text-rojo font-medium">{data.falseLabel}</span>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          '!w-3 !h-3 !border-2',
          isInvalid ? '!bg-rojo !border-rose-300' : '!bg-amarillo !border-agnusDei'
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '40%' }}
        className="!w-3 !h-3 !bg-vverde !border-2 !border-emerald-200"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '70%' }}
        className="!w-3 !h-3 !bg-rojo !border-2 !border-rose-300"
      />
    </div>
  )
})
