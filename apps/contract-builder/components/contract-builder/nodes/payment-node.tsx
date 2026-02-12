'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Banknote, Clock, CheckCircle2, Hand } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PaymentData } from '@repo/contract-flow'

interface PaymentNodeData extends PaymentData {
  label: string
}

const triggerIcons = {
  'milestone-completion': CheckCircle2,
  'manual': Hand,
  'time-based': Clock,
}

const triggerLabels = {
  'milestone-completion': 'On Milestone',
  'manual': 'Manual Release',
  'time-based': 'Scheduled',
}

export const PaymentNode = memo(function PaymentNode({ 
  data, 
  selected 
}: NodeProps & { data: PaymentNodeData }) {
  const formattedAmount = data.amount > 0 
    ? new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(data.amount)
    : '$0'

  const TriggerIcon = triggerIcons[data.triggerType]

  return (
    <div
      className={cn(
        'relative min-w-[180px] rounded-xl border-2 bg-card shadow-lg transition-all duration-200',
        'border-emerald-500/50 hover:border-emerald-500',
        selected && 'ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-background'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-t-[10px] bg-emerald-500/10">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400">
          <Banknote className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Payment
        </span>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        <h3 className="text-sm font-medium text-foreground truncate">
          {data.label}
        </h3>
        
        {/* Amount Display */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-lg font-bold text-emerald-400">
            {formattedAmount}
          </span>
          <span className="text-xs text-muted-foreground">
            {data.currency}
          </span>
        </div>

        {/* Trigger Type */}
        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
          <TriggerIcon className="w-3 h-3" />
          <span>{triggerLabels[data.triggerType]}</span>
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-emerald-300"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-emerald-300"
      />
    </div>
  )
})
