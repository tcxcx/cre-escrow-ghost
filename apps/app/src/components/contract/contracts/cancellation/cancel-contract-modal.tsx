'use client'

import { useState } from 'react'
import { Button } from '@bu/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@bu/ui/dialog'
import { Textarea } from '@bu/ui/textarea'
import { Label } from '@bu/ui/label'
import { Checkbox } from '@bu/ui/checkbox'
import { Badge } from '@bu/ui/badge'
import { Progress } from '@bu/ui/progress'
import { cn } from '@bu/ui/cn'
import {
  AlertTriangle,
  Loader2,
  Check,
  ArrowRight,
  DollarSign,
} from 'lucide-react'

interface CancelContractModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractName: string
  contractStatus: 'draft' | 'pending_signatures' | 'active' | 'pending_funding'
  releasedAmount: number
  remainingEscrow: number
  accruedYield: number
  onCancellationRequest: (reason: string) => void
}

type CancelStep = 'confirm' | 'processing' | 'pending'

export function CancelContractModal({
  open,
  onOpenChange,
  contractName,
  contractStatus,
  releasedAmount,
  remainingEscrow,
  accruedYield,
  onCancellationRequest,
}: CancelContractModalProps) {
  const [step, setStep] = useState<CancelStep>('confirm')
  const [reason, setReason] = useState('')
  const [acceptIrreversible, setAcceptIrreversible] = useState(false)
  const [acceptBothParties, setAcceptBothParties] = useState(false)
  const [progress, setProgress] = useState(0)

  const requiresCounterpartyApproval = contractStatus === 'active' || contractStatus === 'pending_funding'
  const hasFunds = remainingEscrow > 0 || accruedYield > 0

  const handleRequestCancellation = async () => {
    setStep('processing')
    
    // Simulate processing
    const steps = [
      { progress: 33, delay: 500 },
      { progress: 66, delay: 600 },
      { progress: 100, delay: 400 },
    ]

    for (const s of steps) {
      await new Promise(resolve => setTimeout(resolve, s.delay))
      setProgress(s.progress)
    }

    await new Promise(resolve => setTimeout(resolve, 300))
    
    if (requiresCounterpartyApproval) {
      setStep('pending')
    } else {
      onCancellationRequest(reason)
      onOpenChange(false)
      resetModal()
    }
  }

  const resetModal = () => {
    setStep('confirm')
    setReason('')
    setAcceptIrreversible(false)
    setAcceptBothParties(false)
    setProgress(0)
  }

  const canSubmit = reason.length >= 10 && acceptIrreversible && 
    (!requiresCounterpartyApproval || acceptBothParties)

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) resetModal()
      onOpenChange(o)
    }}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Cancel Contract
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel &ldquo;{contractName}&rdquo;?
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* Contract Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Contract Status</span>
                <Badge variant="outline" className="capitalize">
                  {contractStatus.replace(/_/g, ' ')}
                </Badge>
              </div>

              {/* Fund Distribution (if applicable) */}
              {hasFunds && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Fund Distribution on Cancellation
                  </div>
                  
                  {releasedAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Already released</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">${releasedAmount.toLocaleString()}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-emerald-500 text-xs">Kept by Payee</span>
                      </div>
                    </div>
                  )}
                  
                  {remainingEscrow > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Remaining escrow</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">${remainingEscrow.toLocaleString()}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-blue-500 text-xs">Return to Payer</span>
                      </div>
                    </div>
                  )}
                  
                  {accruedYield > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Accrued yield</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">${accruedYield.toFixed(2)}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-blue-500 text-xs">Return to Payer</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for cancellation</Label>
                <Textarea
                  id="reason"
                  placeholder="Please explain why you want to cancel this contract..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 10 characters required
                </p>
              </div>

              {/* Confirmations */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="irreversible"
                    checked={acceptIrreversible}
                    onCheckedChange={(checked) => setAcceptIrreversible(checked as boolean)}
                  />
                  <Label htmlFor="irreversible" className="text-sm leading-relaxed cursor-pointer">
                    I understand this action is irreversible
                  </Label>
                </div>
                
                {requiresCounterpartyApproval && (
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="bothParties"
                      checked={acceptBothParties}
                      onCheckedChange={(checked) => setAcceptBothParties(checked as boolean)}
                    />
                    <Label htmlFor="bothParties" className="text-sm leading-relaxed cursor-pointer">
                      I understand both parties must approve cancellation
                    </Label>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Keep Contract
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRequestCancellation}
                disabled={!canSubmit}
                className="w-full sm:w-auto"
              >
                {requiresCounterpartyApproval ? 'Request Cancellation' : 'Cancel Contract'}
              </Button>
            </DialogFooter>

            {requiresCounterpartyApproval && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Counterparty must approve before funds are released
              </p>
            )}
          </>
        )}

        {step === 'processing' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                Processing Request
              </DialogTitle>
              <DialogDescription>
                Please wait while we process your cancellation request.
              </DialogDescription>
            </DialogHeader>

            <div className="py-8">
              <Progress value={progress} className="h-2" />
            </div>
          </>
        )}

        {step === 'pending' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Check className="w-5 h-5 text-amber-500" />
                </div>
                Cancellation Requested
              </DialogTitle>
              <DialogDescription>
                Your cancellation request has been sent to the counterparty.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="rounded-lg border bg-amber-500/5 border-amber-500/20 p-4">
                <p className="text-sm">
                  The counterparty will be notified and must approve the cancellation before any funds are released.
                </p>
              </div>

              <div className="text-sm text-muted-foreground">
                <strong>What happens next:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Counterparty receives notification</li>
                  <li>They can approve or reject the cancellation</li>
                  <li>If approved, funds are distributed as shown above</li>
                  <li>If rejected, contract continues as normal</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => {
                onCancellationRequest(reason)
                onOpenChange(false)
                resetModal()
              }}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Separate component for the counterparty's view
export function CancellationRequestBanner({
  requesterName,
  reason,
  keptByPayee,
  returnedToPayer,
  onApprove,
  onReject,
}: {
  requesterName: string
  reason: string
  keptByPayee: number
  returnedToPayer: number
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div className="rounded-lg border-2 border-amber-500/50 bg-amber-500/5 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium">Cancellation Requested</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {requesterName} has requested to cancel this contract.
          </p>
        </div>
      </div>

      <div className="pl-8 space-y-3">
        <div>
          <span className="text-sm text-muted-foreground">Reason:</span>
          <p className="text-sm mt-1">&ldquo;{reason}&rdquo;</p>
        </div>

        <div className="text-sm space-y-1">
          <p className="text-muted-foreground">If approved:</p>
          {keptByPayee > 0 && (
            <p>You keep: <span className="font-medium text-emerald-500">${keptByPayee.toLocaleString()}</span> (already released)</p>
          )}
          <p>Returned to payer: <span className="font-medium">${returnedToPayer.toLocaleString()}</span> (escrow + yield)</p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onReject} size="sm">
            Reject Cancellation
          </Button>
          <Button variant="destructive" onClick={onApprove} size="sm">
            Approve Cancellation
          </Button>
        </div>
      </div>
    </div>
  )
}
