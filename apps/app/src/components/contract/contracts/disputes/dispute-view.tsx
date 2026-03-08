'use client'

import React from "react"

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@bu/ui/card'
import { Button } from '@bu/ui/button'
import { Badge } from '@bu/ui/badge'
import { Textarea } from '@bu/ui/textarea'
import { ScrollArea } from '@bu/ui/scroll-area'
import { Separator } from '@bu/ui/separator'
import { Label } from '@bu/ui/label'
import { RadioGroup, RadioGroupItem } from '@bu/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@bu/ui/dialog'
import {
  AlertTriangle,
  MessageSquare,
  Clock,
  FileText,
  Upload,
  Send,
  Users,
  CheckCircle2,
  XCircle,
  Scale,
  Shield,
  ArrowRight,
  Loader2,
  User,
  Building2,
  Calendar,
  Gavel,
  Trash2,
} from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { toast } from 'sonner'
import { fileDispute } from '@/lib/api/client'

type DisputeStatus = 'open' | 'evidence-collection' | 'under-review' | 'resolved'
type Resolution = 'payer-favor' | 'payee-favor' | 'split' | null
type DisputeReason = 'criteria-not-met' | 'quality-insufficient' | 'scope-incomplete' | 'ai-incorrect' | 'other'

const disputeReasons: { value: DisputeReason; label: string }[] = [
  { value: 'criteria-not-met', label: 'Criteria not met' },
  { value: 'quality-insufficient', label: 'Quality insufficient' },
  { value: 'scope-incomplete', label: 'Scope incomplete' },
  { value: 'ai-incorrect', label: 'AI assessment incorrect' },
  { value: 'other', label: 'Other' },
]

interface DisputeMessage {
  id: string
  sender: 'payer' | 'payee' | 'arbitrator' | 'system'
  senderName: string
  content: string
  timestamp: Date
  attachments?: { name: string; url: string }[]
}

interface DisputeData {
  id: string
  contractId: string
  contractName: string
  status: DisputeStatus
  reason: string
  description: string
  filedBy: 'payer' | 'payee'
  filedAt: Date
  milestoneId?: string
  milestoneName?: string
  disputedAmount: number
  currency: string
  payer: { name: string; address: string }
  payee: { name: string; address: string }
  messages: DisputeMessage[]
  resolution?: Resolution
  resolvedAt?: Date
  arbitrator?: { name: string; id: string }
}

interface DisputeViewProps {
  contractId?: string
  milestoneId?: string
  currentUserRole?: 'payer' | 'payee'
}

const statusConfig: Record<DisputeStatus, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: 'Open', color: 'bg-rose-50 dark:bg-rose-950 text-rojo border-rojo/20', icon: AlertTriangle },
  'evidence-collection': { label: 'Evidence Collection', color: 'bg-amber-50 dark:bg-amber-950 text-amarillo border-amarillo/20', icon: FileText },
  'under-review': { label: 'Under Review', color: 'bg-violet-50 dark:bg-violet-950 text-purpleDanis border-purpleDanis/20', icon: Scale },
  resolved: { label: 'Resolved', color: 'bg-emerald-50 dark:bg-emerald-950 text-vverde border-vverde/20', icon: CheckCircle2 },
}

export function DisputeView({ contractId: propContractId, milestoneId: propMilestoneId, currentUserRole = 'payer' }: DisputeViewProps = {}) {
  const router = useRouter()
  const params = useParams()
  const contractId = propContractId ?? (params?.contractId as string) ?? ''
  const milestoneId = propMilestoneId ?? (params?.milestoneId as string) ?? ''

  const [data, setData] = useState<DisputeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  const [showFileDisputeDialog, setShowFileDisputeDialog] = useState(false)

  // File dispute form state
  const [disputeReason, setDisputeReason] = useState<DisputeReason | null>(null)
  const [disputeDescription, setDisputeDescription] = useState('')
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([])
  const [isFilingDispute, setIsFilingDispute] = useState(false)
  const [filingError, setFilingError] = useState<string | null>(null)

  // Fetch dispute data
  useEffect(() => {
    const id = contractId || params?.id
    if (!id) return

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setFetchError(null)
        const res = await fetch(`/api/contracts/agreements/${id}/disputes`)
        if (!res.ok) {
          throw new Error(`Failed to load dispute data (${res.status})`)
        }
        const json = await res.json()
        const transformed: DisputeData = {
          id: json.id ?? '',
          contractId: json.contractId ?? json.contract_id ?? (id as string),
          contractName: json.contractName ?? json.contract_name ?? 'Untitled Contract',
          status: json.status ?? 'open',
          reason: json.reason ?? '',
          description: json.description ?? '',
          filedBy: json.filedBy ?? json.filed_by ?? 'payer',
          filedAt: new Date(json.filedAt ?? json.filed_at ?? Date.now()),
          milestoneName: json.milestoneName ?? json.milestone_name,
          milestoneId: json.milestoneId ?? json.milestone_id,
          disputedAmount: json.disputedAmount ?? json.disputed_amount ?? 0,
          currency: json.currency ?? 'USDC',
          payer: json.payer ?? { name: 'Unknown', address: '' },
          payee: json.payee ?? { name: 'Unknown', address: '' },
          messages: (json.messages ?? []).map((m: Record<string, unknown>) => ({
            id: (m.id ?? '') as string,
            sender: (m.sender ?? 'system') as DisputeMessage['sender'],
            senderName: (m.senderName ?? m.sender_name ?? '') as string,
            content: (m.content ?? '') as string,
            timestamp: new Date((m.timestamp ?? Date.now()) as string | number),
            attachments: m.attachments as DisputeMessage['attachments'],
          })),
          resolution: json.resolution ?? null,
          resolvedAt: json.resolvedAt ?? json.resolved_at ? new Date((json.resolvedAt ?? json.resolved_at) as string) : undefined,
          arbitrator: json.arbitrator,
        }
        setData(transformed)
      } catch (err) {
        setFetchError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [contractId, params?.id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purpleDanis" />
          <p className="text-sm text-muted-foreground">Loading dispute details...</p>
        </div>
      </div>
    )
  }

  if (fetchError || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <p className="text-sm text-destructive">{fetchError ?? 'Failed to load dispute data'}</p>
          <Button variant="outline" className="bg-transparent" onClick={() => router.push('/contracts')}>
            Back to Contracts
          </Button>
        </div>
      </div>
    )
  }

  const status = statusConfig[data.status]
  const StatusIcon = status.icon
  const daysRemaining = 5 // TODO: compute from filedAt + evidence window

  const handleFileDispute = useCallback(async () => {
    if (!disputeReason || !disputeDescription.trim()) return
    if (!contractId || !milestoneId) {
      toast.error('Missing contract or milestone identifier')
      return
    }

    setIsFilingDispute(true)
    setFilingError(null)

    try {
      const fileNames = evidenceFiles.map((f) => f.name)
      await fileDispute(contractId, milestoneId, {
        reason: `${disputeReason}: ${disputeDescription}`,
        filedBy: currentUserRole,
        evidenceFiles: fileNames,
      })

      setShowFileDisputeDialog(false)
      setDisputeReason(null)
      setDisputeDescription('')
      setEvidenceFiles([])
      toast.success('Dispute filed successfully. Escrow has been frozen.')
      router.push(`/contracts/${contractId}/dispute`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to file dispute'
      setFilingError(message)
      toast.error(message)
    } finally {
      setIsFilingDispute(false)
    }
  }, [contractId, milestoneId, disputeReason, disputeDescription, evidenceFiles, currentUserRole, router])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    setIsSending(true)
    try {
      // Simulate send
      await new Promise(resolve => setTimeout(resolve, 1000))
      setNewMessage('')
      toast.success('Message sent')
    } catch {
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-rose-50 dark:from-rose-950 to-transparent border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className={cn('text-xs', status.color)}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {status.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Dispute #{data.id.slice(-6)}
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">
                Dispute: {data.contractName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Filed by {data.filedBy === 'payer' ? data.payer.name : data.payee.name} on {data.filedAt.toLocaleDateString()}
              </p>
            </div>
            {data.status === 'evidence-collection' && (
              <div className="text-right">
                <div className="flex items-center gap-1 text-amarillo">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">{daysRemaining} days left</span>
                </div>
                <p className="text-xs text-muted-foreground">to submit evidence</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dispute Details */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dispute Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm text-muted-foreground">Reason</span>
                  <p className="font-medium text-foreground">{data.reason}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Description</span>
                  <p className="text-sm text-foreground mt-1">{data.description}</p>
                </div>
                {data.milestoneName && (
                  <div>
                    <span className="text-sm text-muted-foreground">Related Milestone</span>
                    <p className="text-sm text-foreground">{data.milestoneName}</p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950 border border-rojo/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Amount in Dispute</span>
                    <span className="font-semibold text-foreground">
                      ${data.disputedAmount.toLocaleString()} {data.currency}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Communication Thread */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Communication
                </CardTitle>
                <CardDescription>
                  All messages are recorded for arbitration review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {data.messages.map((message) => {
                      const isSystem = message.sender === 'system'
                      const isPayer = message.sender === 'payer'
                      const isPayee = message.sender === 'payee'
                      
                      return (
                        <div 
                          key={message.id}
                          className={cn(
                            'p-4 rounded-lg',
                            isSystem && 'bg-muted/30 border border-border text-center',
                            isPayer && 'bg-violet-50 dark:bg-violet-950 border border-purpleDanis/20 ml-0 mr-8',
                            isPayee && 'bg-emerald-50 dark:bg-emerald-950 border border-vverde/20 ml-8 mr-0',
                          )}
                        >
                          {!isSystem && (
                            <div className="flex items-center gap-2 mb-2">
                              <div className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center',
                                isPayer ? 'bg-violet-100 dark:bg-violet-900' : 'bg-emerald-100 dark:bg-emerald-900'
                              )}>
                                {isPayer ? (
                                  <Building2 className="w-3 h-3 text-purpleDanis" />
                                ) : (
                                  <User className="w-3 h-3 text-vverde" />
                                )}
                              </div>
                              <span className="text-sm font-medium text-foreground">
                                {message.senderName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {message.timestamp.toLocaleString()}
                              </span>
                            </div>
                          )}
                          <p className={cn(
                            'text-sm',
                            isSystem ? 'text-muted-foreground' : 'text-foreground'
                          )}>
                            {message.content}
                          </p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {message.attachments.map((attachment, i) => (
                                <Button
                                  key={i}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1 bg-transparent"
                                >
                                  <FileText className="w-3 h-3" />
                                  {attachment.name}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>

                {data.status !== 'resolved' && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="min-h-[100px] bg-muted/30"
                      />
                      <div className="flex items-center justify-between">
                        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                          <Upload className="w-4 h-4" />
                          Attach Evidence
                        </Button>
                        <Button 
                          size="sm" 
                          className="gap-2 bg-purpleDanis hover:bg-purpleDanis/90 text-white"
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || isSending}
                        >
                          {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          Send Message
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Parties */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Parties Involved
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-purpleDanis" />
                    <span className="text-sm font-medium text-foreground">{data.payer.name}</span>
                    {data.filedBy === 'payer' && (
                      <Badge variant="outline" className="text-[10px] h-4">Filed</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Payer</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-vverde" />
                    <span className="text-sm font-medium text-foreground">{data.payee.name}</span>
                    {data.filedBy === 'payee' && (
                      <Badge variant="outline" className="text-[10px] h-4">Filed</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Payee</p>
                </div>
                {data.arbitrator && (
                  <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950 border border-purpleDanis/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Gavel className="w-4 h-4 text-purpleDanis" />
                      <span className="text-sm font-medium text-foreground">{data.arbitrator.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Assigned Arbitrator</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dispute Timeline */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-vverde mt-1.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Dispute Filed</p>
                      <p className="text-xs text-muted-foreground">{data.filedAt.toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-1.5',
                      data.status === 'evidence-collection' || data.status === 'under-review' || data.status === 'resolved'
                        ? 'bg-vverde'
                        : 'bg-muted'
                    )} />
                    <div>
                      <p className="text-sm font-medium text-foreground">Evidence Collection</p>
                      <p className="text-xs text-muted-foreground">7 days from filing</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-1.5',
                      data.status === 'under-review' || data.status === 'resolved'
                        ? 'bg-vverde'
                        : 'bg-muted'
                    )} />
                    <div>
                      <p className="text-sm font-medium text-foreground">Arbitration Review</p>
                      <p className="text-xs text-muted-foreground">3-5 business days</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-1.5',
                      data.status === 'resolved'
                        ? 'bg-vverde'
                        : 'bg-muted'
                    )} />
                    <div>
                      <p className="text-sm font-medium text-foreground">Resolution</p>
                      <p className="text-xs text-muted-foreground">Final decision</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="bg-card border-border">
              <CardContent className="p-4 space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 bg-transparent"
                  onClick={() => router.push(`/contracts/${data.contractId}`)}
                >
                  <FileText className="w-4 h-4" />
                  View Contract
                </Button>
                {milestoneId && data.status !== 'resolved' && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 bg-transparent text-rojo border-rojo/30 hover:bg-rose-50 dark:hover:bg-rose-950"
                    onClick={() => setShowFileDisputeDialog(true)}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    File Dispute
                  </Button>
                )}
                {data.status !== 'resolved' && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 bg-transparent text-vverde border-vverde/30 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                    onClick={() => setShowResolveDialog(true)}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Propose Resolution
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Resolution Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Propose Resolution</DialogTitle>
            <DialogDescription>
              Propose a resolution to end the dispute. The other party must agree for it to be finalized.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Amount in dispute: <span className="font-medium text-foreground">${data.disputedAmount.toLocaleString()}</span>
            </p>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-between bg-transparent">
                <span>Release to Payee (100%)</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between bg-transparent">
                <span>Refund to Payer (100%)</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between bg-transparent">
                <span>Split 50/50</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between bg-transparent">
                <span>Custom Split...</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowResolveDialog(false)} className="bg-transparent">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Dispute Dialog */}
      <Dialog open={showFileDisputeDialog} onOpenChange={setShowFileDisputeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>File a Dispute</DialogTitle>
            <DialogDescription>
              Filing a dispute freezes the escrow and triggers AI-powered arbitration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Reason</Label>
              <RadioGroup
                value={disputeReason || ''}
                onValueChange={(v) => setDisputeReason(v as DisputeReason)}
                className="mt-2 space-y-1.5"
              >
                {disputeReasons.map((r) => (
                  <div key={r.value} className="flex items-center gap-2">
                    <RadioGroupItem value={r.value} id={`dispute-${r.value}`} />
                    <Label htmlFor={`dispute-${r.value}`} className="text-sm font-normal cursor-pointer">
                      {r.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="mt-1.5 min-h-[80px]"
              />
            </div>
            <div>
              <Label className="text-sm">Evidence (optional)</Label>
              <div className="mt-1.5 space-y-1.5">
                {evidenceFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <FileText className="w-3 h-3 text-muted-foreground" />
                    <span className="truncate flex-1 text-muted-foreground">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setEvidenceFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
                <label className="flex items-center gap-2 py-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Upload files
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setEvidenceFiles((prev) => [...prev, ...Array.from(e.target.files!)])
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
          {filingError && (
            <p className="text-sm text-destructive px-1">{filingError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setShowFileDisputeDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFileDispute}
              disabled={!disputeReason || !disputeDescription.trim() || isFilingDispute}
            >
              {isFilingDispute ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Filing...
                </>
              ) : (
                'File Dispute'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
