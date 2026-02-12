'use client'

import React, { useState } from 'react'
import {
  Trash2,
  Search,
  AlertCircle,
  DollarSign,
  Users,
  CheckCircle2,
  Edit3,
  X,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useBatchStore } from '@/lib/batch-store'

export function StepReview() {
  const { recipients, removeRecipient, setStep } = useBatchStore()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const filtered = recipients.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = recipients.reduce((sum, r) => sum + r.amount, 0)
  const validRecipients = recipients.filter((r) => r.name && r.email && r.amount > 0)
  const invalidCount = recipients.length - validRecipients.length

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Recipients</span>
          </div>
          <p className="text-2xl font-semibold text-foreground">{recipients.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Value</span>
          </div>
          <p className="text-2xl font-semibold text-foreground">
            {totalValue.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">USDC</span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Valid</span>
          </div>
          <p className="text-2xl font-semibold text-foreground">
            {validRecipients.length}
            {invalidCount > 0 && (
              <span className="text-sm font-normal text-destructive ml-1">
                ({invalidCount} invalid)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search recipients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Recipient table */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_120px_100px_48px] gap-3 px-4 py-2.5 bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground border-b border-border">
          <span>Name</span>
          <span>Email</span>
          <span>Amount</span>
          <span>Status</span>
          <span className="sr-only">Actions</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border max-h-[360px] overflow-y-auto">
          {filtered.map((recipient) => {
            const isValid = recipient.name && recipient.email && recipient.amount > 0

            return (
              <div
                key={recipient.id}
                className={cn(
                  'grid grid-cols-[1fr_1fr_120px_100px_48px] gap-3 px-4 py-3 items-center text-sm transition-colors hover:bg-muted/30',
                  !isValid && 'bg-destructive/5'
                )}
              >
                <span className="font-medium text-foreground truncate">{recipient.name || '---'}</span>
                <span className="text-muted-foreground truncate">{recipient.email || '---'}</span>
                <span className="text-foreground font-medium">
                  {recipient.amount > 0 ? `${recipient.amount.toLocaleString()} ${recipient.currency}` : '---'}
                </span>
                <div>
                  {isValid ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                      Ready
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Invalid
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 bg-transparent text-muted-foreground hover:text-destructive"
                  onClick={() => removeRecipient(recipient.id)}
                  aria-label={`Remove ${recipient.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {search ? 'No recipients match your search.' : 'No recipients added yet.'}
            </div>
          )}
        </div>
      </div>

      {/* Validation warning */}
      {invalidCount > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {invalidCount} recipient{invalidCount > 1 ? 's have' : ' has'} missing required fields (name, email, or amount).
            They will be skipped unless corrected.
          </span>
        </div>
      )}
    </div>
  )
}
