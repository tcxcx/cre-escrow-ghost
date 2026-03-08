'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@bu/ui/button'
import { Card, CardContent } from '@bu/ui/card'
import { Badge } from '@bu/ui/badge'
import { Separator } from '@bu/ui/separator'
import {
  Mail,
  FileText,
  DollarSign,
  Calendar,
  Target,
  Percent,
  TrendingUp,
  User,
  Building2,
  ArrowRight,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@bu/ui/cn'
import type { ActiveContract } from '@/types/contracts'

interface ReceivedContractViewProps {
  contract: ActiveContract
  senderMessage?: string
  senderEmail?: string
  sentAt?: string
  onViewFull: () => void
  onRequestChanges: () => void
  onAcceptAndSign: () => void
}

export function ReceivedContractView({
  contract,
  senderMessage,
  senderEmail,
  sentAt,
  onViewFull,
  onRequestChanges,
  onAcceptAndSign,
}: ReceivedContractViewProps) {
  const router = useRouter()
  const totalValue = contract.milestones.reduce((sum, m) => sum + m.amount, 0)
  const totalCommission = contract.commissions.reduce((sum, c) => sum + c.percentage, 0)

  // Determine user role based on who sent the contract
  const isPayee = true // In this view, the current user is the payee (receiver)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-2xl px-4 py-12">
        {/* Header Card */}
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">You've Received a Contract</h1>
            <p className="text-muted-foreground">
              From <span className="font-medium text-foreground">{contract.payer.name}</span>
            </p>
          </div>
        </Card>

        {/* Contract Summary */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Contract Summary</p>
                <p className="font-semibold">{contract.name}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Title</span>
                <span className="font-medium">{contract.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">Milestone-Based Project</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Total Value
                </span>
                <span className="font-medium">${totalValue.toLocaleString()} USDC</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Your Role
                </span>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                  Payee (Contractor)
                </Badge>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  Milestones
                </span>
                <span className="font-medium">{contract.milestones.length} deliverables</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Duration
                </span>
                <span className="font-medium">
                  {contract.milestones[0]?.dueDate
                    ? new Date(contract.milestones[0].dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'TBD'
                  } - {contract.milestones[contract.milestones.length - 1]?.dueDate
                    ? new Date(contract.milestones[contract.milestones.length - 1].dueDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'TBD'
                  }
                </span>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Yield Bonus
                </span>
                <span className="font-medium text-emerald-600">
                  {contract.yieldStrategy?.payeeShare || 60}% of yield allocated to you
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Percent className="h-4 w-4" />
                  Commissions
                </span>
                <span className="font-medium">{totalCommission}% (platform + referral)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sender Message */}
        {senderMessage && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Message from {contract.payer.name}
                  </p>
                </div>
              </div>
              <blockquote className="pl-4 border-l-2 border-primary/30 italic text-muted-foreground">
                "{senderMessage}"
              </blockquote>
              <p className="text-xs text-muted-foreground mt-3">
                Sent by: {senderEmail || contract.payer.email} • {sentAt || 'Just now'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Important Notice */}
        <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Before you sign</p>
                <p className="text-sm text-muted-foreground">
                  Please review the full contract details including milestones, payment terms, and verification criteria before accepting.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="flex-1 gap-2 bg-transparent"
                onClick={onViewFull}
              >
                <FileText className="h-4 w-4" />
                View Full Contract
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 gap-2 bg-transparent"
                onClick={onRequestChanges}
              >
                <MessageSquare className="h-4 w-4" />
                Request Changes
              </Button>
              <Button 
                className="flex-1 gap-2"
                onClick={onAcceptAndSign}
              >
                <CheckCircle2 className="h-4 w-4" />
                Accept & Sign
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          This contract is secured by blockchain technology and will be verified by Bufi's smart contract system.
        </p>
      </div>
    </div>
  )
}
