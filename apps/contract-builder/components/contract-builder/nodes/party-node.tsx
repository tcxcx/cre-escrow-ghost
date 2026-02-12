'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { User, Building2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useContractStore } from '@/lib/contract-store'
import type { PartyData } from '@repo/contract-flow'

interface PartyNodeData extends PartyData {
  label: string
}

export const PartyNode = memo(function PartyNode({ 
  data, 
  selected,
  type,
  id,
}: NodeProps & { data: PartyNodeData }) {
  const isPayer = type === 'party-payer' || data.role === 'payer'
  const invalidNodeIds = useContractStore((state) => state.invalidNodeIds)
  const isInvalid = invalidNodeIds.includes(id)
  
  return (
    <div
      className={cn(
        'relative min-w-[180px] rounded-xl border-2 bg-card shadow-lg transition-all duration-200',
        selected && 'ring-2 ring-offset-2 ring-offset-background',
        isInvalid && 'animate-pulse',
        isPayer 
          ? isInvalid 
            ? 'border-[#FF507A] hover:border-[#FF507A]/80' 
            : 'border-[#6854CF]/50 hover:border-[#6854CF] dark:border-[#AB8DFF]/50 dark:hover:border-[#AB8DFF]'
          : isInvalid
            ? 'border-[#FF507A] hover:border-[#FF507A]/80'
            : 'border-[#82e664]/50 hover:border-[#82e664]',
        selected && isPayer && !isInvalid && 'ring-[#6854CF]/50 dark:ring-[#AB8DFF]/50',
        selected && !isPayer && !isInvalid && 'ring-[#82e664]/50',
        selected && isInvalid && 'ring-[#FF507A]/50'
      )}
    >
      {/* Validation indicator */}
      {isInvalid && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#FF507A] flex items-center justify-center z-10">
          <AlertCircle className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Header */}
      <div 
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-t-[10px]',
          isInvalid 
            ? 'bg-[#FF507A]/10' 
            : isPayer ? 'bg-[#6854CF]/10 dark:bg-[#AB8DFF]/10' : 'bg-[#82e664]/10'
        )}
      >
        <div 
          className={cn(
            'flex items-center justify-center w-6 h-6 rounded-md',
            isInvalid
              ? 'bg-[#FF507A]/20 text-[#FF507A]'
              : isPayer ? 'bg-[#6854CF]/20 text-[#6854CF] dark:bg-[#AB8DFF]/20 dark:text-[#AB8DFF]' : 'bg-[#82e664]/20 text-[#5cb346] dark:text-[#82e664]'
          )}
        >
          {isPayer ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
        </div>
        <span 
          className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            isInvalid 
              ? 'text-[#FF507A]'
              : isPayer ? 'text-[#6854CF] dark:text-[#AB8DFF]' : 'text-[#5cb346] dark:text-[#82e664]'
          )}
        >
          {isPayer ? 'Payer' : 'Payee'}
        </span>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        <h3 className="text-sm font-medium text-foreground truncate">
          {data.label}
        </h3>
        {data.name ? (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {data.name}
          </p>
        ) : (
          <p className="text-xs text-[#FF507A] truncate mt-0.5">
            Name required
          </p>
        )}
        {data.email ? (
          <p className="text-xs text-muted-foreground/70 truncate">
            {data.email}
          </p>
        ) : (
          <p className="text-xs text-[#FF507A]/70 truncate">
            Email required
          </p>
        )}
      </div>

      {/* Handles - Both directions for proper connection */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          '!w-3 !h-3 !border-2',
          isPayer 
            ? '!bg-[#6854CF] dark:!bg-[#AB8DFF] !border-[#E2D0FC]' 
            : '!bg-[#82e664] !border-[#c5f5b0]'
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          '!w-3 !h-3 !border-2',
          isPayer 
            ? '!bg-[#6854CF] dark:!bg-[#AB8DFF] !border-[#E2D0FC]' 
            : '!bg-[#82e664] !border-[#c5f5b0]'
        )}
      />
    </div>
  )
})
