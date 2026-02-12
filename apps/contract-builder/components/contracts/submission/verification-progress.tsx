'use client'

import React, { useEffect, useState } from 'react'
import {
  Upload,
  FileSearch,
  Brain,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export type VerificationStep = 
  | 'uploading'
  | 'analyzing'
  | 'verifying'
  | 'complete'
  | 'failed'

interface VerificationProgressProps {
  currentStep: VerificationStep
  progress?: number // 0-100, used for uploading step
  error?: string
  className?: string
}

const steps = [
  {
    id: 'uploading',
    label: 'Uploading Files',
    description: 'Securely uploading to IPFS...',
    icon: Upload,
  },
  {
    id: 'analyzing',
    label: 'Analyzing Deliverables',
    description: 'AI is examining your submission...',
    icon: FileSearch,
  },
  {
    id: 'verifying',
    label: 'Running Verification',
    description: 'Checking against milestone criteria...',
    icon: Brain,
  },
  {
    id: 'complete',
    label: 'Verification Complete',
    description: 'Results are ready',
    icon: CheckCircle2,
  },
]

const stepOrder: VerificationStep[] = ['uploading', 'analyzing', 'verifying', 'complete']

export function VerificationProgress({
  currentStep,
  progress = 0,
  error,
  className,
}: VerificationProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const currentStepIndex = stepOrder.indexOf(currentStep === 'failed' ? 'complete' : currentStep)
  const isFailed = currentStep === 'failed'

  // Animate progress bar
  useEffect(() => {
    const overallProgress = 
      currentStep === 'uploading' ? progress * 0.25 :
      currentStep === 'analyzing' ? 25 + (progress || 50) * 0.25 :
      currentStep === 'verifying' ? 50 + (progress || 50) * 0.25 :
      currentStep === 'complete' || currentStep === 'failed' ? 100 : 0

    const timer = setTimeout(() => {
      setAnimatedProgress(overallProgress)
    }, 100)

    return () => clearTimeout(timer)
  }, [currentStep, progress])

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">AI Verification</span>
            </div>
            <span className={cn(
              'text-sm font-medium',
              isFailed ? 'text-destructive' : 'text-primary'
            )}>
              {isFailed ? 'Failed' : `${Math.round(animatedProgress)}%`}
            </span>
          </div>
          <Progress 
            value={animatedProgress} 
            className={cn('h-2', isFailed && '[&>div]:bg-destructive')} 
          />
        </div>

        {/* Step Indicators */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep || (isFailed && step.id === 'complete')
            const isComplete = index < currentStepIndex
            const isPending = index > currentStepIndex
            const StepIcon = step.icon

            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-lg transition-all',
                  isActive && !isFailed && 'bg-primary/5 ring-1 ring-primary/20',
                  isActive && isFailed && 'bg-destructive/5 ring-1 ring-destructive/20',
                  isComplete && 'opacity-60'
                )}
              >
                {/* Step Icon */}
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
                  isComplete && 'bg-emerald-500/10',
                  isActive && !isFailed && 'bg-primary/10',
                  isActive && isFailed && 'bg-destructive/10',
                  isPending && 'bg-muted'
                )}>
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : isActive && isFailed ? (
                    <XCircle className="w-5 h-5 text-destructive" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <StepIcon className={cn(
                      'w-5 h-5',
                      isPending ? 'text-muted-foreground' : 'text-primary'
                    )} />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    isComplete && 'text-muted-foreground',
                    isActive && !isFailed && 'text-foreground',
                    isActive && isFailed && 'text-destructive',
                    isPending && 'text-muted-foreground'
                  )}>
                    {isFailed && step.id === 'complete' ? 'Verification Failed' : step.label}
                  </p>
                  <p className={cn(
                    'text-xs',
                    isActive ? 'text-muted-foreground' : 'text-muted-foreground/60'
                  )}>
                    {isFailed && step.id === 'complete' && error 
                      ? error 
                      : step.description}
                  </p>
                </div>

                {/* Status Badge */}
                {isComplete && (
                  <span className="text-xs text-emerald-500 font-medium">Done</span>
                )}
                {isActive && !isFailed && (
                  <span className="text-xs text-primary font-medium animate-pulse">Processing</span>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
