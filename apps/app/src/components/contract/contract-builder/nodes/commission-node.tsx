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
          ? 'border-[#FF507A] hover:border-[#FF507A]/80 animate-pulse' 
          : 'border-[#FEADEC]/50 hover:border-[#FEADEC]',
        selected && !isInvalid && 'ring-2 ring-[#FEADEC]/50 ring-offset-2 ring-offset-background',
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
        isInvalid ? 'bg-[#FF507A]/10' : 'bg-[#FEADEC]/10'
      )}>
        <div className={cn(
          'flex items-center justify-center w-6 h-6 rounded-md',
          isInvalid ? 'bg-[#FF507A]/20 text-[#FF507A]' : 'bg-[#FEADEC]/20 text-[#e07bc7] dark:text-[#FEADEC]'
        )}>
          <Percent className="w-3.5 h-3.5" />
        </div>
        <span className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          isInvalid ? 'text-[#FF507A]' : 'text-[#e07bc7] dark:text-[#FEADEC]'
        )}>
          Commission
        </span>
        <span className={cn(
          'ml-auto px-2 py-0.5 rounded-full text-xs font-bold',
          isInvalid ? 'bg-[#FF507A]/20 text-[#FF507A]' : 'bg-[#FEADEC]/20 text-[#e07bc7] dark:text-[#FEADEC]'
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
          <p className="text-xs text-[#FF507A] mt-0.5">Name required</p>
        )}
        {data.recipientAddress ? (
          <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
            {data.recipientAddress.slice(0, 8)}...{data.recipientAddress.slice(-6)}
          </p>
        ) : (
          <p className="text-xs text-[#FF507A]/70 mt-0.5">Address required</p>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          '!w-3 !h-3 !border-2',
          isInvalid ? '!bg-[#FF507A] !border-[#FF507A]/50' : '!bg-[#FEADEC] !border-[#ffd6f4]'
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          '!w-3 !h-3 !border-2',
          isInvalid ? '!bg-[#FF507A] !border-[#FF507A]/50' : '!bg-[#FEADEC] !border-[#ffd6f4]'
        )}
      />
    </div>
  )
})
