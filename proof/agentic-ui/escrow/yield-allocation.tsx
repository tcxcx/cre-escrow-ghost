'use client'

import { useState } from 'react'
import {
  TrendingUp,
  Percent,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  Zap,
  Building2,
  Shield,
  CircleDollarSign,
  Settings2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@bu/ui/card'
import { Button } from '@bu/ui/button'
import { Badge } from '@bu/ui/badge'
import { Progress } from '@bu/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@bu/ui/tooltip'
import { cn } from '@bu/ui/cn'

type YieldAllocationStatus = 'idle' | 'depositing' | 'active' | 'redeeming'

interface YieldAllocationProps {
  escrowBalance: number
  yieldBalance: number
  strategyName: string
  apy: number
  status: YieldAllocationStatus
  contractId: string
  className?: string
}

const STATUS_CONFIG: Record<
  YieldAllocationStatus,
  { label: string; color: string; dotColor: string }
> = {
  idle: {
    label: 'Idle',
    color: 'text-muted-foreground bg-muted',
    dotColor: 'bg-muted-foreground',
  },
  depositing: {
    label: 'Depositing',
    color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    dotColor: 'bg-amber-500 animate-pulse',
  },
  active: {
    label: 'Earning',
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    dotColor: 'bg-emerald-500',
  },
  redeeming: {
    label: 'Redeeming',
    color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10',
    dotColor: 'bg-violet-500 animate-pulse',
  },
}

const STRATEGY_ICONS: Record<string, React.ElementType> = {
  'Aave V3': Zap,
  Compound: Building2,
  'No Yield': Shield,
}

export function YieldAllocation({
  escrowBalance,
  yieldBalance,
  strategyName,
  apy,
  status,
  contractId,
  className,
}: YieldAllocationProps) {
  const [isReallocating, setIsReallocating] = useState(false)

  const allocationPercent =
    escrowBalance > 0 ? (yieldBalance / escrowBalance) * 100 : 0
  const idleBalance = escrowBalance - yieldBalance
  const projectedDailyEarning = (yieldBalance * (apy / 100)) / 365
  const projectedMonthlyEarning = projectedDailyEarning * 30

  const statusConfig = STATUS_CONFIG[status]
  const StrategyIcon = STRATEGY_ICONS[strategyName] ?? CircleDollarSign

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)

  const handleReallocate = async () => {
    setIsReallocating(true)
    try {
      await fetch(`/api/contracts/escrow/${contractId}/yield/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: idleBalance,
          strategyId: strategyName.toLowerCase().replace(/\s+/g, '-'),
        }),
      })
    } catch {
      // Allocation request failed — user can retry
    } finally {
      setIsReallocating(false)
    }
  }

  return (
    <Card
      className={cn('relative overflow-hidden', className)}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5 pointer-events-none" />

      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-violet-500/10">
              <TrendingUp className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            Yield Allocation
          </CardTitle>
          <Badge
            variant="outline"
            className={cn('text-xs gap-1.5 font-medium', statusConfig.color)}
          >
            <span
              className={cn('w-1.5 h-1.5 rounded-full', statusConfig.dotColor)}
            />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Allocation Split */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Allocated to yield
            </span>
            <span className="font-medium">{allocationPercent.toFixed(0)}%</span>
          </div>
          <Progress value={allocationPercent} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(yieldBalance)} earning</span>
            <span>{formatCurrency(escrowBalance)} total</span>
          </div>
        </div>

        {/* Balance Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <TrendingUp className="w-3 h-3 text-violet-500" />
              <span>Yield Balance</span>
            </div>
            <span className="text-lg font-semibold text-violet-600 dark:text-violet-400">
              {formatCurrency(yieldBalance)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Shield className="w-3 h-3" />
              <span>Idle in Escrow</span>
            </div>
            <span className="text-lg font-semibold text-foreground">
              {formatCurrency(idleBalance)}
            </span>
          </div>
        </div>

        {/* Strategy & APY */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
          <div className="p-2 rounded-md bg-purple-500/10">
            <StrategyIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {strategyName}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] h-4 px-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
              >
                <Percent className="w-2.5 h-2.5 mr-0.5" />
                {apy}% APY
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Yield strategy for idle escrow funds
            </p>
          </div>
        </div>

        {/* Projected Earnings */}
        {status === 'active' && yieldBalance > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 cursor-help">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Daily
                    </span>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      +{formatCurrency(projectedDailyEarning)}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Projected daily earnings at {apy}% APY
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 cursor-help">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Monthly
                    </span>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      +{formatCurrency(projectedMonthlyEarning)}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Projected 30-day earnings at {apy}% APY
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Reallocate Button */}
        {idleBalance > 0 && status !== 'depositing' && status !== 'redeeming' && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 bg-violet-500/5 border-violet-500/20 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
            onClick={handleReallocate}
            disabled={isReallocating}
          >
            {isReallocating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Settings2 className="w-4 h-4" />
            )}
            {isReallocating
              ? 'Allocating...'
              : `Allocate ${formatCurrency(idleBalance)} to Yield`}
          </Button>
        )}

        {/* In-progress states */}
        {status === 'depositing' && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs text-amber-600 dark:text-amber-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Depositing funds into {strategyName}...
          </div>
        )}
        {status === 'redeeming' && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/10 text-xs text-violet-600 dark:text-violet-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Redeeming funds from {strategyName}...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
