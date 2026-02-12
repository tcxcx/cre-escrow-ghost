'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { PenLine, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SignatureData } from '@repo/contract-flow'

interface SignatureNodeData extends SignatureData {
  label: string
}

const roleLabels = {
  payer: 'Client Signature',
  payee: 'Provider Signature',
  witness: 'Witness Signature',
}

export const SignatureNode = memo(function SignatureNode({ 
  data, 
  selected 
}: NodeProps & { data: SignatureNodeData }) {
  const isSigned = Boolean(data.signedAt)

  return (
    <div
      className={cn(
        'relative min-w-[160px] rounded-xl border-2 bg-card shadow-lg transition-all duration-200',
        'border-blue-500/50 hover:border-blue-500',
        selected && 'ring-2 ring-blue-500/50 ring-offset-2 ring-offset-background',
        isSigned && 'border-emerald-500/50 hover:border-emerald-500'
      )}
    >
      {/* Header */}
      <div 
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-t-[10px]',
          isSigned ? 'bg-emerald-500/10' : 'bg-blue-500/10'
        )}
      >
        <div 
          className={cn(
            'flex items-center justify-center w-6 h-6 rounded-md',
            isSigned 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'bg-blue-500/20 text-blue-400'
          )}
        >
          {isSigned ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <PenLine className="w-3.5 h-3.5" />
          )}
        </div>
        <span 
          className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            isSigned ? 'text-emerald-400' : 'text-blue-400'
          )}
        >
          {isSigned ? 'Signed' : 'Signature'}
        </span>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        <h3 className="text-sm font-medium text-foreground truncate">
          {data.label}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {roleLabels[data.signerRole]}
        </p>
        {data.required && !isSigned && (
          <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
            Required
          </span>
        )}
        {isSigned && data.signedAt && (
          <p className="text-xs text-emerald-400/80 mt-1">
            Signed on {new Date(data.signedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-blue-300"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-blue-300"
      />
    </div>
  )
})
