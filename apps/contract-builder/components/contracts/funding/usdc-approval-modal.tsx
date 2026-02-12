'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Shield,
  Lock,
  Loader2,
  Check,
  ExternalLink,
  AlertCircle,
  Info,
} from 'lucide-react'

interface USDCApprovalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: number
  spenderAddress: string
  currentAllowance: number
  onApprovalComplete: () => void
}

type ApprovalStep = 'select' | 'approving' | 'complete'

export function USDCApprovalModal({
  open,
  onOpenChange,
  amount,
  spenderAddress,
  currentAllowance,
  onApprovalComplete,
}: USDCApprovalModalProps) {
  const [step, setStep] = useState<ApprovalStep>('select')
  const [approvalType, setApprovalType] = useState<'exact' | 'unlimited'>('exact')
  const [progress, setProgress] = useState(0)
  const [txHash, setTxHash] = useState<string | null>(null)

  const needsApproval = currentAllowance < amount
  const shortAddress = `${spenderAddress.slice(0, 6)}...${spenderAddress.slice(-4)}`

  const handleApprove = async () => {
    setStep('approving')
    
    // Simulate approval transaction
    const steps = [
      { progress: 25, delay: 800 },
      { progress: 50, delay: 1000 },
      { progress: 75, delay: 800 },
      { progress: 100, delay: 600 },
    ]

    for (const s of steps) {
      await new Promise(resolve => setTimeout(resolve, s.delay))
      setProgress(s.progress)
    }

    setTxHash('0x' + Math.random().toString(16).slice(2, 66))
    await new Promise(resolve => setTimeout(resolve, 300))
    setStep('complete')
  }

  const handleContinue = () => {
    onApprovalComplete()
    onOpenChange(false)
    // Reset state
    setStep('select')
    setProgress(0)
    setTxHash(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Approve USDC Spending
              </DialogTitle>
              <DialogDescription>
                Step 1 of 2: Approve the escrow contract to transfer USDC from your wallet.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* Approval Details */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount to approve</span>
                  <span className="font-medium">${amount.toLocaleString()} USDC</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Spender</span>
                  <span className="font-mono text-xs">{shortAddress} (BUFI Escrow)</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current allowance</span>
                  <span className={cn(
                    'font-medium',
                    needsApproval ? 'text-amber-500' : 'text-emerald-500'
                  )}>
                    ${currentAllowance.toLocaleString()} USDC
                  </span>
                </div>
              </div>

              {/* Approval Type Selection */}
              <RadioGroup value={approvalType} onValueChange={(v) => setApprovalType(v as 'exact' | 'unlimited')}>
                <div className={cn(
                  'flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors',
                  approvalType === 'exact' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                )}>
                  <RadioGroupItem value="exact" id="exact" className="mt-1" />
                  <Label htmlFor="exact" className="flex-1 cursor-pointer">
                    <div className="font-medium">Approve exact amount (${amount.toLocaleString()})</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Safer - requires new approval for each contract
                    </p>
                  </Label>
                </div>
                <div className={cn(
                  'flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors',
                  approvalType === 'unlimited' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                )}>
                  <RadioGroupItem value="unlimited" id="unlimited" className="mt-1" />
                  <Label htmlFor="unlimited" className="flex-1 cursor-pointer">
                    <div className="font-medium">Approve unlimited</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Convenient - no future approvals needed
                    </p>
                  </Label>
                </div>
              </RadioGroup>

              {/* Info Note */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  This is a standard ERC20 approval. You can revoke this permission anytime through your wallet or a service like Revoke.cash.
                </p>
              </div>

              {/* Progress Indicator */}
              <div className="flex items-center justify-center gap-8 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-foreground">1</span>
                  </div>
                  <span className="text-sm font-medium">Approve</span>
                </div>
                <div className="w-12 h-0.5 bg-border" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium text-muted-foreground">2</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Deposit</span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2">
              <Button onClick={handleApprove} className="w-full">
                <Shield className="w-4 h-4 mr-2" />
                Approve USDC
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Gas estimate: ~$0.10
              </p>
            </DialogFooter>
          </>
        )}

        {step === 'approving' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                Approving USDC
              </DialogTitle>
              <DialogDescription>
                Please confirm the transaction in your wallet.
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 space-y-6">
              <Progress value={progress} className="h-2" />
              
              <div className="space-y-3">
                <ApprovalStepItem 
                  label="Waiting for wallet confirmation" 
                  complete={progress >= 25} 
                  active={progress < 25}
                />
                <ApprovalStepItem 
                  label="Broadcasting transaction" 
                  complete={progress >= 50} 
                  active={progress >= 25 && progress < 50}
                />
                <ApprovalStepItem 
                  label="Waiting for confirmation" 
                  complete={progress >= 75} 
                  active={progress >= 50 && progress < 75}
                />
                <ApprovalStepItem 
                  label="Approval confirmed" 
                  complete={progress >= 100} 
                  active={progress >= 75 && progress < 100}
                />
              </div>
            </div>
          </>
        )}

        {step === 'complete' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Check className="w-5 h-5 text-emerald-500" />
                </div>
                Approval Complete
              </DialogTitle>
              <DialogDescription>
                You can now proceed to fund the escrow.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">New allowance</span>
                  <span className="font-medium text-emerald-500">
                    {approvalType === 'unlimited' ? 'Unlimited' : `$${amount.toLocaleString()}`} USDC
                  </span>
                </div>
              </div>

              {txHash && (
                <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                  <a 
                    href={`https://etherscan.io/tx/${txHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    View Transaction
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleContinue} className="w-full">
                Continue to Deposit
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ApprovalStepItem({ label, complete, active }: { label: string; complete: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
        complete 
          ? 'bg-emerald-500/10' 
          : active 
            ? 'bg-primary/10' 
            : 'bg-muted'
      )}>
        {complete ? (
          <Check className="w-3.5 h-3.5 text-emerald-500" />
        ) : active ? (
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>
      <span className={cn(
        'text-sm',
        complete ? 'text-foreground' : active ? 'text-foreground' : 'text-muted-foreground'
      )}>
        {label}
      </span>
    </div>
  )
}
