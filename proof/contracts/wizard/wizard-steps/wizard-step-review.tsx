'use client'

import { Building2, User, Target, Globe, Coins, DollarSign, TrendingUp } from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { useContractStore } from '@/lib/contract-store'

export function WizardStepReview() {
  const nodes = useContractStore((s) => s.nodes)
  const settings = useContractStore((s) => s.settings)
  const contractName = useContractStore((s) => s.contractName)

  const payers = nodes.filter((n) => n.type === 'party-payer')
  const payees = nodes.filter((n) => n.type === 'party-payee')
  const milestones = nodes.filter((n) => n.type === 'milestone')
  const totalAmount = milestones.reduce((sum, n) => {
    const data = n.data as { amount?: number }
    return sum + (data.amount ?? 0)
  }, 0)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-darkText dark:text-whiteDanis">
          Review Contract
        </h2>
        <p className="mt-1 text-sm text-purpleDanis">
          Review all details before sending the contract for signatures.
        </p>
      </div>

      {/* Contract name */}
      <div className="rounded-xl border border-borderFine dark:border-darkBorder p-4">
        <p className="text-xs text-purpleDanis uppercase tracking-wider font-semibold">Contract</p>
        <p className="text-lg font-semibold text-darkText dark:text-whiteDanis mt-1">
          {contractName}
        </p>
      </div>

      {/* Parties */}
      <div className="rounded-xl border border-borderFine dark:border-darkBorder p-4 space-y-3">
        <p className="text-xs text-purpleDanis uppercase tracking-wider font-semibold">Parties</p>
        <div className="grid gap-3 md:grid-cols-2">
          {payers.map((n) => {
            const d = n.data as { name?: string; email?: string }
            return (
              <div key={n.id} className="flex items-center gap-3 rounded-lg bg-violet-50 dark:bg-violet-950/50 p-3">
                <Building2 className="h-4 w-4 text-purpleDanis" />
                <div>
                  <p className="text-sm font-medium text-darkText dark:text-whiteDanis">
                    {d.name || 'Unnamed Payer'}
                  </p>
                  <p className="text-xs text-purpleDanis">{d.email || 'No email'}</p>
                </div>
                <span className="ml-auto text-xs font-medium text-purpleDanis">Payer</span>
              </div>
            )
          })}
          {payees.map((n) => {
            const d = n.data as { name?: string; email?: string }
            return (
              <div key={n.id} className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 p-3">
                <User className="h-4 w-4 text-vverde" />
                <div>
                  <p className="text-sm font-medium text-darkText dark:text-whiteDanis">
                    {d.name || 'Unnamed Payee'}
                  </p>
                  <p className="text-xs text-purpleDanis">{d.email || 'No email'}</p>
                </div>
                <span className="ml-auto text-xs font-medium text-vverde">Payee</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Milestones */}
      <div className="rounded-xl border border-borderFine dark:border-darkBorder p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-purpleDanis uppercase tracking-wider font-semibold">
            Milestones
          </p>
          <p className="text-sm font-semibold text-purpleDanis">
            Total: ${totalAmount.toLocaleString()}
          </p>
        </div>
        {milestones.map((n, i) => {
          const d = n.data as { title?: string; amount?: number; dueDate?: string }
          return (
            <div
              key={n.id}
              className="flex items-center justify-between rounded-lg bg-violet-50 dark:bg-violet-950/50 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900">
                  <Target className="h-3.5 w-3.5 text-purpleDanis" />
                </div>
                <div>
                  <p className="text-sm font-medium text-darkText dark:text-whiteDanis">
                    {d.title || `Milestone ${i + 1}`}
                  </p>
                  {d.dueDate && (
                    <p className="text-xs text-purpleDanis">Due: {d.dueDate}</p>
                  )}
                </div>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-purpleDanis">
                <DollarSign className="h-3.5 w-3.5" />
                {(d.amount ?? 0).toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>

      {/* Escrow settings */}
      <div className="rounded-xl border border-borderFine dark:border-darkBorder p-4 space-y-3">
        <p className="text-xs text-purpleDanis uppercase tracking-wider font-semibold">
          Escrow Settings
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg bg-violet-50 dark:bg-violet-950/50 p-3">
            <Globe className="h-4 w-4 text-purpleDanis" />
            <div>
              <p className="text-xs text-purpleDanis">Network</p>
              <p className="text-sm font-medium text-darkText dark:text-whiteDanis capitalize">
                {settings.chain}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-violet-50 dark:bg-violet-950/50 p-3">
            <Coins className="h-4 w-4 text-purpleDanis" />
            <div>
              <p className="text-xs text-purpleDanis">Currency</p>
              <p className="text-sm font-medium text-darkText dark:text-whiteDanis">
                {settings.currency}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-violet-50 dark:bg-violet-950/50 p-3">
            <TrendingUp className="h-4 w-4 text-vverde" />
            <div>
              <p className="text-xs text-purpleDanis">Yield</p>
              <p className="text-sm font-medium text-darkText dark:text-whiteDanis">
                {settings.yieldStrategy?.enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
