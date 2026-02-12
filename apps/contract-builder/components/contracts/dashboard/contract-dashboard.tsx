'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Check, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useActiveContractStore } from '@/lib/active-contract-store'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { MilestoneStatus } from '@/types/contracts'

interface ContractDashboardProps {
  contractId: string
}

const statusLabel: Record<MilestoneStatus, string> = {
  pending: 'Pending', active: 'Active', submitted: 'Submitted',
  verifying: 'Verifying', approved: 'Approved', rejected: 'Rejected',
  released: 'Released', disputed: 'Disputed',
}

export function ContractDashboard({ contractId }: ContractDashboardProps) {
  const { contract, loading, currentUserRole, escrowStatus, yieldStatus, fetchContract, fetchEscrowStatus, fetchYieldStatus } = useActiveContractStore()

  useEffect(() => {
    fetchContract(contractId)
    fetchEscrowStatus()
    fetchYieldStatus()
  }, [contractId, fetchContract, fetchEscrowStatus, fetchYieldStatus])

  if (loading || !contract) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
  }

  const done = contract.milestones.filter(m => m.status === 'released').length
  const total = contract.milestones.length
  const pct = total > 0 ? (done / total) * 100 : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <div className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <Link href="/contracts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Contracts
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold text-foreground">{contract.name}</h1>
            <Badge variant="outline" className="text-xs capitalize">{contract.status.replace(/_/g, ' ')}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{contract.templateType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
        </div>

        {/* Context-aware prompt card */}
        {contract.status === 'pending_sign' && (
          <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center justify-between">
            <p className="text-sm text-foreground">Signatures required from both parties</p>
            <Button asChild size="sm"><Link href={`/contracts/${contractId}/sign`}>Sign</Link></Button>
          </div>
        )}
        {contract.status === 'active' && !contract.fundedAt && currentUserRole === 'payer' && (
          <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center justify-between">
            <p className="text-sm text-foreground">Deposit ${contract.totalAmount.toLocaleString()} USDC to activate</p>
            <Button asChild size="sm"><Link href={`/contracts/${contractId}/fund`}>Fund</Link></Button>
          </div>
        )}
        {contract.status === 'completed' && (
          <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center justify-between">
            <p className="text-sm text-foreground">All milestones delivered and payments released</p>
            <Button asChild size="sm" variant="outline" className="bg-transparent"><Link href={`/contracts/${contractId}/complete`}>Summary</Link></Button>
          </div>
        )}

        {/* Numbers card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-baseline gap-8">
            <div>
              <span className="text-2xl font-semibold tabular-nums text-foreground">${escrowStatus?.currentBalance?.toLocaleString() ?? contract.totalAmount.toLocaleString()}</span>
              <span className="ml-1.5 text-sm text-muted-foreground">USDC escrow</span>
            </div>
            <div>
              <span className="text-2xl font-semibold tabular-nums text-foreground">{done}/{total}</span>
              <span className="ml-1.5 text-sm text-muted-foreground">milestones</span>
            </div>
            {(yieldStatus?.totalAccrued ?? 0) > 0 && (
              <div>
                <span className="text-2xl font-semibold tabular-nums text-foreground">${yieldStatus?.totalAccrued?.toFixed(2)}</span>
                <span className="ml-1.5 text-sm text-muted-foreground">yield</span>
              </div>
            )}
          </div>
          <Progress value={pct} className="h-1" />
        </div>

        {/* Milestones card */}
        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Milestones</h2>
          </div>
          <div className="px-5 pb-4">
            <div className="divide-y divide-border">
              {contract.milestones.map((m, i) => {
                const isComplete = m.status === 'released'
                const isActive = ['active', 'submitted', 'verifying', 'rejected'].includes(m.status)
                return (
                  <div key={m.id} className={cn('flex items-center justify-between py-3', !isActive && !isComplete && 'opacity-50')}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(
                        'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0',
                        isComplete ? 'bg-foreground text-background' : isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}>
                        {isComplete ? <Check className="w-3 h-3" /> : i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{m.name}</span>
                          <Badge variant="outline" className="text-[10px]">{statusLabel[m.status]}</Badge>
                        </div>
                        {m.dueDate && (
                          <p className="text-xs text-muted-foreground">
                            {isComplete && m.completedAt ? `Done ${format(m.completedAt, 'MMM d')}` : `Due ${format(m.dueDate, 'MMM d')}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm tabular-nums text-muted-foreground">${m.amount.toLocaleString()}</span>
                      {isActive && (
                        <Button asChild size="sm" variant={currentUserRole === 'payee' ? 'default' : 'outline'} className={currentUserRole === 'payee' ? '' : 'bg-transparent'}>
                          <Link href={`/contracts/${contractId}/milestones/${m.id}`}>
                            {currentUserRole === 'payee' ? (m.status === 'rejected' ? 'Retry' : 'Submit') : 'View'}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Parties card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Parties</h2>
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-muted-foreground">Payer</p>
              <p className="text-sm font-medium text-foreground">{contract.payer.name}</p>
              <p className="text-xs text-muted-foreground">{contract.payer.bufiHandle}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payee</p>
              <p className="text-sm font-medium text-foreground">{contract.payee.name}</p>
              <p className="text-xs text-muted-foreground">{contract.payee.bufiHandle}</p>
            </div>
          </div>
        </div>

        {/* Smart contract card */}
        {contract.smartContractAddress && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">On-chain</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono text-muted-foreground">{contract.smartContractAddress.slice(0, 10)}...{contract.smartContractAddress.slice(-8)}</span>
              <span className="text-muted-foreground">{contract.chain}</span>
              <a href={`https://snowtrace.io/address/${contract.smartContractAddress}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
