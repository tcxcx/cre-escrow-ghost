'use client'

import React, { useState } from 'react'
import {
  Send,
  Shield,
  CheckCircle2,
  Loader2,
  DollarSign,
  Users,
  FileText,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useBatchStore } from '@/lib/batch-store'

export function StepConfirm() {
  const { recipients, isSending, sendProgress, setSending } = useBatchStore()
  const [sendComplete, setSendComplete] = useState(false)

  const validRecipients = recipients.filter((r) => r.name && r.email && r.amount > 0)
  const totalValue = validRecipients.reduce((sum, r) => sum + r.amount, 0)
  const currencies = [...new Set(validRecipients.map((r) => r.currency))]

  const handleSend = async () => {
    setSending(true, 0)

    // Simulate batch sending
    for (let i = 0; i < validRecipients.length; i++) {
      const progress = Math.round(((i + 1) / validRecipients.length) * 100)
      setSending(true, progress)
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 200))
    }

    setSending(false)
    setSendComplete(true)
  }

  if (sendComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Batch Contracts Sent
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {validRecipients.length} contracts have been sent to recipients for signing.
            Escrow accounts will be created once all parties sign.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 w-full max-w-md">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold text-foreground">{validRecipients.length}</p>
            <p className="text-xs text-muted-foreground">Contracts</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold text-foreground">{totalValue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total {currencies[0] || 'USDC'}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold text-foreground">{validRecipients.length}</p>
            <p className="text-xs text-muted-foreground">Escrows</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Confirmation summary */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground">Confirm Batch Send</h2>
        <p className="text-sm text-muted-foreground">
          Review the summary below before sending contracts to all recipients.
          Each recipient will receive a contract for e-signature, and an escrow account
          will be created for each upon signing.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{validRecipients.length} Recipients</p>
              <p className="text-xs text-muted-foreground">Contracts to send</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{totalValue.toLocaleString()} {currencies[0] || 'USDC'}</p>
              <p className="text-xs text-muted-foreground">Total escrow value</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Wallet className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{validRecipients.length} Escrows</p>
              <p className="text-xs text-muted-foreground">To be created on-chain</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">E-Signature</p>
              <p className="text-xs text-muted-foreground">Required from each recipient</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recipient preview (collapsed list) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-sm font-medium text-foreground">Recipient Preview</p>
        </div>
        <div className="divide-y divide-border max-h-[200px] overflow-y-auto">
          {validRecipients.slice(0, 10).map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-foreground font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                </div>
              </div>
              <span className="text-foreground font-medium shrink-0 ml-4">
                {r.amount.toLocaleString()} {r.currency}
              </span>
            </div>
          ))}
          {validRecipients.length > 10 && (
            <div className="px-4 py-2.5 text-xs text-muted-foreground text-center">
              + {validRecipients.length - 10} more recipients
            </div>
          )}
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
        <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Secure batch processing.</span>{' '}
          Each contract is individually signed and each escrow is independently secured on-chain.
          Funds are only released upon milestone completion.
        </div>
      </div>

      {/* Send progress */}
      {isSending && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm font-medium text-foreground">
              Sending contracts... ({Math.round(sendProgress)}%)
            </span>
          </div>
          <Progress value={sendProgress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            {Math.round((sendProgress / 100) * validRecipients.length)} of {validRecipients.length} contracts sent
          </p>
        </div>
      )}

      {/* Send button */}
      {!isSending && (
        <Button
          onClick={handleSend}
          disabled={validRecipients.length === 0}
          className="w-full gap-2"
          size="lg"
        >
          <Send className="w-4 h-4" />
          Send {validRecipients.length} Contracts & Create Escrows
        </Button>
      )}
    </div>
  )
}
