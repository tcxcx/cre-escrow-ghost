'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FileText, Sparkles, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useContractStore } from '@/lib/contract-store'
import type { ClauseData } from '@repo/contract-flow'

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
          ? 'border-[#FF507A] hover:border-[#FF507A]/80 animate-pulse' 
          : 'border-[#E2D0FC]/50 hover:border-[#E2D0FC]',
        selected && !isInvalid && 'ring-2 ring-[#E2D0FC]/50 ring-offset-2 ring-offset-background',
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
        isInvalid ? 'bg-[#FF507A]/10' : 'bg-[#E2D0FC]/10'
      )}>
        <div className={cn(
          'flex items-center justify-center w-6 h-6 rounded-md',
          isInvalid ? 'bg-[#FF507A]/20 text-[#FF507A]' : 'bg-[#E2D0FC]/20 text-[#6854CF] dark:text-[#E2D0FC]'
        )}>
          <FileText className="w-3.5 h-3.5" />
        </div>
        <span className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          isInvalid ? 'text-[#FF507A]' : 'text-[#6854CF] dark:text-[#E2D0FC]'
        )}>
          Clause
        </span>
        {data.aiGenerated && (
          <span className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#6854CF]/20 to-[#C4A1FF]/20 text-[#6854CF] dark:text-[#C4A1FF] text-xs">
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
          <p className="text-xs text-[#6854CF] dark:text-[#C4A1FF]/80 line-clamp-2 mt-1 italic">
            AI: "{data.aiPrompt}"
          </p>
        ) : (
          <p className="text-xs text-[#FF507A] mt-1">
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
          isInvalid ? '!bg-[#FF507A] !border-[#FF507A]/50' : '!bg-[#E2D0FC] !border-[#f0e6fe]'
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          '!w-3 !h-3 !border-2',
          isInvalid ? '!bg-[#FF507A] !border-[#FF507A]/50' : '!bg-[#E2D0FC] !border-[#f0e6fe]'
        )}
      />
    </div>
  )
})
