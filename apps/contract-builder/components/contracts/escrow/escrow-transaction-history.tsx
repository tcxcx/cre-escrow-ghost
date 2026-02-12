'use client'

import React from "react"

import { useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type TransactionType = 'deposit' | 'release' | 'yield' | 'refund'
type TransactionStatus = 'pending' | 'confirmed' | 'failed'

interface Transaction {
  id: string
  type: TransactionType
  amount: number
  status: TransactionStatus
  timestamp: Date
  txHash?: string
  milestone?: string
  description?: string
}

interface EscrowTransactionHistoryProps {
  transactions: Transaction[]
  className?: string
  onRefresh?: () => void
}

const transactionConfig: Record<TransactionType, {
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
}> = {
  deposit: {
    label: 'Deposit',
    icon: ArrowDownLeft,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  release: {
    label: 'Release',
    icon: ArrowUpRight,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  yield: {
    label: 'Yield',
    icon: ArrowDownLeft,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  refund: {
    label: 'Refund',
    icon: ArrowUpRight,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
}

const statusConfig: Record<TransactionStatus, {
  label: string
  icon: React.ElementType
  color: string
}> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
  },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
  },
}

export function EscrowTransactionHistory({
  transactions,
  className,
  onRefresh,
}: EscrowTransactionHistoryProps) {
  const [filter, setFilter] = useState<TransactionType | 'all'>('all')

  const filteredTransactions = filter === 'all' 
    ? transactions 
    : transactions.filter(tx => tx.type === filter)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Transaction History</CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 bg-transparent">
                  <Filter className="w-3.5 h-3.5" />
                  {filter === 'all' ? 'All' : transactionConfig[filter].label}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilter('all')}>
                  All Transactions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('deposit')}>
                  Deposits
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('release')}>
                  Releases
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('yield')}>
                  Yield
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('refund')}>
                  Refunds
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {onRefresh && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onRefresh}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {filteredTransactions.map((tx) => {
                const typeConfig = transactionConfig[tx.type]
                const statusCfg = statusConfig[tx.status]
                const TypeIcon = typeConfig.icon
                const StatusIcon = statusCfg.icon

                return (
                  <div
                    key={tx.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    {/* Icon */}
                    <div className={cn('p-2 rounded-lg', typeConfig.bgColor)}>
                      <TypeIcon className={cn('w-4 h-4', typeConfig.color)} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{typeConfig.label}</span>
                        <Badge variant="outline" className={cn('text-[10px] h-4 px-1.5 gap-0.5', statusCfg.color)}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {statusCfg.label}
                        </Badge>
                      </div>
                      {tx.milestone && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {tx.milestone}
                        </p>
                      )}
                      {tx.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {tx.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(tx.timestamp)}
                        </span>
                        {tx.txHash && (
                          <a
                            href={`https://basescan.org/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {truncateHash(tx.txHash)}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <span className={cn(
                        'font-semibold text-sm',
                        tx.type === 'deposit' || tx.type === 'yield' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                      )}>
                        {tx.type === 'deposit' || tx.type === 'yield' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
