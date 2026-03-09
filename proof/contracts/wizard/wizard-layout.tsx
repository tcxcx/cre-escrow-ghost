'use client'

import { Button } from '@bu/ui/button'
import { ArrowLeft, ArrowRight, Send } from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { WizardStepper } from './wizard-stepper'
import { useWizardFlow } from '@/hooks/use-wizard-flow'

interface WizardLayoutProps {
  children: React.ReactNode
}

export function WizardLayout({ children }: WizardLayoutProps) {
  const { canProceed, isFirstStep, isLastStep, goNext, goBack, currentStep } = useWizardFlow()

  return (
    <div className="flex h-full flex-col bg-whiteDanis dark:bg-darkBg">
      {/* Stepper bar */}
      <div className="border-b border-borderFine dark:border-darkBorder bg-whiteDanis dark:bg-darkBg">
        <WizardStepper />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">{children}</div>
      </div>

      {/* Footer with navigation */}
      <div className="border-t border-borderFine dark:border-darkBorder bg-whiteDanis dark:bg-darkBg px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Button
            variant="glass"
            onClick={goBack}
            disabled={isFirstStep}
            className={cn(
              'gap-2 border-borderFine dark:border-darkBorder',
              isFirstStep && 'invisible',
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <span className="text-sm text-purpleDanis capitalize">{currentStep}</span>

          {isLastStep ? (
            <Button
              onClick={goNext}
              disabled={!canProceed}
              className="gap-2 bg-purpleDanis hover:bg-violeta text-white"
            >
              <Send className="h-4 w-4" />
              Send Contract
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canProceed}
              className="gap-2 bg-purpleDanis hover:bg-violeta text-white"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
