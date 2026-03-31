'use client'

import React from 'react'
import {
  CheckCircle2,
  ExternalLink,
  Copy,
  Wallet,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react'
import { Button } from '@bu/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@bu/ui/card'
import { Badge } from '@bu/ui/badge'
import { Separator } from '@bu/ui/separator'
import { toast } from 'sonner'
import { cn } from '@bu/ui/cn'

interface PaymentReleaseProps {
  milestoneName: string
  amount: number
  currency?: string
  recipientAddress: string
  transactionHash?: string
  yieldEarned?: number
  releasedAt?: string
  chainName?: string
  explorerUrl?: string
  onContinue?: () => void
  className?: string
}

export function PaymentRelease({
  milestoneName,
  amount,
  currency = 'USDC',
  recipientAddress,
  transactionHash,
  yieldEarned,
  releasedAt,
  chainName = 'Base',
  explorerUrl,
  onContinue,
  className,
}: PaymentReleaseProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const totalAmount = amount + (yieldEarned || 0)

  return (
    <Card className={cn('border-2 border-emerald-500/50 bg-emerald-500/5', className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col items-center text-center">
          {/* Success Animation */}
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            {/* Pulse rings */}
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
          </div>

          <CardTitle className="text-xl font-bold text-emerald-500">
            Payment Released
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Funds have been transferred from escrow
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Amount Breakdown */}
        <div className="p-4 rounded-lg bg-background border border-emerald-500/30">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Milestone Payment</span>
              <span className="font-medium text-foreground">{amount.toLocaleString()} {currency}</span>
            </div>
            {yieldEarned && yieldEarned > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-500" />
                  Yield Earned
                </span>
                <span className="font-medium text-cyan-500">+{yieldEarned.toFixed(2)} {currency}</span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Total Received</span>
              <span className="text-xl font-bold text-emerald-500">{totalAmount.toLocaleString()} {currency}</span>
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Transaction Details</p>
          
          <div className="space-y-2">
            {/* Milestone */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Milestone</span>
              <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{milestoneName}</span>
            </div>

            {/* Recipient */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Recipient
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-foreground">
                  {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(recipientAddress, 'Address')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Transaction Hash */}
            {transactionHash && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Transaction</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-foreground">
                    {transactionHash.slice(0, 8)}...{transactionHash.slice(-6)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(transactionHash, 'Transaction hash')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  {explorerUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => window.open(explorerUrl, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Chain & Time */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Network</span>
              <Badge variant="secondary">{chainName}</Badge>
            </div>

            {releasedAt && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Released</span>
                <span className="text-sm text-foreground">{releasedAt}</span>
              </div>
            )}
          </div>
        </div>

        {/* Continue Button */}
        {onContinue && (
          <Button onClick={onContinue} className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600">
            Continue to Contract
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}

        {/* Yield Promotion */}
        {yieldEarned && yieldEarned > 0 && (
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                  You earned ${yieldEarned.toFixed(2)} in yield!
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Funds in escrow automatically earn yield until release.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
