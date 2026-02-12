'use client'

import { useMemo } from 'react'
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'

interface YieldProjectionChartProps {
  principal: number
  apy: number
  startDate: Date
  endDate: Date
  currentYield: number
  className?: string
}

export function YieldProjectionChart({
  principal,
  apy,
  startDate,
  endDate,
  currentYield,
  className,
}: YieldProjectionChartProps) {
  // Generate projection data points
  const chartData = useMemo(() => {
    const data: Array<{ date: string; actual: number; projected: number }> = []
    const dailyRate = apy / 365 / 100
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const today = new Date()
    const daysPassed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // Generate data points (weekly intervals)
    for (let i = 0; i <= totalDays; i += 7) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      
      const projectedYield = principal * dailyRate * i
      const isPast = i <= daysPassed
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        actual: isPast ? (currentYield * (i / daysPassed)) : 0,
        projected: projectedYield,
      })
    }
    
    return data
  }, [principal, apy, startDate, endDate, currentYield])

  const projectedTotalYield = useMemo(() => {
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    return principal * (apy / 365 / 100) * totalDays
  }, [principal, apy, startDate, endDate])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const chartConfig = {
    actual: {
      label: 'Earned',
      color: 'hsl(var(--chart-1))',
    },
    projected: {
      label: 'Projected',
      color: 'hsl(var(--chart-2))',
    },
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            Yield Projection
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1 text-xs cursor-help">
                  <Info className="w-3 h-3" />
                  {apy}% APY
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs">
                  Annual Percentage Yield based on current DeFi strategy. Actual returns may vary.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <DollarSign className="w-3 h-3" />
              <span>Earned</span>
            </div>
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(currentYield)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <TrendingUp className="w-3 h-3" />
              <span>Projected</span>
            </div>
            <span className="text-lg font-semibold text-foreground">
              {formatCurrency(projectedTotalYield)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Calendar className="w-3 h-3" />
              <span>End Date</span>
            </div>
            <span className="text-lg font-semibold text-foreground">
              {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Chart */}
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
                className="text-muted-foreground"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="projected"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#projectedGradient)"
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fill="url(#actualGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-[hsl(var(--chart-1))]" />
            <span className="text-muted-foreground">Actual Earnings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-[hsl(var(--chart-2))] border-dashed" style={{ borderTop: '2px dashed' }} />
            <span className="text-muted-foreground">Projected</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
