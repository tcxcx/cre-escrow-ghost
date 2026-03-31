'use client'

import React from 'react'
import { RefreshCw, AlertTriangle, Clock, ArrowRight } from 'lucide-react'
import { Button } from '@bu/ui/button'
import { Card, CardContent } from '@bu/ui/card'
import { Badge } from '@bu/ui/badge'
import { cn } from '@bu/ui/cn'

interface RetryPromptProps {
  attemptsUsed: number
  maxAttempts: number
  cooldownEnds?: Date
  onRetry: () => void
  className?: string
}

export function RetryPrompt({
  attemptsUsed,
  maxAttempts,
  cooldownEnds,
  onRetry,
  className,
}: RetryPromptProps) {
  const attemptsRemaining = maxAttempts - attemptsUsed
  const isLastAttempt = attemptsRemaining === 1
  const [timeRemaining, setTimeRemaining] = React.useState<string | null>(null)

  // Calculate cooldown time remaining
  React.useEffect(() => {
    if (!cooldownEnds) {
      setTimeRemaining(null)
      return
    }

    const calculateRemaining = () => {
      const now = new Date()
      const diff = cooldownEnds.getTime() - now.getTime()
      
      if (diff <= 0) {
        setTimeRemaining(null)
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`)
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`)
      } else {
        setTimeRemaining(`${seconds}s`)
      }
    }

    calculateRemaining()
    const interval = setInterval(calculateRemaining, 1000)
    return () => clearInterval(interval)
  }, [cooldownEnds])

  const isOnCooldown = timeRemaining !== null

  return (
    <Card className={cn(
      'border-2',
      isLastAttempt ? 'border-amber-500/50 bg-amber-500/5' : 'border-primary/50 bg-primary/5',
      className
    )}>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Icon & Attempts */}
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0',
              isLastAttempt ? 'bg-amber-500/10' : 'bg-primary/10'
            )}>
              <RefreshCw className={cn(
                'w-7 h-7',
                isLastAttempt ? 'text-amber-500' : 'text-primary'
              )} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {isLastAttempt ? 'Final Attempt' : 'Re-submit Available'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={cn(
                  isLastAttempt 
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                    : 'bg-primary/10 text-primary'
                )}>
                  {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
                </Badge>
                {isLastAttempt && (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1 hidden sm:block" />

          {/* Action Area */}
          <div className="flex flex-col items-stretch sm:items-end gap-2">
            {isOnCooldown ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Cooldown: {timeRemaining}</span>
              </div>
            ) : (
              <Button 
                onClick={onRetry}
                className={cn(
                  'gap-2',
                  isLastAttempt && 'bg-amber-500 hover:bg-amber-600'
                )}
              >
                <RefreshCw className="w-4 h-4" />
                Submit Again
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
            <p className="text-xs text-muted-foreground text-right">
              {isLastAttempt 
                ? 'Review feedback carefully before your final submission'
                : 'Address the feedback and re-submit your deliverables'}
            </p>
          </div>
        </div>

        {/* Warning for last attempt */}
        {isLastAttempt && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Warning:</strong> This is your final attempt. If this submission does not meet the criteria, the milestone will be marked as failed and may trigger a dispute resolution process.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
