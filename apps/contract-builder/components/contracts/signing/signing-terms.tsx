'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface SigningTermsProps {
  totalAmount: number
  commissionPercentage: number
  onAgreed: (agreed: boolean) => void
}

export function SigningTerms({ totalAmount, commissionPercentage, onAgreed }: SigningTermsProps) {
  const [agreed, setAgreed] = useState(false)

  const handleChange = (checked: boolean) => {
    setAgreed(checked)
    onAgreed(checked)
  }

  const terms = [
    {
      id: 'escrow',
      text: `Deposit $${totalAmount.toLocaleString()} USDC into escrow after both parties sign`,
      icon: '💰',
    },
    {
      id: 'ai',
      text: 'AI verification will determine milestone completion',
      icon: '🤖',
    },
    {
      id: 'release',
      text: 'Funds release automatically upon successful verification',
      icon: '⚡',
    },
    {
      id: 'commission',
      text: `${commissionPercentage}% commission will be deducted from payments`,
      icon: '📊',
    },
  ]

  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <h3 className="text-sm font-semibold text-amber-500 flex items-center gap-2 mb-4">
        <span>⚠️</span>
        <span>Before You Sign</span>
      </h3>

      <p className="text-sm text-muted-foreground mb-4">
        By signing this contract, you agree to:
      </p>

      <div className="space-y-3 mb-4">
        {terms.map((term) => (
          <div
            key={term.id}
            className="flex items-start gap-3 p-2 rounded-lg bg-muted/30"
          >
            <span className="text-base">{term.icon}</span>
            <p className="text-sm text-foreground">{term.text}</p>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-border">
        <label
          htmlFor="agree-terms"
          className={cn(
            'flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-colors',
            agreed ? 'bg-primary/10' : 'hover:bg-muted/50'
          )}
        >
          <Checkbox
            id="agree-terms"
            checked={agreed}
            onCheckedChange={(checked) => handleChange(checked === true)}
          />
          <span className="text-sm font-medium">
            I have read and agree to the full contract terms
          </span>
        </label>
      </div>
    </div>
  )
}
