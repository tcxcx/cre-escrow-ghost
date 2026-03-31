'use client'

import { useCallback, useMemo } from 'react'
import { useContractStore, WIZARD_STEPS, type WizardStep } from '@/lib/contract-store'

const STEP_ORDER: WizardStep[] = WIZARD_STEPS.map((s) => s.key)

export function useWizardFlow() {
  const currentStep = useContractStore((s) => s.currentStep)
  const completedSteps = useContractStore((s) => s.completedSteps)
  const wizardMode = useContractStore((s) => s.wizardMode)
  const setCurrentStep = useContractStore((s) => s.setCurrentStep)
  const markStepCompleted = useContractStore((s) => s.markStepCompleted)
  const nodes = useContractStore((s) => s.nodes)
  const settings = useContractStore((s) => s.settings)

  const currentIndex = STEP_ORDER.indexOf(currentStep)

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'template':
        return true // always completable — template is pre-selected
      case 'parties': {
        const payers = nodes.filter((n) => n.type === 'party-payer')
        const payees = nodes.filter((n) => n.type === 'party-payee')
        return payers.length >= 1 && payees.length >= 1
      }
      case 'milestones': {
        const milestones = nodes.filter((n) => n.type === 'milestone')
        return milestones.length >= 1
      }
      case 'escrow':
        return !!settings.chain && !!settings.currency
      case 'review':
        return true // review is always passable
      case 'sign':
        return true // sign is the final step
      default:
        return false
    }
  }, [currentStep, nodes, settings])

  const isFirstStep = currentIndex <= 1 // 'parties' is the effective first step
  const isLastStep = currentIndex === STEP_ORDER.length - 1

  const goNext = useCallback(() => {
    if (!canProceed || isLastStep) return
    markStepCompleted(currentStep)
    const nextStep = STEP_ORDER[currentIndex + 1]
    if (nextStep) setCurrentStep(nextStep)
  }, [canProceed, isLastStep, currentStep, currentIndex, markStepCompleted, setCurrentStep])

  const goBack = useCallback(() => {
    if (isFirstStep) return
    const prevStep = STEP_ORDER[currentIndex - 1]
    // Don't go back to template step
    if (prevStep && prevStep !== 'template') setCurrentStep(prevStep)
  }, [isFirstStep, currentIndex, setCurrentStep])

  const goToStep = useCallback(
    (step: WizardStep) => {
      const targetIndex = STEP_ORDER.indexOf(step)
      if (step === 'template') return // can't go back to template
      // Can only go to completed steps or the next uncompleted one
      if (completedSteps.has(step) || targetIndex <= currentIndex) {
        setCurrentStep(step)
      }
    },
    [completedSteps, currentIndex, setCurrentStep],
  )

  return {
    currentStep,
    currentIndex,
    completedSteps,
    wizardMode,
    canProceed,
    isFirstStep,
    isLastStep,
    steps: WIZARD_STEPS,
    goNext,
    goBack,
    goToStep,
  }
}
