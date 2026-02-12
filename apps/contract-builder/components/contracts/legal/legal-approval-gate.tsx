'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Scale,
  Send,
  Loader2,
  Eye,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChecklistItem {
  id: string
  label: string
  status: 'complete' | 'incomplete' | 'warning'
  detail?: string
}

interface LegalReviewer {
  id: string
  name: string
  email: string
  avatar?: string
}

interface LegalApprovalGateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: () => void
  checklist: ChecklistItem[]
  openCommentsCount: number
  legalReviewers?: LegalReviewer[]
  onViewComments?: () => void
}

export function LegalApprovalGate({
  open,
  onOpenChange,
  onSend,
  checklist,
  openCommentsCount,
  legalReviewers = [],
  onViewComments,
}: LegalApprovalGateProps) {
  const [legalReviewOption, setLegalReviewOption] = useState<'skip' | 'request'>('skip')
  const [selectedReviewer, setSelectedReviewer] = useState<string>('')
  const [finalAcknowledged, setFinalAcknowledged] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const hasIncomplete = checklist.some((item) => item.status === 'incomplete')
  const hasOpenComments = openCommentsCount > 0
  const requiresLegalApproval = legalReviewOption === 'request'
  const canProceed = !hasIncomplete && finalAcknowledged && 
    (legalReviewOption === 'skip' || (legalReviewOption === 'request' && selectedReviewer))

  const handleSend = async () => {
    if (!canProceed) return
    setIsSending(true)
    await new Promise((r) => setTimeout(r, 1500))
    setIsSending(false)
    onSend()
    onOpenChange(false)
  }

  const getStatusIcon = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      case 'incomplete':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Send for Signatures
          </DialogTitle>
          <DialogDescription>
            Review the checklist before sending this contract
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Pre-send Checklist */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Pre-send Checklist</Label>
            <div className="space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border',
                    item.status === 'complete' && 'bg-emerald-500/5 border-emerald-500/20',
                    item.status === 'incomplete' && 'bg-red-500/5 border-red-500/20',
                    item.status === 'warning' && 'bg-amber-500/5 border-amber-500/20'
                  )}
                >
                  {getStatusIcon(item.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    {item.detail && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Open Comments Warning */}
          {hasOpenComments && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    {openCommentsCount} unresolved comment{openCommentsCount !== 1 ? 's' : ''} from reviewers
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    We recommend resolving all feedback before sending
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 bg-transparent border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                      onClick={onViewComments}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Comments
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-amber-600 dark:text-amber-400 bg-transparent"
                    >
                      Resolve & Continue
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Legal Review Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Legal Review</Label>
            <RadioGroup value={legalReviewOption} onValueChange={(v) => setLegalReviewOption(v as 'skip' | 'request')}>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                <RadioGroupItem value="skip" id="skip" className="mt-0.5" />
                <Label htmlFor="skip" className="flex-1 cursor-pointer">
                  <span className="text-sm font-medium text-foreground">Skip legal review</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    I accept responsibility for the contract contents
                  </p>
                </Label>
              </div>
              <div className={cn(
                'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                legalReviewers.length === 0 
                  ? 'border-border opacity-50 cursor-not-allowed' 
                  : 'border-border hover:border-primary/30'
              )}>
                <RadioGroupItem 
                  value="request" 
                  id="request" 
                  className="mt-0.5" 
                  disabled={legalReviewers.length === 0}
                />
                <Label htmlFor="request" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-foreground">Request approval from legal reviewer</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {legalReviewers.length === 0 
                      ? 'No legal reviewers in workspace — invite one first'
                      : 'Contract will be sent for approval before signatures'}
                  </p>
                </Label>
              </div>
            </RadioGroup>

            {legalReviewOption === 'request' && legalReviewers.length > 0 && (
              <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
                <SelectTrigger className="mt-2">
                  <User className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select reviewer..." />
                </SelectTrigger>
                <SelectContent>
                  {legalReviewers.map((reviewer) => (
                    <SelectItem key={reviewer.id} value={reviewer.id}>
                      <div className="flex items-center gap-2">
                        <span>{reviewer.name}</span>
                        <span className="text-xs text-muted-foreground">{reviewer.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Final Acknowledgment */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <Checkbox
                id="final-ack"
                checked={finalAcknowledged}
                onCheckedChange={(c) => setFinalAcknowledged(c === true)}
                className="mt-0.5"
              />
              <Label htmlFor="final-ack" className="text-sm cursor-pointer leading-relaxed">
                I have reviewed this contract and accept responsibility for its contents. I understand BUFI provides templates, not legal advice.
              </Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={!canProceed || isSending}>
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : requiresLegalApproval ? (
                <>
                  <Scale className="w-4 h-4 mr-2" />
                  Request Approval
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send for Signatures
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
