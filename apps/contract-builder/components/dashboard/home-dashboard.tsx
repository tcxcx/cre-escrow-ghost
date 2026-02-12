'use client'

import { useEffect, useMemo, useState } from "react"
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CreateContractButton } from '@/components/shared/create-contract-button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ContractsWidget } from '@/components/widgets'
import { WelcomeOnboarding } from './welcome-onboarding'
import { getContractDestination } from '@repo/contract-shared'
import { listAgreements } from '@/lib/api/client'

const statusMap: Record<string, string> = {
  DRAFT: 'draft',
  PENDING_SIGN: 'pending_sign',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
  CANCELLED: 'cancelled',
}

const pendingActions = []

export function HomeDashboard() {
  const [recentContracts, setRecentContracts] = useState<
    Array<{ id: string; name: string; counterparty: string; status: string; amount: string; progress: number }>
  >([])

  useEffect(() => {
    void (async () => {
      const response = await listAgreements({ limit: 10 })
      const rows = response.agreements ?? []
      setRecentContracts(
        rows.slice(0, 4).map((row) => ({
          id: String(row.agreement_id ?? ''),
          name: String(row.title ?? 'Untitled Agreement'),
          counterparty: 'Counterparty',
          status: statusMap[String(row.status ?? 'DRAFT')] ?? 'draft',
          amount: `$${Number(row.total_amount ?? 0).toLocaleString()}`,
          progress: 0,
        }))
      )
    })()
  }, [])

  const stats = useMemo(() => {
    const active = recentContracts.filter((contract) => contract.status === 'active').length
    const pending = recentContracts.filter(
      (contract) => contract.status === 'pending_sign' || contract.status === 'draft'
    ).length
    const escrow = recentContracts.reduce((sum, contract) => {
      const normalized = Number(contract.amount.replace(/[$,]/g, ''))
      return sum + (Number.isFinite(normalized) ? normalized : 0)
    }, 0)
    return [
      { label: 'Active', value: String(active) },
      { label: 'Pending', value: String(pending) },
      { label: 'Escrow', value: `$${escrow.toLocaleString()}` },
      { label: 'Yield', value: '$0' },
    ]
  }, [recentContracts])

  return (
    <div className="flex-1 p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <CreateContractButton />
      </div>

      <WelcomeOnboarding className="mb-2" />

      {/* Stats card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-baseline gap-8">
          {stats.map((s) => (
            <div key={s.label}>
              <span className="text-2xl font-semibold text-foreground tabular-nums">{s.value}</span>
              <span className="ml-1.5 text-sm text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pending actions card */}
      {pendingActions.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Needs attention</h2>
          </div>
          <div className="px-5 pb-4">
            <div className="divide-y divide-border">
              {pendingActions.map((action) => (
                <Link
                  key={action.id}
                  href={action.href}
                  className="flex items-center justify-between py-2.5 group"
                >
                  <span className={cn(
                    'text-sm',
                    action.urgent ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}>
                    {action.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent contracts card */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent contracts</h2>
          <Link href="/contracts" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all
          </Link>
        </div>
        <div className="px-5 pb-4">
          <div className="divide-y divide-border">
            {recentContracts.map((contract) => (
              <Link
                key={contract.id}
                href={getContractDestination(contract.id, contract.status as any)}
                className="flex items-center justify-between py-3 group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{contract.name}</p>
                  <p className="text-xs text-muted-foreground">{contract.counterparty}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm tabular-nums text-muted-foreground">{contract.amount}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {contract.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Contracts Widget */}
      <ContractsWidget />
    </div>
  )
}
