'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FileText, Sparkles, AlertCircle } from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { useContractStore } from '@/lib/contract-store'
import type { ClauseData } from '@bu/contracts/contract-flow'

interface ClauseNodeData extends ClauseData {
  label: string
}

export const ClauseNode = memo(function ClauseNode({
  data,
  selected,
  id,
}: NodeProps & { data: ClauseNodeData }) {
  const invalidNodeIds = useContractStore((state) => state.invalidNodeIds)
  const isInvalid = invalidNodeIds.includes(id)

  return (
    <div
      className={cn(
        'relative min-w-[180px] max-w-[280px] rounded-xl border-2 bg-card shadow-lg transition-all duration-200',
        isInvalid
          ? 'border-rojo hover:border-rose-400 animate-pulse'
          : 'border-violet-200 hover:border-lila',
        selected && !isInvalid && 'ring-2 ring-violet-200 ring-offset-2 ring-offset-background',
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
        isInvalid ? 'bg-rose-50 dark:bg-rose-950' : 'bg-violet-50 dark:bg-violet-950'
      )}>
        <div className={cn(
          'flex items-center justify-center w-6 h-6 rounded-md',
          isInvalid ? 'bg-rose-100 dark:bg-rose-900 text-rojo' : 'bg-violet-100 dark:bg-violet-900 text-purpura dark:text-lila'
        )}>
          <FileText className="w-3.5 h-3.5" />
        </div>
        <span className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          isInvalid ? 'text-rojo' : 'text-purpura dark:text-lila'
        )}>
          Clause
        </span>
        {data.aiGenerated && (
          <span className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-violet-100 to-violet-200 dark:from-violet-900 dark:to-violet-800 text-purpura dark:text-violeta text-xs">
            <Sparkles className="w-2.5 h-2.5" />
            AI
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        <h3 className="text-sm font-medium text-foreground truncate">
          {data.title || data.label}
        </h3>
        {data.content ? (
          <p className="text-xs text-muted-foreground line-clamp-3 mt-1 leading-relaxed">
            {data.content}
          </p>
        ) : data.aiPrompt ? (
          <p className="text-xs text-purpura dark:text-violet-300 line-clamp-2 mt-1 italic">
            AI: "{data.aiPrompt}"
          </p>
        ) : (
          <p className="text-xs text-rojo mt-1">
            Content required
          </p>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          '!w-3 !h-3 !border-2',
          isInvalid ? '!bg-rojo !border-rose-300' : '!bg-lila !border-violet-100'
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          '!w-3 !h-3 !border-2',
          isInvalid ? '!bg-rojo !border-rose-300' : '!bg-lila !border-violet-100'
        )}
      />
    </div>
  )
})
