'use client'

import { useEffect, useState } from 'react'
import { Button } from '@bu/ui/button'
import { Progress } from '@bu/ui/progress'
import { ArrowLeft, Check, ExternalLink, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useActiveContractStore } from '@/lib/active-contract-store'
import { cn } from '@bu/ui/cn'
import { format } from 'date-fns'
import {
  ContractStatusBadge,
  MilestoneStatusBadge,
} from '@bu/contracts/shared'

interface ContractDashboardProps {
  contractId: string
}

export function ContractDashboard({ contractId }: ContractDashboardProps) {
  const { contract, loading, currentUserRole, escrowStatus, yieldStatus, fetchContract, fetchEscrowStatus, fetchYieldStatus } = useActiveContractStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    fetchContract(contractId).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load contract')
    })
    fetchEscrowStatus(contractId)
    fetchYieldStatus(contractId)
  }, [contractId, fetchContract, fetchEscrowStatus, fetchYieldStatus])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm">
        <AlertCircle className="w-5 h-5 text-destructive" />
        <p className="text-destructive">{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            setError(null)
            fetchContract(contractId).catch((err) => {
              setError(err instanceof Error ? err.message : 'Failed to load contract')
            })
            fetchEscrowStatus(contractId)
            fetchYieldStatus(contractId)
          }}>
            Try again
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/contracts">Back to contracts</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (loading || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading contract...
      </div>
    )
  }

  const payer = contract.parties.find((p) => p.role === 'payer')
  const payee = contract.parties.find((p) => p.role === 'payee')

  // Normalize milestone status to lowercase for status config lookup
  const normStatus = (s: string) => s.toLowerCase()
  const isReleased = (s: string) => normStatus(s) === 'released'
  const isActiveMilestone = (s: string) =>
    ['in_progress', 'submitted', 'under_review', 'rejected'].includes(normStatus(s))

  const done = contract.milestones.filter((m) => isReleased(m.status)).length
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
            <ContractStatusBadge status={contract.status} size="sm" />
          </div>
          {contract.contractNumber && (
            <p className="text-sm text-muted-foreground">#{contract.contractNumber}</p>
          )}
        </div>

        {/* Context-aware prompt card */}
        {contract.status === 'draft' && (
          <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center justify-between">
            <p className="text-sm text-foreground">This contract is still a draft</p>
            <Button asChild size="sm"><Link href={`/contracts/${contractId}/edit`}>Edit in builder</Link></Button>
          </div>
        )}
        {contract.status === 'pending_sign' && (
          <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center justify-between">
            <p className="text-sm text-foreground">Signatures required from both parties</p>
            <Button asChild size="sm"><Link href={`/contracts/${contractId}/sign`}>Go to signing</Link></Button>
          </div>
        )}
        {contract.status === 'active' && !contract.fundedAt && currentUserRole === 'payer' && (
          <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center justify-between">
            <p className="text-sm text-foreground">Deposit ${contract.totalAmount.toLocaleString()} USDC to activate</p>
            <Button asChild size="sm"><Link href={`/contracts/${contractId}/fund`}>Fund</Link></Button>
          </div>
        )}
        {contract.status === 'disputed' && (
          <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center justify-between">
            <p className="text-sm text-foreground">This contract has an active dispute</p>
            <Button asChild size="sm" variant="destructive"><Link href={`/contracts/${contractId}/dispute`}>View arbitration</Link></Button>
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
              <span className="text-2xl font-semibold tabular-nums text-foreground">${escrowStatus?.balance?.toLocaleString() ?? contract.totalAmount.toLocaleString()}</span>
              <span className="ml-1.5 text-sm text-muted-foreground">USDC escrow</span>
            </div>
            <div>
              <span className="text-2xl font-semibold tabular-nums text-foreground">{done}/{total}</span>
              <span className="ml-1.5 text-sm text-muted-foreground">milestones</span>
            </div>
            {(yieldStatus?.accrued ?? 0) > 0 && (
              <div>
                <span className="text-2xl font-semibold tabular-nums text-foreground">${yieldStatus?.accrued?.toFixed(2)}</span>
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
                const complete = isReleased(m.status)
                const active = isActiveMilestone(m.status)
                const statusKey = normStatus(m.status)
                return (
                  <div key={m.id} className={cn('flex items-center justify-between py-3', !active && !complete && 'opacity-50')}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(
                        'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0',
                        complete ? 'bg-foreground text-background' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}>
                        {complete ? <Check className="w-3 h-3" /> : i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{m.title}</span>
                          <MilestoneStatusBadge status={statusKey} />
                        </div>
                        {m.dueDate && (
                          <p className="text-xs text-muted-foreground">
                            Due {format(m.dueDate, 'MMM d')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm tabular-nums text-muted-foreground">${m.amount.toLocaleString()}</span>
                      {active && contract.status === 'active' && (
                        <Button asChild size="sm" variant={currentUserRole === 'payee' ? 'default' : 'outline'} className={currentUserRole === 'payee' ? '' : 'bg-transparent'}>
                          <Link href={`/contracts/${contractId}/milestones/${m.id}`}>
                            {currentUserRole === 'payee' ? (statusKey === 'rejected' ? 'Retry' : 'Submit') : 'View'}
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
            {payer && (
              <div>
                <p className="text-xs text-muted-foreground">Payer</p>
                <p className="text-sm font-medium text-foreground">{payer.name}</p>
                {payer.bufiHandle && <p className="text-xs text-muted-foreground">{payer.bufiHandle}</p>}
              </div>
            )}
            {payee && (
              <div>
                <p className="text-xs text-muted-foreground">Payee</p>
                <p className="text-sm font-medium text-foreground">{payee.name}</p>
                {payee.bufiHandle && <p className="text-xs text-muted-foreground">{payee.bufiHandle}</p>}
              </div>
            )}
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
