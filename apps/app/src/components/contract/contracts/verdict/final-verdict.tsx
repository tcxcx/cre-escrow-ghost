'use client'

import React from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  FileText,
  ArrowRight,
  Gavel,
} from 'lucide-react'
import { Button } from '@bu/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@bu/ui/card'
import { Badge } from '@bu/ui/badge'
import { Separator } from '@bu/ui/separator'
import { cn } from '@bu/ui/cn'

export type VerdictType = 'approved' | 'rejected' | 'exhausted'

interface FinalVerdictProps {
  verdict: VerdictType
  milestoneName: string
  milestoneAmount: number
  currency?: string
  verifiedAt?: string
  attemptsUsed?: number
  maxAttempts?: number
  confidenceScore?: number
  onViewReport?: () => void
  onContinue?: () => void
  onDispute?: () => void
  className?: string
}

const verdictConfig = {
  approved: {
    icon: CheckCircle2,
    title: 'Milestone Approved',
    description: 'Your deliverables have been verified and approved.',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/5',
    borderColor: 'border-emerald-500/50',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  rejected: {
    icon: XCircle,
    title: 'Submission Rejected',
    description: 'Your deliverables did not meet the verification criteria.',
    color: 'text-destructive',
    bgColor: 'bg-destructive/5',
    borderColor: 'border-destructive/50',
    badgeColor: 'bg-destructive/10 text-destructive',
  },
  exhausted: {
    icon: AlertTriangle,
    title: 'All Attempts Exhausted',
    description: 'You have used all available submission attempts.',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/5',
    borderColor: 'border-amber-500/50',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
}

export function FinalVerdict({
  verdict,
  milestoneName,
  milestoneAmount,
  currency = 'USDC',
  verifiedAt,
  attemptsUsed,
  maxAttempts,
  confidenceScore,
  onViewReport,
  onContinue,
  onDispute,
  className,
}: FinalVerdictProps) {
  const config = verdictConfig[verdict]
  const VerdictIcon = config.icon

  return (
    <Card className={cn('border-2', config.borderColor, config.bgColor, className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center mb-4',
            verdict === 'approved' && 'bg-emerald-500/10',
            verdict === 'rejected' && 'bg-destructive/10',
            verdict === 'exhausted' && 'bg-amber-500/10'
          )}>
            <VerdictIcon className={cn('w-10 h-10', config.color)} />
          </div>

          {/* Title */}
          <CardTitle className={cn('text-xl font-bold', config.color)}>
            {config.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Milestone Info */}
        <div className="p-4 rounded-lg bg-background border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Milestone</p>
              <p className="font-medium text-foreground">{milestoneName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Amount</p>
              <p className="font-bold text-lg text-foreground">
                {milestoneAmount.toLocaleString()} {currency}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          {verifiedAt && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">Verified</span>
              </div>
              <p className="text-sm font-medium text-foreground">{verifiedAt}</p>
            </div>
          )}
          {attemptsUsed !== undefined && maxAttempts !== undefined && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <FileText className="w-3.5 h-3.5" />
                <span className="text-xs">Attempts</span>
              </div>
              <p className="text-sm font-medium text-foreground">{attemptsUsed}/{maxAttempts}</p>
            </div>
          )}
          {confidenceScore !== undefined && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs">Confidence</span>
              </div>
              <p className={cn(
                'text-sm font-medium',
                confidenceScore >= 80 ? 'text-emerald-500' : 
                confidenceScore >= 60 ? 'text-amber-500' : 'text-destructive'
              )}>
                {confidenceScore}%
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {verdict === 'approved' && (
            <>
              {onViewReport && (
                <Button variant="outline" onClick={onViewReport} className="flex-1 gap-2 bg-transparent">
                  <FileText className="w-4 h-4" />
                  View Report
                </Button>
              )}
              {onContinue && (
                <Button onClick={onContinue} className="flex-1 gap-2 bg-emerald-500 hover:bg-emerald-600">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </>
          )}

          {verdict === 'rejected' && (
            <>
              {onViewReport && (
                <Button variant="outline" onClick={onViewReport} className="flex-1 gap-2 bg-transparent">
                  <FileText className="w-4 h-4" />
                  View Feedback
                </Button>
              )}
            </>
          )}

          {verdict === 'exhausted' && (
            <>
              {onViewReport && (
                <Button variant="outline" onClick={onViewReport} className="flex-1 gap-2 bg-transparent">
                  <FileText className="w-4 h-4" />
                  View History
                </Button>
              )}
              {onDispute && (
                <Button variant="destructive" onClick={onDispute} className="flex-1 gap-2">
                  <Gavel className="w-4 h-4" />
                  Open Dispute
                </Button>
              )}
            </>
          )}
        </div>

        {/* Next Steps Info */}
        {verdict === 'approved' && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              <strong>Payment Processing:</strong> The milestone payment of {milestoneAmount.toLocaleString()} {currency} will be released from escrow within 24 hours.
            </p>
          </div>
        )}

        {verdict === 'exhausted' && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <strong>What's Next:</strong> You may open a dispute to have a human reviewer examine your submissions. Both parties will be notified and asked to provide additional context.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
