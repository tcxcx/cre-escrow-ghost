'use client'

import React from "react"

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Fuel,
  Ban,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type TransactionErrorType = 
  | 'insufficient_gas'
  | 'insufficient_balance'
  | 'user_rejected'
  | 'timeout'
  | 'unknown'

interface TransactionErrorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  errorType: TransactionErrorType
  errorDetails?: {
    required?: string
    current?: string
    token?: string
    message?: string
  }
  onRetry: () => void
}

const errorConfigs: Record<TransactionErrorType, {
  icon: React.ElementType
  title: string
  iconColor: string
}> = {
  insufficient_gas: {
    icon: Fuel,
    title: 'Insufficient Gas',
    iconColor: 'text-amber-500',
  },
  insufficient_balance: {
    icon: AlertCircle,
    title: 'Insufficient Balance',
    iconColor: 'text-red-500',
  },
  user_rejected: {
    icon: Ban,
    title: 'Transaction Rejected',
    iconColor: 'text-red-500',
  },
  timeout: {
    icon: Clock,
    title: 'Transaction Timeout',
    iconColor: 'text-amber-500',
  },
  unknown: {
    icon: AlertTriangle,
    title: 'Transaction Failed',
    iconColor: 'text-red-500',
  },
}

export function TransactionErrorModal({
  open,
  onOpenChange,
  errorType,
  errorDetails,
  onRetry,
}: TransactionErrorModalProps) {
  const config = errorConfigs[errorType]
  const Icon = config.icon

  const renderErrorContent = () => {
    switch (errorType) {
      case 'insufficient_gas':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your wallet doesn't have enough AVAX to pay for gas fees.
              You need approximately {errorDetails?.required || '0.01'} AVAX to complete this transaction.
            </p>
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your balance:</span>
                <span className="font-mono">{errorDetails?.current || '0.002'} AVAX</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Required:</span>
                <span className="font-mono">~{errorDetails?.required || '0.01'} AVAX</span>
              </div>
            </div>
          </div>
        )
      case 'insufficient_balance':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your wallet doesn't have enough {errorDetails?.token || 'USDC'} to complete this transaction.
            </p>
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your balance:</span>
                <span className="font-mono">{errorDetails?.current || '0'} {errorDetails?.token || 'USDC'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Required:</span>
                <span className="font-mono">{errorDetails?.required || '0'} {errorDetails?.token || 'USDC'}</span>
              </div>
            </div>
          </div>
        )
      case 'user_rejected':
        return (
          <p className="text-sm text-muted-foreground">
            You rejected the transaction in your wallet. If this was a mistake, you can try again.
          </p>
        )
      case 'timeout':
        return (
          <p className="text-sm text-muted-foreground">
            The transaction took too long to confirm. This could be due to network congestion. Please try again.
          </p>
        )
      default:
        return (
          <p className="text-sm text-muted-foreground">
            {errorDetails?.message || 'An unexpected error occurred while processing your transaction. Please try again.'}
          </p>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={cn('flex items-center gap-2', config.iconColor)}>
            <Icon className="h-5 w-5" />
            {config.title}
          </DialogTitle>
          <DialogDescription>
            We couldn't complete your transaction
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-6 rounded-lg border border-border bg-muted/30 text-center mb-4">
            <div className={cn(
              'flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4',
              'bg-red-500/10'
            )}>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="font-semibold mb-2">{config.title}</h3>
          </div>

          <div className="p-4 rounded-lg border border-border">
            {renderErrorContent()}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {errorType === 'insufficient_gas' && (
            <Button variant="outline" className="gap-2 bg-transparent" asChild>
              <a href="https://www.avax.network/get-avax" target="_blank" rel="noopener noreferrer">
                Get AVAX on Exchange
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          {errorType === 'insufficient_balance' && (
            <Button variant="outline" className="gap-2 bg-transparent" asChild>
              <a href="https://app.uniswap.org" target="_blank" rel="noopener noreferrer">
                Get {errorDetails?.token || 'USDC'}
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
