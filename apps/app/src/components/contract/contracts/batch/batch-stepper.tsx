'use client'

import { Check } from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { BATCH_STEPS, type BatchUploadStep } from '@/types/batch'

interface BatchStepperProps {
  currentStep: BatchUploadStep
}

export function BatchStepper({ currentStep }: BatchStepperProps) {
  const currentIndex = BATCH_STEPS.findIndex((s) => s.key === currentStep)

  return (
    <div className="flex items-center justify-center">
      {BATCH_STEPS.map((step, i) => {
        const isComplete = i < currentIndex
        const isCurrent = i === currentIndex
        const isFuture = i > currentIndex

        return (
          <div key={step.key} className="flex items-center">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all',
                  isComplete && 'bg-emerald-500 text-background',
                  isCurrent &&
                    'bg-foreground text-background',
                  isFuture &&
                    'border-2 border-border text-muted-foreground bg-background'
                )}
              >
                {isComplete ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  'text-xs whitespace-nowrap',
                  isCurrent
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < BATCH_STEPS.length - 1 && (
              <div
                className={cn(
                  'w-24 h-px mx-4 mb-6',
                  i < currentIndex ? 'bg-emerald-500' : 'bg-border'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
