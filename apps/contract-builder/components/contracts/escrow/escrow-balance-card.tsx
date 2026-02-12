'use client'

import { useState } from 'react'
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Clock,
  Info,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface EscrowBalanceCardProps {
  contractId: string
  totalAmount: number
  releasedAmount: number
  pendingAmount: number
  yieldEarned: number
  yieldApy: number
  yieldStrategy: string
  currency?: string
  lastUpdated?: string
  className?: string
}

export function EscrowBalanceCard({
  totalAmount,
  releasedAmount,
  pendingAmount,
  yieldEarned,
  yieldApy,
  yieldStrategy,
  currency = 'USDC',
  lastUpdated,
  className,
}: EscrowBalanceCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  
  const remainingAmount = totalAmount - releasedAmount
  const progressPercent = totalAmount > 0 ? (releasedAmount / totalAmount) * 100 : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5 pointer-events-none" />
      
      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            Escrow Balance
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Info className="w-4 h-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs">
                  Funds are held securely in a smart contract escrow and released upon milestone completion.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Main Balance */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">
              {formatCurrency(remainingAmount)}
            </span>
            <Badge variant="outline" className="text-xs font-medium">
              {currency}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Remaining in escrow
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Release Progress</span>
            <span className="font-medium">{progressPercent.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(releasedAmount)} released</span>
            <span>{formatCurrency(totalAmount)} total</span>
          </div>
        </div>

        {/* Yield Info */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="p-2 rounded-md bg-emerald-500/20">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(yieldEarned)}
              </span>
              <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                yield earned
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                {yieldApy}% APY
              </Badge>
              <span className="text-xs text-muted-foreground truncate">
                via {yieldStrategy}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown Toggle */}
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full flex items-center justify-between p-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
        >
          <span className="text-muted-foreground">View Breakdown</span>
          <ArrowUpRight className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            showBreakdown && 'rotate-180'
          )} />
        </button>

        {/* Breakdown Details */}
        {showBreakdown && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="w-3.5 h-3.5" />
                <span>Principal</span>
              </div>
              <span className="font-medium">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Yield Earned</span>
              </div>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(yieldEarned)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Released</span>
              </div>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                -{formatCurrency(releasedAmount)}
              </span>
            </div>
            {pendingAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending Release</span>
                </div>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {formatCurrency(pendingAmount)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
              <span className="font-medium">Net Balance</span>
              <span className="font-bold">{formatCurrency(remainingAmount + yieldEarned)}</span>
            </div>
          </div>
        )}

        {/* Last Updated */}
        {lastUpdated && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Last updated {lastUpdated}
            </span>
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground">
              View on-chain
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
