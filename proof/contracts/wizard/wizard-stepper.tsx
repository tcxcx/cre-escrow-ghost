'use client'

import { cn } from '@bu/ui/cn'
import { Check } from 'lucide-react'
import { useWizardFlow } from '@/hooks/use-wizard-flow'
import type { WizardStep } from '@/lib/contract-store'

export function WizardStepper() {
  const { steps, currentStep, completedSteps, goToStep } = useWizardFlow()

  return (
    <div className="flex items-center gap-2 px-6 py-4">
      {steps.map((step, index) => {
        const isActive = step.key === currentStep
        const isCompleted = completedSteps.has(step.key)
        const isClickable = isCompleted || step.key === currentStep

        return (
          <div key={step.key} className="flex items-center gap-2">
            {index > 0 && (
              <div
                className={cn(
                  'h-px w-6 transition-colors',
                  isCompleted ? 'bg-vverde' : 'bg-borderFine dark:bg-darkBorder',
                )}
              />
            )}
            <button
              type="button"
              onClick={() => isClickable && goToStep(step.key)}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                'disabled:cursor-not-allowed disabled:opacity-50',
                isActive && 'bg-violet-100 text-purpleDanis dark:bg-violet-950 dark:text-violet-300',
                isCompleted &&
                  !isActive &&
                  'bg-emerald-50 text-vverde dark:bg-emerald-950 dark:text-emerald-400 cursor-pointer',
                !isActive &&
                  !isCompleted &&
                  'bg-transparent text-purpleDanis dark:text-gray-500',
              )}
            >
              <StepIndicator
                step={step.key}
                number={step.number}
                isActive={isActive}
                isCompleted={isCompleted}
              />
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

function StepIndicator({
  number,
  isActive,
  isCompleted,
}: {
  step: WizardStep
  number: number
  isActive: boolean
  isCompleted: boolean
}) {
  if (isCompleted && !isActive) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-vverde text-white">
        <Check className="h-3.5 w-3.5" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
        isActive
          ? 'bg-purpleDanis text-white'
          : 'border border-borderFine text-purpleDanis dark:border-darkBorder dark:text-gray-500',
      )}
    >
      {number}
    </div>
  )
}
