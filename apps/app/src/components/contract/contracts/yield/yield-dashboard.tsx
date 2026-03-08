'use client'

import React from "react"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@bu/ui/card'
import { Button } from '@bu/ui/button'
import { Badge } from '@bu/ui/badge'
import { Progress } from '@bu/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@bu/ui/tabs'
import { ScrollArea } from '@bu/ui/scroll-area'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Info,
  Shield,
  Zap,
  Building2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@bu/ui/cn'
import type { YieldStrategy } from '@/types/contracts'

interface YieldData {
  totalDeposited: number
  currentValue: number
  totalYieldEarned: number
  projectedApy: number
  strategy: YieldStrategy
  deposits: {
    id: string
    amount: number
    timestamp: Date
    txHash: string
  }[]
  yieldHistory: {
    date: Date
    apy: number
    earned: number
  }[]
}

// Mock data for demonstration
const mockYieldData: YieldData = {
  totalDeposited: 10000,
  currentValue: 10245.32,
  totalYieldEarned: 245.32,
  projectedApy: 4.8,
  strategy: 'aave',
  deposits: [
    { id: '1', amount: 10000, timestamp: new Date('2024-01-15'), txHash: '0x123...abc' },
  ],
  yieldHistory: [
    { date: new Date('2024-01-15'), apy: 4.5, earned: 0 },
    { date: new Date('2024-01-22'), apy: 4.6, earned: 8.85 },
    { date: new Date('2024-01-29'), apy: 4.8, earned: 17.92 },
    { date: new Date('2024-02-05'), apy: 4.7, earned: 27.23 },
  ],
}

const strategyInfo: Record<YieldStrategy, { name: string; description: string; icon: React.ElementType; color: string }> = {
  aave: {
    name: 'Aave V3',
    description: 'Decentralized lending protocol with variable rates',
    icon: Zap,
    color: 'text-[#B6509E]',
  },
  compound: {
    name: 'Compound',
    description: 'Algorithmic money market protocol',
    icon: Building2,
    color: 'text-[#00D395]',
  },
  none: {
    name: 'No Yield',
    description: 'Funds held in escrow without yield generation',
    icon: Shield,
    color: 'text-muted-foreground',
  },
}

interface YieldDashboardProps {
  contractId?: string
}

export function YieldDashboard({ contractId }: YieldDashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const data = mockYieldData
  
  const percentageGain = ((data.currentValue - data.totalDeposited) / data.totalDeposited) * 100
  const strategyData = strategyInfo[data.strategy]
  const StrategyIcon = strategyData.icon

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsRefreshing(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Yield Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track your escrow funds earning yield through DeFi protocols
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-transparent"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Strategy Badge */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg bg-muted', strategyData.color)}>
                <StrategyIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{strategyData.name}</span>
                  <Badge variant="secondary" className="text-xs">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{strategyData.description}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 bg-transparent text-muted-foreground">
              <span className="text-sm">View Protocol</span>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deposited */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Deposited</span>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold text-foreground">
              ${data.totalDeposited.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">USDC</p>
          </CardContent>
        </Card>

        {/* Current Value */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Current Value</span>
              <TrendingUp className="w-4 h-4 text-[#82e664]" />
            </div>
            <p className="text-2xl font-semibold text-foreground">
              ${data.currentValue.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3 text-[#82e664]" />
              <span className="text-xs text-[#82e664]">+{percentageGain.toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Yield Earned */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Yield Earned</span>
              <Percent className="w-4 h-4 text-[#6854CF]" />
            </div>
            <p className="text-2xl font-semibold text-[#82e664]">
              +${data.totalYieldEarned.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Since deposit</p>
          </CardContent>
        </Card>

        {/* Current APY */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Current APY</span>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {data.projectedApy}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Variable rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Yield Distribution Info */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4" />
            Yield Distribution
          </CardTitle>
          <CardDescription>How yield is distributed upon contract completion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#6854CF]" />
                <span className="text-sm text-foreground">Payer Receives</span>
              </div>
              <span className="text-sm font-medium text-foreground">50% of yield</span>
            </div>
            <Progress value={50} className="h-2" />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#82e664]" />
                <span className="text-sm text-foreground">Payee Receives</span>
              </div>
              <span className="text-sm font-medium text-foreground">50% of yield</span>
            </div>
            <Progress value={50} className="h-2" />
          </div>
          
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">
              Yield is automatically distributed to both parties when the contract completes or funds are released.
              Distribution is proportional to time funds were held in escrow.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Yield History */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Yield History</CardTitle>
          <CardDescription>Weekly yield accumulation</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-3">
              {data.yieldHistory.map((entry, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-[#82e664]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Week {index + 1}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.date.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#82e664]">
                      +${entry.earned.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.apy}% APY
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
