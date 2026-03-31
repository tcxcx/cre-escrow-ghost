'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { User, Building2, AlertCircle } from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { useContractStore } from '@/lib/contract-store'
import type { PartyData } from '@bu/contracts/contract-flow'

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
            ? 'border-rojo hover:border-rose-400'
            : 'border-violet-300 hover:border-purpura dark:border-violet-400 dark:hover:border-violeta'
          : isInvalid
            ? 'border-rojo hover:border-rose-400'
            : 'border-emerald-300 hover:border-vverde',
        selected && isPayer && !isInvalid && 'ring-violet-300 dark:ring-violet-400',
        selected && !isPayer && !isInvalid && 'ring-emerald-300',
        selected && isInvalid && 'ring-rose-300'
      )}
    >
      {/* Validation indicator */}
      {isInvalid && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rojo flex items-center justify-center z-10">
          <AlertCircle className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-t-[10px]',
          isInvalid
            ? 'bg-rose-50 dark:bg-rose-950'
            : isPayer ? 'bg-violet-100 dark:bg-violet-900' : 'bg-emerald-50 dark:bg-emerald-950'
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center w-6 h-6 rounded-md',
            isInvalid
              ? 'bg-rose-100 dark:bg-rose-900 text-rojo'
              : isPayer ? 'bg-violet-100 dark:bg-violet-900 text-purpura dark:text-violeta' : 'bg-emerald-100 dark:bg-emerald-900 text-vverde'
          )}
        >
          {isPayer ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
        </div>
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            isInvalid
              ? 'text-rojo'
              : isPayer ? 'text-purpura dark:text-violeta' : 'text-vverde'
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
          <p className="text-xs text-rojo truncate mt-0.5">
            Name required
          </p>
        )}
        {data.email ? (
          <p className="text-xs text-muted-foreground/70 truncate">
            {data.email}
          </p>
        ) : (
          <p className="text-xs text-rose-400 truncate">
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
            ? '!bg-purpura dark:!bg-violeta !border-lila'
            : '!bg-vverde !border-emerald-200'
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          '!w-3 !h-3 !border-2',
          isPayer
            ? '!bg-purpura dark:!bg-violeta !border-lila'
            : '!bg-vverde !border-emerald-200'
        )}
      />
    </div>
  )
})
