'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  Download,
  Edit,
  Send,
  FileText,
  Users,
  Calendar,
  DollarSign,
  Target,
  Shield,
  CheckCircle2,
  Clock,
  Percent,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CommentSidebar } from '@/components/contracts/collaboration/comment-sidebar'
import { PDFDownloadModal } from './pdf-download-modal'
import { StandardLegalClauses } from './standard-legal-clauses'
import type { ActiveContract } from '@/types/contracts'
import type { ContractComment } from '@/types/collaboration'

interface ContractPreviewProps {
  contract: ActiveContract
  onEdit?: () => void
  onSendToSign?: () => void
}

export function ContractPreview({ contract, onEdit, onSendToSign }: ContractPreviewProps) {
  const router = useRouter()
  const [isDownloading, setIsDownloading] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)

  // Mock comments - in production, fetched from API
  const mockComments: ContractComment[] = [
    {
      id: 'c1',
      contractId: contract.id,
      sectionId: 'milestones',
      selectedText: 'AI Verification Criteria',
      content: 'Should we add more specific acceptance criteria for the first milestone?',
      status: 'open' as const,
      author: { id: 'user-1', name: contract.payer.name, avatar: '', role: 'reviewer' as const },
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(Date.now() - 86400000),
      replies: [],
    },
  ]

  const handleDownload = async () => {
    setIsDownloading(true)
    // Simulate PDF generation
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsDownloading(false)
  }

  const totalValue = contract.milestones.reduce((sum, m) => sum + m.amount, 0)
  const totalCommission = contract.commissions.reduce((sum, c) => sum + c.percentage, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-lg font-semibold">{contract.name}</h1>
              <p className="text-xs text-muted-foreground">Contract #{contract.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComments(true)}
              className="gap-2 bg-transparent"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Comments</span>
              {mockComments.filter(c => c.status === 'open').length > 0 && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">
                  {mockComments.filter(c => c.status === 'open').length}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPdfModal(true)}
              className="gap-2 bg-transparent"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download PDF</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Contract Document */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="secondary" className="mb-4 bg-white/10 text-white border-white/20">
                      {contract.template.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                    <h2 className="text-2xl font-bold mb-2">{contract.name}</h2>
                    <p className="text-slate-300 text-sm">
                      Contract #{contract.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Total Value</p>
                    <p className="text-3xl font-bold">${totalValue.toLocaleString()}</p>
                    <p className="text-sm text-slate-400">USDC</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-8">
                {/* Parties Section */}
                <section className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    Parties
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-border bg-muted/30">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Payer (Client)</p>
                      <p className="font-semibold">{contract.payer.name}</p>
                      <p className="text-sm text-muted-foreground">{contract.payer.email}</p>
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        {contract.payer.walletAddress?.slice(0, 6)}...{contract.payer.walletAddress?.slice(-4)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-muted/30">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Payee (Contractor)</p>
                      <p className="font-semibold">{contract.payee.name}</p>
                      <p className="text-sm text-muted-foreground">{contract.payee.email}</p>
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        {contract.payee.walletAddress?.slice(0, 6)}...{contract.payee.walletAddress?.slice(-4)}
                      </p>
                    </div>
                  </div>
                </section>

                <Separator className="my-6" />

                {/* Milestones Section */}
                <section className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    Milestones ({contract.milestones.length})
                  </h3>
                  <div className="space-y-4">
                    {contract.milestones.map((milestone, index) => (
                      <div key={milestone.id} className="p-4 rounded-lg border border-border">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{milestone.title}</p>
                              <p className="text-sm text-muted-foreground">{milestone.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${milestone.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">USDC</p>
                          </div>
                        </div>
                        {milestone.verificationCriteria && (
                          <div className="mt-3 p-3 rounded-md bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              AI Verification Criteria
                            </p>
                            <p className="text-sm">{milestone.verificationCriteria}</p>
                          </div>
                        )}
                        {milestone.dueDate && (
                          <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            Due: {new Date(milestone.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <Separator className="my-6" />

                {/* Financial Terms */}
                <section className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    Financial Terms
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg border border-border text-center">
                      <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Total Contract</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border text-center">
                      <p className="text-2xl font-bold">{contract.milestones.length}</p>
                      <p className="text-xs text-muted-foreground">Milestones</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border text-center">
                      <p className="text-2xl font-bold">{totalCommission}%</p>
                      <p className="text-xs text-muted-foreground">Commission</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border text-center">
                      <p className="text-2xl font-bold">{contract.yieldStrategy?.split || '50/50'}</p>
                      <p className="text-xs text-muted-foreground">Yield Split</p>
                    </div>
                  </div>

                  {contract.commissions.length > 0 && (
                    <div className="mt-4 p-4 rounded-lg border border-border bg-muted/30">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Commission Breakdown
                      </p>
                      <div className="space-y-2">
                        {contract.commissions.map((commission, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{commission.recipientName}</span>
                            <span className="font-medium">{commission.percentage}% (${((totalValue * commission.percentage) / 100).toFixed(2)})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <Separator className="my-6" />

                {/* Signature Section */}
                <section>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    Signatures
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={cn(
                      "p-4 rounded-lg border-2 border-dashed",
                      contract.signatures.payer 
                        ? "border-emerald-500/50 bg-emerald-500/5" 
                        : "border-border"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Payer Signature</p>
                        {contract.signatures.payer ? (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Signed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-muted">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      {contract.signatures.payer ? (
                        <div>
                          <p className="text-sm text-muted-foreground">{contract.payer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(contract.signatures.payer.signedAt).toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Awaiting signature</p>
                      )}
                    </div>
                    <div className={cn(
                      "p-4 rounded-lg border-2 border-dashed",
                      contract.signatures.payee 
                        ? "border-emerald-500/50 bg-emerald-500/5" 
                        : "border-border"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Payee Signature</p>
                        {contract.signatures.payee ? (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Signed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-muted">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      {contract.signatures.payee ? (
                        <div>
                          <p className="text-sm text-muted-foreground">{contract.payee.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(contract.signatures.payee.signedAt).toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Awaiting signature</p>
                      )}
                    </div>
                  </div>
                </section>

                <Separator className="my-6" />

                {/* Standard Legal Clauses */}
                <section>
                  <StandardLegalClauses
                    governingLaw={contract.governingLaw || 'State of Delaware, United States'}
                    jurisdiction={contract.jurisdiction || 'Courts of Delaware, United States'}
                  />
                </section>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Value</span>
                      <span className="font-medium">${totalValue.toLocaleString()} USDC</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Milestones</span>
                      <span className="font-medium">{contract.milestones.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">
                        {contract.milestones[0]?.dueDate && contract.milestones[contract.milestones.length - 1]?.dueDate
                          ? `${Math.ceil((new Date(contract.milestones[contract.milestones.length - 1].dueDate!).getTime() - new Date(contract.milestones[0].dueDate!).getTime()) / (1000 * 60 * 60 * 24))} days`
                          : 'TBD'
                        }
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Parties</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payer</span>
                      <span className="font-medium">{contract.payer.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payee</span>
                      <span className="font-medium">{contract.payee.name}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    {onEdit && (
                      <Button 
                        variant="outline" 
                        className="w-full gap-2 bg-transparent"
                        onClick={onEdit}
                      >
                        <Edit className="h-4 w-4" />
                        Edit Contract
                      </Button>
                    )}
                    {onSendToSign && (
                      <Button 
                        className="w-full gap-2"
                        onClick={onSendToSign}
                      >
                        <Send className="h-4 w-4" />
                        Send to Sign
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Blockchain Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Network</span>
                    <span className="font-medium">Avalanche C-Chain</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Token</span>
                    <span className="font-medium">USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Yield Protocol</span>
                    <span className="font-medium">{contract.yieldStrategy?.protocol || 'AAVE V3'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Comment Sidebar */}
      <CommentSidebar
        comments={mockComments}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        currentUserId="user-1"
      />

      {/* PDF Download Modal */}
      <PDFDownloadModal
        open={showPdfModal}
        onOpenChange={setShowPdfModal}
        contract={contract}
      />
    </div>
  )
}
