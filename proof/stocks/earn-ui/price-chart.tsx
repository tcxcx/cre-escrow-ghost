'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@bu/ui/utils';
import type { HistoricalPrice, TimeRange } from '@/hooks/use-price-history';

const TIME_RANGES: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y'];

interface PriceChartProps {
  data: HistoricalPrice[];
  loading?: boolean;
  name?: string;
  color?: string;
  className?: string;
  range?: TimeRange;
  onRangeChange?: (range: TimeRange) => void;
}

function formatPrice(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateLabel(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ChartSkeleton() {
  return (
    <div className="flex h-[200px] items-end gap-1 px-4 animate-pulse">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-purple-200/40 dark:bg-purple-800/20"
          style={{ height: `${30 + Math.random() * 70}%` }}
        />
      ))}
    </div>
  );
}

export function PriceChart({
  data,
  loading,
  name,
  color = '#6954cf',
  className,
  range = '3M',
  onRangeChange,
}: PriceChartProps) {
  const trend = useMemo(() => {
    if (data.length < 2) return null;
    const first = data[0].close;
    const last = data[data.length - 1].close;
    const pct = ((last - first) / first) * 100;
    return { pct, up: pct >= 0 };
  }, [data]);

  return (
    <div className={cn('rounded-xl border border-purple-200 dark:border-purple-900/30 p-4', className)}>
      {/* Time range selector */}
      {onRangeChange && (
        <div className="flex gap-1 mb-4">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold transition-colors',
                r === range
                  ? 'bg-purpleDanis text-white'
                  : 'text-purple-600/60 dark:text-darkTextSecondary hover:bg-purple-100 dark:hover:bg-purple-950/30',
              )}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Chart area — uses ResponsiveContainer directly (not ChartContainer)
          because ChartContainer's flex+aspect-video layout causes
          ResponsiveContainer to compute negative dimensions. */}
      {loading ? (
        <ChartSkeleton />
      ) : data.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-muted-foreground dark:text-darkTextSecondary">
            No price data available
          </p>
        </div>
      ) : (
        <div className="w-full" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(128,90,213,0.1)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickFormatter={formatDateLabel}
                tickMargin={8}
                minTickGap={40}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${v}`}
                width={50}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e9d5ff',
                  borderRadius: 8,
                  fontSize: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
                labelFormatter={(label: string) => {
                  const d = new Date(label + 'T00:00:00');
                  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                }}
                formatter={(value: number) => [formatPrice(value), name ?? 'Price']}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${color.replace('#', '')})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, fill: 'white', stroke: color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Trend footer */}
      {trend && !loading && (
        <div className="flex items-center gap-1.5 mt-3 text-xs">
          {trend.up ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
          )}
          <span className={cn(
            'font-semibold',
            trend.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
          )}>
            {trend.up ? '+' : ''}{trend.pct.toFixed(2)}%
          </span>
          <span className="text-muted-foreground dark:text-darkTextSecondary">
            {name ? `${name} ` : ''}this period
          </span>
        </div>
      )}
    </div>
  );
}
