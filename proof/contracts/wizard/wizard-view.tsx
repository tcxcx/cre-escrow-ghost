'use client'

import { WizardLayout } from './wizard-layout'
import { useWizardFlow } from '@/hooks/use-wizard-flow'
import {
  WizardStepParties,
  WizardStepMilestones,
  WizardStepEscrow,
  WizardStepReview,
  WizardStepSign,
} from './wizard-steps'

export function WizardView() {
  const { currentStep } = useWizardFlow()

  return (
    <WizardLayout>
      {currentStep === 'parties' && <WizardStepParties />}
      {currentStep === 'milestones' && <WizardStepMilestones />}
      {currentStep === 'escrow' && <WizardStepEscrow />}
      {currentStep === 'review' && <WizardStepReview />}
      {currentStep === 'sign' && <WizardStepSign />}
    </WizardLayout>
  )
}
