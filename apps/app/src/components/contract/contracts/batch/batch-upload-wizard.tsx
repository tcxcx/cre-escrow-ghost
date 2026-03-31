'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, MessageSquare } from 'lucide-react'
import { Button } from '@bu/ui/button'
import { cn } from '@bu/ui/cn'
import { useBatchStore } from '@/lib/batch-store'
import { BatchStepper } from './batch-stepper'
import { StepUpload } from './step-upload'
import { StepMapping } from './step-mapping'
import { StepReview } from './step-review'
import { StepConfirm } from './step-confirm'
import { AiChatInput } from './ai-chat-input'
import { buildRecipients } from '@/lib/batch-store'
import type { BatchUploadStep } from '@/types/batch'
import { BUFI_CONTRACT_FIELDS } from '@/types/batch'

const STEP_ORDER: BatchUploadStep[] = ['upload', 'mapping', 'review', 'confirm']

export function BatchUploadWizard() {
  const router = useRouter()
  const {
    step,
    setStep,
    inputMode,
    setInputMode,
    parsedCsv,
    mappings,
    recipients,
    setRecipients,
    reset,
  } = useBatchStore()

  const currentIndex = STEP_ORDER.indexOf(step)

  // Check if required fields are mapped for advancing from mapping step
  const usedFields = new Set(mappings.filter((m) => m.bufiField !== 'skip').map((m) => m.bufiField))
  const requiredMapped = BUFI_CONTRACT_FIELDS.filter((f) => f.required).every((f) =>
    usedFields.has(f.key)
  )

  const canAdvance = (): boolean => {
    switch (step) {
      case 'upload':
        return !!parsedCsv || inputMode === 'ai-chat'
      case 'mapping':
        return requiredMapped
      case 'review':
        return recipients.length > 0
      case 'confirm':
        return false // no next from confirm
      default:
        return false
    }
  }

  const handleNext = () => {
    if (step === 'mapping' && parsedCsv) {
      const built = buildRecipients(parsedCsv, mappings)
      setRecipients(built)
    }
    const nextIndex = currentIndex + 1
    if (nextIndex < STEP_ORDER.length) {
      setStep(STEP_ORDER[nextIndex])
    }
  }

  const handleBack = () => {
    const prevIndex = currentIndex - 1
    if (prevIndex >= 0) {
      setStep(STEP_ORDER[prevIndex])
    }
  }

  const handleCancel = () => {
    reset()
    router.push('/builder')
  }

  return (
    <div className="min-h-screen bg-secondary/50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ── Top bar: breadcrumb ── */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <button
            type="button"
            onClick={() => router.push('/builder')}
            className="hover:text-foreground transition-colors"
          >
            Contract Builder
          </button>
          <span className="text-muted-foreground/50">{'>'}</span>
          <span className="text-foreground font-medium">Batch Upload</span>
        </div>

        {/* ── Main card ── */}
        <div className="rounded-2xl border border-border bg-background shadow-sm">
          {/* Header: Cancel / Title / Next */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={currentIndex > 0 ? handleBack : handleCancel}
              className="bg-transparent"
            >
              {currentIndex > 0 ? 'Back' : 'Cancel'}
            </Button>

            <h1 className="text-base font-semibold text-foreground">
              {step === 'confirm' ? 'Confirm & Send' : 'Upload Contracts'}
            </h1>

            {step !== 'confirm' ? (
              <Button
                size="sm"
                onClick={handleNext}
                disabled={!canAdvance()}
              >
                Next
              </Button>
            ) : (
              <div className="w-[60px]" /> /* spacer */
            )}
          </div>

          {/* Stepper */}
          <div className="px-6 pt-5 pb-2">
            <BatchStepper currentStep={step} />
          </div>

          {/* ── Input mode toggle (only on upload step) ── */}
          {step === 'upload' && (
            <div className="px-6 pt-4">
              <div className="flex rounded-lg border border-border bg-muted/30 p-1">
                <button
                  type="button"
                  onClick={() => setInputMode('csv')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    inputMode === 'csv'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV Upload
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('ai-chat')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    inputMode === 'ai-chat'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  AI Chat Input
                </button>
              </div>
            </div>
          )}

          {/* ── Step content ── */}
          <div className="px-6 py-6">
            {step === 'upload' && (
              inputMode === 'csv' ? <StepUpload /> : <AiChatInput />
            )}
            {step === 'mapping' && <StepMapping />}
            {step === 'review' && <StepReview />}
            {step === 'confirm' && <StepConfirm />}
          </div>
        </div>
      </div>
    </div>
  )
}
