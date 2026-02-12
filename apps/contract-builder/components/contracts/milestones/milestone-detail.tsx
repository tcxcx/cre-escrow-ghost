'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  ArrowLeft,
  Upload,
  FileText,
  Link2,
  X,
  Check,
  AlertCircle,
  Clock,
  Loader2,
  Lightbulb,
  ExternalLink,
  Target,
  Calendar,
  Wallet,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { useActiveContractStore } from '@/lib/active-contract-store'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { useDropzone } from 'react-dropzone'
import type { MilestoneStatus, AIVerificationReport } from '@/types/contracts'

interface MilestoneDetailProps {
  contractId: string
  milestoneId: string
}

const statusColors: Record<MilestoneStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  active: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  submitted: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  verifying: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
  released: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  disputed: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
}

export function MilestoneDetail({ contractId, milestoneId }: MilestoneDetailProps) {
  const {
    contract,
    loading,
    currentUserRole,
    fetchContract,
    submitDeliverable,
    submissionState,
    submissionProgress,
    resetSubmissionState,
  } = useActiveContractStore()

  const [showSubmitPanel, setShowSubmitPanel] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [links, setLinks] = useState<{ url: string; valid: boolean }[]>([])
  const [notes, setNotes] = useState('')
  const [checklist, setChecklist] = useState({
    allDeliverables: false,
    understandAttempt: false,
    reviewedFeedback: false,
  })

  useEffect(() => {
    fetchContract(contractId)
  }, [contractId, fetchContract])

  const milestone = contract?.milestones.find(m => m.id === milestoneId)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/zip': ['.zip'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const addLink = () => {
    setLinks(prev => [...prev, { url: '', valid: false }])
  }

  const updateLink = (index: number, url: string) => {
    setLinks(prev => prev.map((link, i) => {
      if (i === index) {
        const valid = url.includes('figma.com') || url.includes('github.com') || url.includes('notion.so') || url.startsWith('https://')
        return { url, valid }
      }
      return link
    }))
  }

  const removeLink = (index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index))
  }

  const canSubmit = () => {
    const hasFiles = files.length > 0 || links.some(l => l.valid)
    const checklistComplete = checklist.allDeliverables && checklist.understandAttempt && (milestone?.currentAttempt === 0 || checklist.reviewedFeedback)
    return hasFiles && checklistComplete && submissionState === 'idle'
  }

  const handleSubmit = async () => {
    if (!milestone) return
    await submitDeliverable(
      milestone.id,
      files,
      links.filter(l => l.valid).map(l => l.url),
      notes || undefined
    )
  }

useEffect(() => {
    if (submissionState === 'success' && contract && milestone) {
      setShowSubmitPanel(false)
      setFiles([])
      setLinks([])
      setNotes('')
      setChecklist({ allDeliverables: false, understandAttempt: false, reviewedFeedback: false })
      resetSubmissionState()
      // Navigate to verification page after successful submission
      window.location.href = `/contracts/${contract.id}/milestones/${milestone.id}/verification`
    }
  }, [submissionState, resetSubmissionState, contract, milestone])

  if (loading || !contract || !milestone) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading milestone...</div>
      </div>
    )
  }

  const previousSubmission = milestone.submissions[milestone.submissions.length - 1]
  const previousReport = previousSubmission?.verificationReport
  const isPayee = currentUserRole === 'payee'
  const canSubmitDeliverable = isPayee && (milestone.status === 'active' || milestone.status === 'rejected')
  const attemptsRemaining = milestone.maxRetries - milestone.currentAttempt

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <Link
            href={`/contracts/${contractId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Contract
          </Link>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-6">
        {/* Milestone Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold">Milestone {milestone.orderIndex + 1}: {milestone.name}</h1>
              <Badge variant="outline" className={cn('text-xs', statusColors[milestone.status])}>
                {milestone.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{milestone.description}</p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">${milestone.amount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">USDC</div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                Due Date
              </div>
              <div className="font-medium">
                {milestone.dueDate ? format(milestone.dueDate, 'MMM d, yyyy') : 'No deadline'}
              </div>
              {milestone.dueDate && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(milestone.dueDate, { addSuffix: true })}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Target className="w-4 h-4" />
                Attempts
              </div>
              <div className="font-medium">
                {milestone.currentAttempt} of {milestone.maxRetries}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {attemptsRemaining} remaining
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Wallet className="w-4 h-4" />
                Payment
              </div>
              <div className="font-medium">{milestone.percentage}% of total</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                ${milestone.amount.toLocaleString()} USDC
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Verification Criteria */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              AI Verification Criteria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg border border-border">
              "{milestone.verificationCriteria}"
            </p>
          </CardContent>
        </Card>

        {/* Required Deliverables */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Required Deliverables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {milestone.requiredDeliverables.map((del) => (
                <div
                  key={del.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border"
                >
                  <div className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center',
                    del.required ? 'border-primary' : 'border-muted-foreground'
                  )}>
                    {milestone.status === 'released' && <Check className="w-3 h-3 text-emerald-500" />}
                  </div>
                  <span className="text-sm flex-1">{del.description}</span>
                  <Badge variant="outline" className="text-xs">
                    {del.type.toUpperCase()}
                  </Badge>
                  {del.required && (
                    <span className="text-xs text-muted-foreground">Required</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Previous Submission Feedback (if rejected) */}
        {milestone.status === 'rejected' && previousReport && (
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-amber-500">
                <AlertCircle className="w-4 h-4" />
                Previous Submission Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Your previous submission was rejected. Here's what to improve:
              </p>
              
              {/* Criteria Results */}
              <div className="space-y-2 mb-4">
                {previousReport.criteriaResults.map((result, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex items-start gap-2 p-2 rounded-lg',
                      result.status === 'pass' && 'bg-emerald-500/10',
                      result.status === 'fail' && 'bg-red-500/10',
                      result.status === 'partial' && 'bg-amber-500/10'
                    )}
                  >
                    {result.status === 'pass' && <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />}
                    {result.status === 'fail' && <XCircle className="w-4 h-4 text-red-500 mt-0.5" />}
                    {result.status === 'partial' && <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />}
                    <div>
                      <p className="text-sm font-medium">{result.criterion}</p>
                      <p className="text-xs text-muted-foreground">{result.finding}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Suggestions */}
              {previousReport.suggestions && previousReport.suggestions.length > 0 && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
                    <Lightbulb className="w-4 h-4" />
                    AI Suggestions
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {previousReport.suggestions.map((suggestion, index) => (
                      <li key={index}>{index + 1}. {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Verification Progress (if verifying) */}
        {milestone.status === 'verifying' && (
          <Card className="mb-6 border-purple-500/30 bg-purple-500/5">
            <CardContent className="py-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-4">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold mb-1">AI Verification In Progress</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Analyzing your deliverables against the criteria...
                </p>
                <Progress value={65} className="max-w-xs mx-auto h-2 mb-4" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <Check className="w-3 h-3 text-emerald-500" />
                    Files uploaded to IPFS
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Check className="w-3 h-3 text-emerald-500" />
                    Submission recorded on-chain
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Analyzing deliverables...
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approved State */}
        {milestone.status === 'approved' && (
          <Card className="mb-6 border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="py-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
                  <Check className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Verification Passed!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Payment of ${milestone.amount.toLocaleString()} USDC is being released.
                </p>
                <Progress value={100} className="max-w-xs mx-auto h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Released State */}
        {milestone.status === 'released' && previousReport && (
          <Card className="mb-6 border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10">
                  <Check className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Milestone Complete</h3>
                  <p className="text-sm text-muted-foreground">
                    ${milestone.amount.toLocaleString()} USDC released | Confidence: {previousReport.confidence}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Button */}
        {canSubmitDeliverable && (
          <Card>
            <CardContent className="py-6">
              <Button className="w-full h-12" onClick={() => setShowSubmitPanel(true)}>
                <Upload className="w-5 h-5 mr-2" />
                {milestone.status === 'rejected' ? 'Resubmit Deliverable' : 'Submit Deliverable'}
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-2">
                Attempt {milestone.currentAttempt + 1} of {milestone.maxRetries} | {attemptsRemaining} attempts remaining
              </p>
            </CardContent>
          </Card>
        )}

        {/* Submission History */}
        {milestone.submissions.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Submission History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {milestone.submissions.slice().reverse().map((submission, index) => (
                  <div
                    key={submission.id}
                    className="p-4 rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Attempt {submission.attemptNumber}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(submission.submittedAt, 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          submission.status === 'approved' && 'text-emerald-500 border-emerald-500/30',
                          submission.status === 'rejected' && 'text-red-500 border-red-500/30',
                          submission.status === 'verifying' && 'text-purple-500 border-purple-500/30'
                        )}
                      >
                        {submission.status.toUpperCase()}
                      </Badge>
                      {submission.verificationReport && (
                        <span className="text-xs text-muted-foreground">
                          Confidence: {submission.verificationReport.confidence}%
                        </span>
                      )}
                    </div>
                    {submission.notes && (
                      <p className="text-sm text-muted-foreground mt-2">"{submission.notes}"</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Submission Sheet */}
      <Sheet open={showSubmitPanel} onOpenChange={setShowSubmitPanel}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Submit Deliverable</span>
              <span className="text-sm font-normal text-muted-foreground">
                Attempt {milestone.currentAttempt + 1}/{milestone.maxRetries}
              </span>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Previous Feedback (if retry) */}
            {milestone.currentAttempt > 0 && previousReport && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-500 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Previous Feedback
                </div>
                <p className="text-sm text-muted-foreground">{previousReport.summary}</p>
              </div>
            )}

            {/* File Upload */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Deliverables
              </h3>
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                  isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                )}
              >
                <input {...getInputProps()} />
                <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop files here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports: PDF, PNG, JPG, ZIP (max 50MB)
                </p>
              </div>

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Links */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Add Links
              </h3>
              <div className="space-y-2">
                {links.map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="https://figma.com/file/..."
                      value={link.url}
                      onChange={(e) => updateLink(index, e.target.value)}
                      className={cn(link.valid && 'border-emerald-500')}
                    />
                    {link.valid && <Check className="w-4 h-4 text-emerald-500" />}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => removeLink(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addLink}>
                  + Add Link
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-sm font-medium mb-3">Notes (optional)</h3>
              <Textarea
                placeholder="Add any additional context about your submission..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Checklist */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
              <h3 className="text-sm font-medium">Confirmation Checklist</h3>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={checklist.allDeliverables}
                  onCheckedChange={(checked) =>
                    setChecklist(prev => ({ ...prev, allDeliverables: checked === true }))
                  }
                />
                <span className="text-sm">I confirm all required deliverables are included</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={checklist.understandAttempt}
                  onCheckedChange={(checked) =>
                    setChecklist(prev => ({ ...prev, understandAttempt: checked === true }))
                  }
                />
                <span className="text-sm">
                  I understand this is attempt {milestone.currentAttempt + 1} of {milestone.maxRetries}
                </span>
              </label>
              {milestone.currentAttempt > 0 && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={checklist.reviewedFeedback}
                    onCheckedChange={(checked) =>
                      setChecklist(prev => ({ ...prev, reviewedFeedback: checked === true }))
                    }
                  />
                  <span className="text-sm">I have reviewed the AI feedback from my previous submission</span>
                </label>
              )}
            </div>

            {/* Submit Button */}
            <div className="space-y-3">
              <Button
                className="w-full"
                disabled={!canSubmit()}
                onClick={handleSubmit}
              >
                {submissionState === 'uploading' && (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading... {submissionProgress}%
                  </>
                )}
                {submissionState === 'submitting' && (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                )}
                {submissionState === 'idle' && 'Submit for AI Verification'}
              </Button>
              <p className="text-center text-xs text-amber-500">
                You have {attemptsRemaining - 1} attempts remaining after this submission
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
