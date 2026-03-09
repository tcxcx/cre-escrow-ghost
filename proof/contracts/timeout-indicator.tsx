'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Clock, X } from 'lucide-react'
import { Button } from '@bu/ui/button'
import { Progress } from '@bu/ui/progress'
import { cn } from '@bu/ui/cn'

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface TimeoutIndicatorProps {
  /** Label shown above the progress bar, e.g. "Decrypting private balance..." */
  label: string
  /** Expected duration in seconds */
  estimatedSeconds: number
  /** Called when elapsed time exceeds estimatedSeconds */
  onTimeout?: () => void
  /** Called when the user clicks cancel */
  onCancel?: () => void
  className?: string
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export function TimeoutIndicator({
  label,
  estimatedSeconds,
  onTimeout,
  onCancel,
  className,
}: TimeoutIndicatorProps) {
  const [elapsed, setElapsed] = useState(0)
  const timeoutFired = useRef(false)

  const isOvertime = elapsed > estimatedSeconds
  const progress = Math.min((elapsed / estimatedSeconds) * 100, 100)

  // Fire onTimeout once when we cross the threshold
  const handleTimeout = useCallback(() => {
    if (!timeoutFired.current && onTimeout) {
      timeoutFired.current = true
      onTimeout()
    }
  }, [onTimeout])

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1
        if (next > estimatedSeconds) handleTimeout()
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [estimatedSeconds, handleTimeout])

  return (
    <div
      className={cn(
        'rounded-xl border p-4 space-y-3',
        isOvertime
          ? 'border-amber-400/40 dark:border-amber-600/30 bg-amber-50/40 dark:bg-amber-950/15'
          : 'border-borderFine dark:border-darkBorder bg-whiteDanis dark:bg-darkBg',
        className
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Clock
            className={cn(
              'w-4 h-4',
              isOvertime
                ? 'text-amber-500 dark:text-amber-400 animate-pulse'
                : 'text-purpleDanis dark:text-lila'
            )}
          />
          <span className="text-sm font-medium text-darkText dark:text-whiteDanis">
            {label}
          </span>
        </div>
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onCancel}
            aria-label="Cancel operation"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* ── Progress bar ── */}
      <Progress
        value={progress}
        className={cn('h-1.5', isOvertime && '[&>div]:bg-amber-500')}
      />

      {/* ── Time labels ── */}
      <div className="flex items-center justify-between text-xs text-violetDanis dark:text-darkTextSecondary">
        <span>
          {formatElapsed(elapsed)} / ~{formatElapsed(estimatedSeconds)}
        </span>
        {isOvertime && (
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            Taking longer than expected...
          </span>
        )}
      </div>
    </div>
  )
}
