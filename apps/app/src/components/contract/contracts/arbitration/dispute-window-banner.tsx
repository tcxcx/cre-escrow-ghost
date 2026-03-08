'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { Button } from '@bu/ui/button'
import { Badge } from '@bu/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@bu/ui/dialog'
import { Textarea } from '@bu/ui/textarea'
import { Label } from '@bu/ui/label'
import { RadioGroup, RadioGroupItem } from '@bu/ui/radio-group'
import { Upload, Loader2, File, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@bu/ui/cn'
import { toast } from '@bu/ui/use-toast'
import { fileDispute } from '@/lib/api/client'

interface DisputeWindowBannerProps {
  milestoneId: string
  contractId: string
  windowEndTime: string
  verificationConfidence: number
  currentUserRole: 'payer' | 'payee'
  onDisputeFiled?: () => void
  className?: string
}

type DisputeReason = 'criteria-not-met' | 'quality-insufficient' | 'scope-incomplete' | 'ai-incorrect' | 'other'

const reasons: { value: DisputeReason; label: string }[] = [
  { value: 'criteria-not-met', label: 'Criteria not met' },
  { value: 'quality-insufficient', label: 'Quality insufficient' },
  { value: 'scope-incomplete', label: 'Scope incomplete' },
  { value: 'ai-incorrect', label: 'AI assessment incorrect' },
  { value: 'other', label: 'Other' },
]

export function DisputeWindowBanner({ milestoneId, contractId, windowEndTime, verificationConfidence, currentUserRole, onDisputeFiled, className }: DisputeWindowBannerProps) {
  const router = useRouter()
  const [remaining, setRemaining] = useState('')
  const [expired, setExpired] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reason, setReason] = useState<DisputeReason | null>(null)
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const tick = () => {
      const diff = new Date(windowEndTime).getTime() - Date.now()
      if (diff <= 0) { setExpired(true); setRemaining('Closed'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(h > 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [windowEndTime])

  const submit = async () => {
    if (!reason || !description.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const evidenceFiles = files.map((f) => f.name)
      await fileDispute(contractId, milestoneId, {
        reason: `${reason}: ${description}`,
        filedBy: currentUserRole === 'payer' ? 'payer' : 'payee',
        evidenceFiles,
      })
      setDialogOpen(false)
      toast({ title: 'Dispute filed. Escrow frozen.', variant: 'success-light' })
      onDisputeFiled?.()
      router.push(`/contracts/${contractId}/dispute`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to file dispute'
      setError(message)
      toast({ title: message, variant: 'error-light' })
    } finally {
      setSubmitting(false)
    }
  }

  if (expired) {
    return (
      <div className={cn('flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4', className)}>
        <p className="text-sm text-muted-foreground">Dispute window closed. Funds releasing.</p>
        <Badge variant="outline" className="text-xs">Auto-released</Badge>
      </div>
    )
  }

  return (
    <>
      <div className={cn('flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4', className)}>
        <div className="flex items-center gap-3">
          <p className="text-sm text-foreground">Dispute window open</p>
          {verificationConfidence < 80 && (
            <span className="text-xs text-muted-foreground">Low confidence ({verificationConfidence}%)</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono tabular-nums text-muted-foreground">{remaining}</span>
          <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={() => setDialogOpen(true)}>File Dispute</Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>File a dispute</DialogTitle>
            <DialogDescription>Freezes escrow and triggers AI arbitration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Reason</Label>
              <RadioGroup value={reason || ''} onValueChange={(v) => setReason(v as DisputeReason)} className="mt-2 space-y-1.5">
                {reasons.map(r => (
                  <div key={r.value} className="flex items-center gap-2">
                    <RadioGroupItem value={r.value} id={r.value} />
                    <Label htmlFor={r.value} className="text-sm font-normal cursor-pointer">{r.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue..." className="mt-1.5 min-h-[80px]" />
            </div>
            <div>
              <Label className="text-sm">Evidence (optional)</Label>
              <div className="mt-1.5 space-y-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="truncate flex-1 text-muted-foreground">{f.name}</span>
                    <button type="button" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}><Trash2 className="w-3 h-3 text-muted-foreground" /></button>
                  </div>
                ))}
                <label className="flex items-center gap-2 py-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Upload
                  <input type="file" multiple className="hidden" onChange={e => { if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]) }} />
                </label>
              </div>
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive px-1">{error}</p>
          )}
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!reason || !description.trim() || submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Filing...</> : 'File Dispute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
