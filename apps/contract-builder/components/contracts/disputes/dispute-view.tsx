'use client'

import React from "react"

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

type DisputeStatus = 'open' | 'evidence-collection' | 'under-review' | 'resolved'
type Resolution = 'payer-favor' | 'payee-favor' | 'split' | null

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

const mockDisputeData: DisputeData = {
  id: 'dispute-1',
  contractId: 'contract-5',
  contractName: 'Brand Identity Design',
  status: 'evidence-collection',
  reason: 'Quality of deliverables',
  description: 'The final logo designs do not match the agreed specifications in the brief. Colors are incorrect and the typography does not follow brand guidelines.',
  filedBy: 'payer',
  filedAt: new Date('2024-01-27'),
  milestoneName: 'Final Deliverables',
  disputedAmount: 8000,
  currency: 'USDC',
  payer: { name: 'New Ventures LLC', address: '0x1234...5678' },
  payee: { name: 'Creative Agency', address: '0xabcd...ef01' },
  messages: [
    {
      id: '1',
      sender: 'system',
      senderName: 'System',
      content: 'Dispute filed by New Ventures LLC. Both parties have 7 days to submit evidence.',
      timestamp: new Date('2024-01-27T10:00:00'),
    },
    {
      id: '2',
      sender: 'payer',
      senderName: 'New Ventures LLC',
      content: 'The delivered designs do not match our specifications. Attached are the original brief and the received files for comparison.',
      timestamp: new Date('2024-01-27T10:15:00'),
      attachments: [
        { name: 'original-brief.pdf', url: '#' },
        { name: 'received-designs.zip', url: '#' },
      ],
    },
    {
      id: '3',
      sender: 'payee',
      senderName: 'Creative Agency',
      content: 'We followed the brief exactly. The colors were changed per the verbal agreement in our meeting on Jan 20th. We have meeting notes as evidence.',
      timestamp: new Date('2024-01-27T14:30:00'),
      attachments: [
        { name: 'meeting-notes-jan20.pdf', url: '#' },
      ],
    },
  ],
}

const statusConfig: Record<DisputeStatus, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: 'Open', color: 'bg-[#FF507A]/10 text-[#FF507A] border-[#FF507A]/20', icon: AlertTriangle },
  'evidence-collection': { label: 'Evidence Collection', color: 'bg-[#FFE48C]/10 text-[#c9a93a] border-[#FFE48C]/20', icon: FileText },
  'under-review': { label: 'Under Review', color: 'bg-[#6854CF]/10 text-[#6854CF] border-[#6854CF]/20', icon: Scale },
  resolved: { label: 'Resolved', color: 'bg-[#82e664]/10 text-[#5cb346] border-[#82e664]/20', icon: CheckCircle2 },
}

export function DisputeView() {
  const router = useRouter()
  const params = useParams()
  const [data] = useState(mockDisputeData)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  
  const status = statusConfig[data.status]
  const StatusIcon = status.icon
  const daysRemaining = 5 // Mock

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    setIsSending(true)
    // Simulate send
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSending(false)
    setNewMessage('')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#FF507A]/5 to-transparent border-b border-border">
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
                <div className="flex items-center gap-1 text-[#FFE48C]">
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
                <div className="p-3 rounded-lg bg-[#FF507A]/5 border border-[#FF507A]/20">
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
                            isPayer && 'bg-[#6854CF]/5 border border-[#6854CF]/20 ml-0 mr-8',
                            isPayee && 'bg-[#82e664]/5 border border-[#82e664]/20 ml-8 mr-0',
                          )}
                        >
                          {!isSystem && (
                            <div className="flex items-center gap-2 mb-2">
                              <div className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center',
                                isPayer ? 'bg-[#6854CF]/10' : 'bg-[#82e664]/10'
                              )}>
                                {isPayer ? (
                                  <Building2 className="w-3 h-3 text-[#6854CF]" />
                                ) : (
                                  <User className="w-3 h-3 text-[#82e664]" />
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
                          className="gap-2 bg-[#6854CF] hover:bg-[#5a46b8] text-white"
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
                    <Building2 className="w-4 h-4 text-[#6854CF]" />
                    <span className="text-sm font-medium text-foreground">{data.payer.name}</span>
                    {data.filedBy === 'payer' && (
                      <Badge variant="outline" className="text-[10px] h-4">Filed</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Payer</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-[#82e664]" />
                    <span className="text-sm font-medium text-foreground">{data.payee.name}</span>
                    {data.filedBy === 'payee' && (
                      <Badge variant="outline" className="text-[10px] h-4">Filed</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Payee</p>
                </div>
                {data.arbitrator && (
                  <div className="p-3 rounded-lg bg-[#6854CF]/5 border border-[#6854CF]/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Gavel className="w-4 h-4 text-[#6854CF]" />
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
                    <div className="w-2 h-2 rounded-full bg-[#82e664] mt-1.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Dispute Filed</p>
                      <p className="text-xs text-muted-foreground">{data.filedAt.toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-1.5',
                      data.status === 'evidence-collection' || data.status === 'under-review' || data.status === 'resolved'
                        ? 'bg-[#82e664]'
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
                        ? 'bg-[#82e664]'
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
                        ? 'bg-[#82e664]'
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
                {data.status !== 'resolved' && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 bg-transparent text-[#82e664] border-[#82e664]/30 hover:bg-[#82e664]/10"
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
    </div>
  )
}
