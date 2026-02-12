'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ShieldCheck, User, Building2, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { IdentityVerificationData } from '@repo/contract-flow'

interface IdentityVerificationNodeProps extends NodeProps {
  data: IdentityVerificationData & { label?: string }
}

function IdentityVerificationNodeComponent({ data, selected }: IdentityVerificationNodeProps) {
  const verificationType = data.verificationType || 'kyc'
  const requiredFor = data.requiredFor || 'both'
  const triggerPoint = data.triggerPoint || 'before_signing'
  
  const getVerificationLabel = () => {
    switch (verificationType) {
      case 'kyc': return 'KYC'
      case 'kyb': return 'KYB'
      case 'both': return 'KYC + KYB'
      default: return 'Identity'
    }
  }
  
  const getTriggerLabel = () => {
    switch (triggerPoint) {
      case 'before_signing': return 'Before Signing'
      case 'before_funding': return 'Before Funding'
      case 'before_milestone': return 'Before Milestone'
      default: return 'Before Signing'
    }
  }
  
  const getRequiredForLabel = () => {
    switch (requiredFor) {
      case 'payer': return 'Payer Only'
      case 'payee': return 'Payee Only'
      case 'both': return 'Both Parties'
      default: return 'Both Parties'
    }
  }
  
  // Get verification status counts
  const statuses = data.status || {}
  const statusCounts = {
    pending: Object.values(statuses).filter(s => s === 'pending' || s === 'in_review').length,
    approved: Object.values(statuses).filter(s => s === 'approved').length,
    declined: Object.values(statuses).filter(s => s === 'declined').length,
  }
  const totalRequired = requiredFor === 'both' ? 2 : 1
  
  // Check if requirements are configured
  const hasRequirements = data.requirements && (
    (data.requirements.kyc && Object.values(data.requirements.kyc).some(v => v)) ||
    (data.requirements.kyb && Object.values(data.requirements.kyb).some(v => v))
  )

  return (
    <div
      className={cn(
        'relative min-w-[220px] rounded-xl border-2 bg-card shadow-lg transition-all duration-200',
        selected
          ? 'border-cyan-500 ring-2 ring-cyan-500/20 shadow-cyan-500/20'
          : 'border-cyan-500/30 hover:border-cyan-500/50',
        !hasRequirements && 'border-dashed'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 rounded-t-[10px] border-b border-cyan-500/20">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-foreground truncate">
            {getVerificationLabel()} Verification
          </div>
          <div className="text-[10px] text-muted-foreground">
            Persona Integration
          </div>
        </div>
        {!hasRequirements && (
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Verification Type Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(verificationType === 'kyc' || verificationType === 'both') && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
              <User className="w-3 h-3 mr-1" />
              KYC
            </Badge>
          )}
          {(verificationType === 'kyb' || verificationType === 'both') && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-teal-500/30 text-teal-600 dark:text-teal-400">
              <Building2 className="w-3 h-3 mr-1" />
              KYB
            </Badge>
          )}
        </div>
        
        {/* Info */}
        <div className="space-y-1 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Required for:</span>
            <span className="font-medium text-foreground">{getRequiredForLabel()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Trigger:</span>
            <span className="font-medium text-foreground">{getTriggerLabel()}</span>
          </div>
        </div>

        {/* Status Indicators */}
        {Object.keys(statuses).length > 0 && (
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            {statusCounts.approved > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-emerald-500">
                <CheckCircle2 className="w-3 h-3" />
                <span>{statusCounts.approved}/{totalRequired}</span>
              </div>
            )}
            {statusCounts.pending > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-amber-500">
                <Clock className="w-3 h-3" />
                <span>{statusCounts.pending}</span>
              </div>
            )}
            {statusCounts.declined > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-red-500">
                <XCircle className="w-3 h-3" />
                <span>{statusCounts.declined}</span>
              </div>
            )}
          </div>
        )}

        {/* Requirements Summary */}
        {hasRequirements && (
          <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
            {data.requirements?.kyc && (
              <div className="flex items-center gap-1">
                <span className="text-cyan-500">KYC:</span>
                {data.requirements.kyc.governmentId && <span>ID</span>}
                {data.requirements.kyc.selfie && <span>Selfie</span>}
                {data.requirements.kyc.proofOfAddress && <span>PoA</span>}
              </div>
            )}
            {data.requirements?.kyb && (
              <div className="flex items-center gap-1">
                <span className="text-teal-500">KYB:</span>
                {data.requirements.kyb.businessRegistration && <span>Reg</span>}
                {data.requirements.kyb.beneficialOwners && <span>UBO</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-background"
      />
    </div>
  )
}

export const IdentityVerificationNode = memo(IdentityVerificationNodeComponent)
