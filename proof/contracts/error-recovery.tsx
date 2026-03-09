'use client'

import { AlertTriangle, RefreshCw, LifeBuoy, XCircle } from 'lucide-react'
import { Button } from '@bu/ui/button'
import { cn } from '@bu/ui/cn'

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface ErrorRecoveryProps {
  error: string
  severity: 'warning' | 'error' | 'critical'
  onRetry?: () => void
  retryCount?: number
  maxRetries?: number
  isRetrying?: boolean
  customAction?: { label: string; onClick: () => void }
  context?: string // e.g., "Ghost Mode Decrypt", "Escrow Deploy", "Contract Signing"
  className?: string
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

const SEVERITY_CONFIG = {
  warning: {
    icon: AlertTriangle,
    container:
      'border border-amber-400/40 dark:border-amber-600/30 bg-amber-50/60 dark:bg-amber-950/20',
    iconColor: 'text-amber-500 dark:text-amber-400',
    label: 'Warning',
    labelColor: 'text-amber-700 dark:text-amber-300',
  },
  error: {
    icon: XCircle,
    container:
      'border-2 border-destructive/40 dark:border-red-700/40 bg-red-50/60 dark:bg-red-950/20',
    iconColor: 'text-destructive dark:text-red-400',
    label: 'Error',
    labelColor: 'text-destructive dark:text-red-300',
  },
  critical: {
    icon: XCircle,
    container:
      'border-2 border-destructive bg-destructive/10 dark:bg-red-900/30 dark:border-red-600',
    iconColor: 'text-destructive dark:text-red-300',
    label: 'Critical Error',
    labelColor: 'text-destructive dark:text-red-200 font-semibold',
  },
} as const

/** Human-readable backoff: 2^n seconds capped at 30s */
function getBackoffLabel(retryCount: number): string {
  const seconds = Math.min(2 ** retryCount, 30)
  return `Retrying in ~${seconds}s`
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export function ErrorRecovery({
  error,
  severity,
  onRetry,
  retryCount = 0,
  maxRetries = 3,
  isRetrying = false,
  customAction,
  context,
  className,
}: ErrorRecoveryProps) {
  const config = SEVERITY_CONFIG[severity]
  const Icon = config.icon
  const retriesExhausted = retryCount >= maxRetries

  return (
    <div
      role="alert"
      className={cn('rounded-xl p-4 space-y-3', config.container, className)}
    >
      {/* ── Header row ── */}
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', config.iconColor)} />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-medium', config.labelColor)}>
              {config.label}
            </span>
            {context && (
              <span className="text-xs text-violetDanis dark:text-darkTextSecondary">
                {context}
              </span>
            )}
          </div>
          <p className="text-sm text-darkText dark:text-whiteDanis leading-relaxed">
            {error}
          </p>
        </div>
      </div>

      {/* ── Retry info ── */}
      {onRetry && retryCount > 0 && (
        <div className="flex items-center gap-2 pl-8 text-xs text-violetDanis dark:text-darkTextSecondary">
          <span>
            Attempt {retryCount}/{maxRetries}
          </span>
          {isRetrying && !retriesExhausted && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>{getBackoffLabel(retryCount)}</span>
            </>
          )}
          {retriesExhausted && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span className="text-destructive dark:text-red-400">
                Max retries reached
              </span>
            </>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-2 pl-8 flex-wrap">
        {onRetry && !retriesExhausted && (
          <Button
            variant="glass"
            size="sm"
            className={cn(
              'gap-2 h-8 text-xs',
              isRetrying && 'animate-pulse'
            )}
            disabled={isRetrying}
            onClick={onRetry}
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', isRetrying && 'animate-spin')}
            />
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
        )}

        {customAction && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-8 text-xs bg-transparent"
            onClick={customAction.onClick}
          >
            {customAction.label}
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="gap-2 h-8 text-xs text-violetDanis dark:text-darkTextSecondary ml-auto"
          asChild
        >
          <a href="mailto:support@bu.finance" target="_blank" rel="noreferrer">
            <LifeBuoy className="w-3.5 h-3.5" />
            Contact Support
          </a>
        </Button>
      </div>
    </div>
  )
}
