'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Scale,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  X,
  Shield,
  Users,
  File,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type AppealReason =
  | 'ai-incorrect-fail'
  | 'ai-incorrect-pass'
  | 'criteria-misunderstood'
  | 'technical-error'
  | 'other'

type AppealStep = 'reason' | 'evidence' | 'review' | 'submitted'

interface HumanAppealModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  milestoneId: string
  milestoneName: string
  currentVerdict: 'passed' | 'failed'
  attemptNumber: number
}

const appealReasons: { value: AppealReason; label: string; description: string }[] = [
  {
    value: 'ai-incorrect-fail',
    label: 'AI incorrectly failed my deliverable',
    description: 'I believe the deliverables meet all criteria but the AI marked them as failing.',
  },
  {
    value: 'ai-incorrect-pass',
    label: 'AI incorrectly passed the deliverable',
    description: 'The deliverables do not actually meet the agreed criteria.',
  },
  {
    value: 'criteria-misunderstood',
    label: 'AI misunderstood the criteria',
    description: 'The acceptance criteria were interpreted differently than what was agreed.',
  },
  {
    value: 'technical-error',
    label: 'Technical error during verification',
    description: 'Files were not processed correctly or there was a system error.',
  },
  {
    value: 'other',
    label: 'Other reason',
    description: 'My concern is not covered by the above options.',
  },
]

export function HumanAppealModal({
  open,
  onOpenChange,
  contractId,
  milestoneId,
  milestoneName,
  currentVerdict,
  attemptNumber,
}: HumanAppealModalProps) {
  const [step, setStep] = useState<AppealStep>('reason')
  const [reason, setReason] = useState<AppealReason | null>(null)
  const [explanation, setExplanation] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [acknowledged, setAcknowledged] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setStep('reason')
    setReason(null)
    setExplanation('')
    setFiles([])
    setAcknowledged(false)
    setIsSubmitting(false)
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleFileSelect = (fileList: FileList | null) => {
    if (!fileList) return
    const validFiles = Array.from(fileList).filter((f) => {
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 25MB limit`)
        return false
      }
      return true
    })
    setFiles((prev) => [...prev, ...validFiles].slice(0, 10))
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setStep('submitted')
    setIsSubmitting(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const stepLabels = ['Select Reason', 'Provide Evidence', 'Review & Submit']
  const currentStepIndex = step === 'reason' ? 0 : step === 'evidence' ? 1 : step === 'review' ? 2 : 3

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {step !== 'submitted' && (
          <DialogHeader className="flex-shrink-0 p-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-amber-500" />
              Request Human Review
            </DialogTitle>
            <DialogDescription>
              Appeal the AI verification decision for "{milestoneName}"
            </DialogDescription>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mt-4">
              {stepLabels.map((label, i) => (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div
                    className={cn(
                      'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0',
                      i < currentStepIndex
                        ? 'bg-primary text-primary-foreground'
                        : i === currentStepIndex
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {i < currentStepIndex ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs hidden sm:inline',
                      i === currentStepIndex ? 'text-foreground font-medium' : 'text-muted-foreground',
                    )}
                  >
                    {label}
                  </span>
                  {i < stepLabels.length - 1 && (
                    <div className="flex-1 h-px bg-border" />
                  )}
                </div>
              ))}
            </div>
          </DialogHeader>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
          {/* Step 1: Reason */}
          {step === 'reason' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Current verdict:</span>
                  <Badge variant={currentVerdict === 'passed' ? 'default' : 'destructive'}>
                    {currentVerdict === 'passed' ? 'PASSED' : 'FAILED'}
                  </Badge>
                  <span className="text-muted-foreground">| Attempt {attemptNumber}</span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Why are you requesting a human review?</Label>
                <RadioGroup
                  value={reason || ''}
                  onValueChange={(val) => setReason(val as AppealReason)}
                  className="mt-3 space-y-3"
                >
                  {appealReasons.map((r) => (
                    <label
                      key={r.value}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        reason === r.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30 hover:bg-muted/50',
                      )}
                    >
                      <RadioGroupItem value={r.value} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{r.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 2: Evidence */}
          {step === 'evidence' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="explanation" className="text-sm font-medium">
                  Explain your appeal <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">
                  Provide a clear explanation of why you believe the AI decision is incorrect. Be specific about which criteria you disagree with.
                </p>
                <Textarea
                  id="explanation"
                  placeholder="Explain in detail why you believe the verification result is incorrect..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {explanation.length}/2000
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Supporting Evidence (Optional)</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">
                  Upload screenshots, documents, or other evidence that supports your appeal.
                </p>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  onClick={() => document.getElementById('appeal-file-input')?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      document.getElementById('appeal-file-input')?.click()
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <input
                    id="appeal-file-input"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                  <Upload className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload evidence files</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Up to 10 files, 25MB each</p>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {files.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border"
                      >
                        <File className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFile(index)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Reason</p>
                  <p className="text-sm font-medium">
                    {appealReasons.find((r) => r.value === reason)?.label}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Explanation</p>
                  <p className="text-sm">{explanation}</p>
                </div>
                {files.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Evidence Files</p>
                    <p className="text-sm">{files.length} file(s) attached</p>
                  </div>
                )}
              </div>

              {/* What happens next */}
              <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  What happens next?
                </h4>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 text-xs font-medium shrink-0 mt-0.5">1</span>
                    Your appeal is assigned to a certified human arbitrator within 24 hours
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 text-xs font-medium shrink-0 mt-0.5">2</span>
                    The arbitrator reviews the deliverables, criteria, and your evidence
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 text-xs font-medium shrink-0 mt-0.5">3</span>
                    Both parties are notified and can submit additional context
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 text-xs font-medium shrink-0 mt-0.5">4</span>
                    The human decision is final and overrides the AI verdict
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 text-xs font-medium shrink-0 mt-0.5">5</span>
                    Escrow funds remain locked until the resolution is issued
                  </li>
                </ol>
              </div>

              {/* Acknowledgement */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                <Checkbox
                  id="acknowledge"
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor="acknowledge" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                  I understand that a human arbitrator will review this appeal and their decision is final. Both parties will have the opportunity to provide additional context during the review process.
                </label>
              </div>
            </div>
          )}

          {/* Step 4: Submitted */}
          {step === 'submitted' && (
            <div className="text-center py-8">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">Appeal Submitted</h2>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Your request for human review has been submitted. A certified arbitrator will be assigned within 24 hours.
              </p>

              <div className="p-4 rounded-lg border border-border bg-muted/30 text-left max-w-sm mx-auto space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Appeal ID</span>
                  <span className="font-mono font-medium">APL-{contractId.slice(0, 4).toUpperCase()}-{Date.now().toString().slice(-4)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending Assignment</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expected Response</span>
                  <span>Within 24-48 hours</span>
                </div>
              </div>

              <div className="flex gap-3 justify-center mt-6">
                <Button variant="outline" className="bg-transparent" onClick={handleClose}>
                  Close
                </Button>
                <Button onClick={() => {
                  handleClose()
                  window.location.href = `/contracts/${contractId}`
                }}>
                  Go to Contract
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'submitted' && (
          <DialogFooter className="flex-shrink-0 px-6 py-4 border-t border-border/50 bg-background">
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                onClick={() => {
                  if (step === 'reason') handleClose()
                  else if (step === 'evidence') setStep('reason')
                  else if (step === 'review') setStep('evidence')
                }}
              >
                {step === 'reason' ? 'Cancel' : 'Back'}
              </Button>
              <Button
                onClick={() => {
                  if (step === 'reason') setStep('evidence')
                  else if (step === 'evidence') setStep('review')
                  else handleSubmit()
                }}
                disabled={
                  (step === 'reason' && !reason) ||
                  (step === 'evidence' && explanation.trim().length < 20) ||
                  (step === 'review' && !acknowledged) ||
                  isSubmitting
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : step === 'review' ? (
                  <>
                    <Scale className="h-4 w-4 mr-2" />
                    Submit Appeal
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
