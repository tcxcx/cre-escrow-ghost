'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  X,
  Copy,
  Download,
  ExternalLink,
  Check,
  FileText,
  User,
  Building2,
  Target,
  Banknote,
  PenLine,
  Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useContractStore } from '@/lib/contract-store'
import type { ContractNode } from '@repo/contract-flow'
import { compileGraphToAgreement } from '@repo/core/agreement/compiler'
import { createAgreementFromTemplate } from '@/lib/api/client'
import { useRouter } from 'next/navigation'

export function ContractPreview() {
  const router = useRouter()
  const {
    isPreviewOpen,
    setPreviewOpen,
    contractName,
    nodes,
    edges,
    settings,
    currentSavedContract,
    generateShareLink,
    isContractValid,
  } = useContractStore()
  
  const [copied, setCopied] = useState(false)
  const [deploying, setDeploying] = useState(false)
  
  const shareLink = useMemo(() => generateShareLink(), [currentSavedContract])

  const handleCopyLink = async () => {
    if (shareLink) {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Group nodes by type for organized display
  const groupedNodes = useMemo(() => {
    const groups: Record<string, ContractNode[]> = {
      parties: [],
      milestones: [],
      payments: [],
      clauses: [],
      signatures: [],
      conditions: [],
      commissions: [],
    }

    for (const node of nodes) {
      if (node.type === 'party-payer' || node.type === 'party-payee') {
        groups.parties.push(node)
      } else if (node.type === 'milestone') {
        groups.milestones.push(node)
      } else if (node.type === 'payment') {
        groups.payments.push(node)
      } else if (node.type === 'clause') {
        groups.clauses.push(node)
      } else if (node.type === 'signature') {
        groups.signatures.push(node)
      } else if (node.type === 'condition') {
        groups.conditions.push(node)
      } else if (node.type === 'commission') {
        groups.commissions.push(node)
      }
    }

    return groups
  }, [nodes])

  // Calculate total contract value
  const totalValue = useMemo(() => {
    let total = 0
    for (const node of nodes) {
      if (node.type === 'milestone' || node.type === 'payment') {
        total += (node.data as { amount?: number }).amount || 0
      }
    }
    return total
  }, [nodes])

  const deployAgreement = async () => {
    if (!isContractValid || deploying) return
    setDeploying(true)
    try {
      const agreementJson = compileGraphToAgreement({
        nodes: nodes as unknown as Array<{ id: string; type: string; data: Record<string, unknown> & { label: string } }>,
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle ?? undefined,
          targetHandle: edge.targetHandle ?? undefined,
        })),
        settings,
        title: contractName,
      })

      const milestones = agreementJson.milestones.map((milestone) => ({
        title: milestone.title,
        amount: Number(milestone.amount) / 1_000_000,
        acceptanceCriteria: milestone.acceptanceCriteria,
        dueDate: milestone.dueDate ?? undefined,
      }))

      const totalAmount = milestones.reduce((sum, milestone) => sum + milestone.amount, 0)

      const response = await createAgreementFromTemplate({
        title: agreementJson.title,
        agreementJson,
        agreementHash: agreementJson.hashing.agreementHash ?? '',
        tokenAddress: settings.currency === 'EURC'
          ? '0x5E44db7996c682E92a960b65AC713a54AD815c6B'
          : '0x5425890298aed601595a70AB815c96711a31Bc65',
        payerAddress: '',
        payeeAddress: '',
        totalAmount,
        milestones,
      })

      if (response.agreementId) {
        router.push(`/contracts/${response.agreementId}`)
      }
    } finally {
      setDeploying(false)
    }
  }

  return (
    <Sheet open={isPreviewOpen} onOpenChange={setPreviewOpen}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 bg-card border-border flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border">
          <SheetHeader className="space-y-1">
            <SheetTitle className="text-lg font-semibold">{contractName}</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Contract Preview
            </SheetDescription>
          </SheetHeader>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 bg-transparent"
            onClick={() => setPreviewOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Share Link Banner */}
        {currentSavedContract && shareLink && (
          <div className="px-4 py-3 bg-primary/5 border-b border-border">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Share2 className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">
                  {shareLink}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 bg-transparent"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 bg-transparent"
                  onClick={() => window.open(shareLink, '_blank')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Contract Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            {/* Contract Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{contractName}</h1>
              <p className="text-sm text-muted-foreground">
                Created on {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>

            {/* Contract Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-secondary/50 mb-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</p>
                <p className="text-xl font-bold text-foreground">
                  ${totalValue.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{settings.currency}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Network</p>
                <p className="text-xl font-bold text-foreground capitalize">{settings.chain}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Yield Strategy</p>
                <p className="text-sm font-medium text-foreground capitalize">
                  {settings.yieldStrategy === 'none' ? 'No Yield' : settings.yieldStrategy.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                <p className={cn(
                  'text-sm font-medium',
                  isContractValid ? 'text-emerald-400' : 'text-amber-400'
                )}>
                  {isContractValid ? 'Ready to Deploy' : 'Incomplete'}
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Parties Section */}
            {groupedNodes.parties.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Parties
                </h2>
                <div className="space-y-3">
                  {groupedNodes.parties.map((node) => {
                    const data = node.data as { name?: string; email?: string; role?: string }
                    const isPayer = node.type === 'party-payer'
                    return (
                      <div key={node.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                        <div className={cn(
                          'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                          isPayer ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                        )}>
                          {isPayer ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{node.data.label}</p>
                          {data.name && (
                            <p className="text-sm text-muted-foreground">{data.name}</p>
                          )}
                          {data.email && (
                            <p className="text-xs text-muted-foreground">{data.email}</p>
                          )}
                          <span className={cn(
                            'inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium',
                            isPayer 
                              ? 'bg-blue-500/10 text-blue-400' 
                              : 'bg-emerald-500/10 text-emerald-400'
                          )}>
                            {isPayer ? 'Payer' : 'Payee'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Milestones Section */}
            {groupedNodes.milestones.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Milestones
                </h2>
                <div className="space-y-3">
                  {groupedNodes.milestones.map((node, index) => {
                    const data = node.data as { title?: string; description?: string; amount?: number; currency?: string; verificationCriteria?: string }
                    return (
                      <div key={node.id} className="p-4 rounded-lg border border-purple-500/20 bg-purple-500/5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold shrink-0">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{data.title || node.data.label}</p>
                              {data.description && (
                                <p className="text-xs text-muted-foreground mt-1">{data.description}</p>
                              )}
                              {data.verificationCriteria && (
                                <p className="text-xs text-purple-400/80 mt-2">
                                  <span className="font-medium">Verification:</span> {data.verificationCriteria}
                                </p>
                              )}
                            </div>
                          </div>
                          {data.amount ? (
                            <span className="shrink-0 px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-sm font-medium">
                              ${data.amount.toLocaleString()}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Clauses Section */}
            {groupedNodes.clauses.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Contract Clauses
                </h2>
                <div className="space-y-3">
                  {groupedNodes.clauses.map((node) => {
                    const data = node.data as { title?: string; content?: string }
                    return (
                      <div key={node.id} className="p-4 rounded-lg bg-secondary/30">
                        <p className="text-sm font-medium text-foreground mb-2">{data.title || node.data.label}</p>
                        {data.content && (
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {data.content}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Signatures Section */}
            {groupedNodes.signatures.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Required Signatures
                </h2>
                <div className="space-y-3">
                  {groupedNodes.signatures.map((node) => {
                    const data = node.data as { signerRole?: string; required?: boolean }
                    return (
                      <div key={node.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                          <PenLine className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{node.data.label}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {data.signerRole} Signature {data.required && '(Required)'}
                          </p>
                        </div>
                        <div className="ml-auto px-3 py-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                          Pending
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Payments Section */}
            {groupedNodes.payments.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Payment Schedule
                </h2>
                <div className="space-y-3">
                  {groupedNodes.payments.map((node) => {
                    const data = node.data as { amount?: number; currency?: string; triggerType?: string }
                    return (
                      <div key={node.id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                            <Banknote className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{node.data.label}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {data.triggerType?.replace('-', ' ')}
                            </p>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-emerald-400">
                          ${(data.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Commissions Section */}
            {groupedNodes.commissions.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Commission Splits
                </h2>
                <div className="space-y-3">
                  {groupedNodes.commissions.map((node) => {
                    const data = node.data as { recipientName?: string; percentage?: number }
                    return (
                      <div key={node.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                        <p className="text-sm font-medium text-foreground">{data.recipientName || node.data.label}</p>
                        <span className="text-sm font-bold text-yellow-400">
                          {data.percentage}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex-shrink-0 p-4 border-t border-border bg-card space-y-3">
          {/* View PDF Link */}
          {currentSavedContract && (
            <Button
              variant="outline"
              className="w-full gap-2 bg-transparent border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => window.open(`/contract/${currentSavedContract.id}/pdf`, '_blank')}
            >
              <FileText className="w-4 h-4" />
              View PDF Document
              <ExternalLink className="w-3.5 h-3.5 ml-auto" />
            </Button>
          )}
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2 bg-transparent"
              onClick={() => {
                // Generate and download PDF
                const pdfUrl = currentSavedContract 
                  ? `/api/contract/${currentSavedContract.id}/pdf` 
                  : '#'
                if (currentSavedContract) {
                  window.open(pdfUrl, '_blank')
                }
              }}
              disabled={!currentSavedContract}
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Button
              className="flex-1 gap-2"
              disabled={!isContractValid || deploying}
              onClick={deployAgreement}
            >
              {deploying ? 'Deploying...' : 'Deploy Contract'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
