'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@bu/ui/dialog'
import { Button } from '@bu/ui/button'
import { Loader2 } from 'lucide-react'
import type { SigningState } from '@/lib/active-contract-store'

interface SigningProgressProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  state: SigningState
  walletAddress: string
  contractNumber: string
  chain: string
  onCancel: () => void
}

export function SigningProgress({
  open,
  onOpenChange,
  state,
  walletAddress,
  contractNumber,
  chain,
  onCancel,
}: SigningProgressProps) {
  const canCancel = state === 'confirming' || state === 'signing'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {state === 'confirming' && 'Confirm in Wallet'}
            {state === 'signing' && 'Signing Contract'}
            {state === 'success' && 'Signed Successfully'}
            {state === 'error' && 'Signing Failed'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {(state === 'confirming' || state === 'signing') && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {state === 'confirming'
                    ? 'Please confirm the transaction in your wallet.'
                    : 'Signing transaction on the blockchain...'}
                </p>
              </div>

              <div className="w-full p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Signing as:</span>
                  <span className="font-mono text-foreground">
                    {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Contract:</span>
                  <span className="font-mono text-foreground">{contractNumber}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Action:</span>
                  <span className="font-mono text-foreground">sign()</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Chain:</span>
                  <span className="font-mono text-foreground">{chain}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Gas:</span>
                  <span className="font-mono text-foreground">~0.002 AVAX</span>
                </div>
              </div>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Your signature has been recorded on the blockchain.
              </p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="text-3xl">✗</span>
              </div>
              <p className="text-sm text-red-400 text-center">
                Signing failed. Please try again.
              </p>
            </div>
          )}
        </div>

        {canCancel && (
          <div className="flex justify-center">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
