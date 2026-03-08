'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight, FileText, LayoutDashboard, PenTool } from 'lucide-react'
import { CreateContractDropdown } from '@/components/contract/shared/create-contract-button'
import { cn } from '@bu/ui/cn'
import { useContractStore } from '@/lib/contract-store'
import { formatCurrency } from '@bu/contracts/shared'

// ── Nav ──────────────────────────────────────────────
const primaryNav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contracts', label: 'Contracts', icon: FileText },
]

// ── Active contract type ──────────────────────────────
interface ActiveContract {
  id: string
  name: string
  status: string
  amount: number
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500',
  pending_sign: 'bg-amber-500',
  awaiting_funding: 'bg-blue-500',
  disputed: 'bg-destructive',
  completed: 'bg-muted-foreground',
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const savedContracts = useContractStore((s) => s.savedContracts)
  const [activeContracts, setActiveContracts] = useState<ActiveContract[]>([])

  useEffect(() => {
    let cancelled = false

    async function fetchActiveContracts() {
      try {
        const res = await fetch('/api/contracts/agreements?status=ACTIVE')
        if (!res.ok) return
        const json = await res.json()
        if (cancelled) return

        const agreements = Array.isArray(json.agreements) ? json.agreements : []
        setActiveContracts(
          agreements.map((a: Record<string, unknown>) => ({
            id: (a.agreement_id as string) ?? '',
            name: (a.title as string) ?? 'Untitled',
            status: ((a.status as string) ?? 'active').toLowerCase(),
            amount: (a.total_amount as number) ?? 0,
          })),
        )
      } catch {
        // Silently fail — sidebar shows empty list
      }
    }

    fetchActiveContracts()
    return () => { cancelled = true }
  }, [])

  const drafts = savedContracts?.slice(0, 10) ?? []

  return (
    <aside className="flex flex-col w-[240px] h-full border-r border-border bg-card shrink-0">
      {/* ── Create ────────────────────────────────── */}
      <div className="px-3 pt-3 pb-1">
        <CreateContractDropdown side="right" align="start" />
      </div>

      {/* ── Nav ───────────────────────────────────── */}
      <nav className="flex flex-col gap-0.5 px-3 mt-2">
        {primaryNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Divider ───────────────────────────────── */}
      <div className="mx-3 my-3 border-t border-border" />

      {/* ── Drafts ────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3">
        <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
          Drafts
        </h3>
        {drafts.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 py-2">No drafts yet</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {drafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => {
                  router.push(`/builder?draft=${draft.id}`)
                }}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors group',
                  pathname === '/builder'
                    ? 'bg-muted'
                    : 'hover:bg-muted',
                )}
              >
                <PenTool className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="text-xs text-foreground truncate flex-1">
                  {draft.name}
                </span>
                <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* ── Active Contracts ────────────────────── */}
        <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-4 mb-1.5">
          Active Contracts
        </h3>
        <div className="flex flex-col gap-0.5">
          {activeContracts.map((contract) => (
            <Link
              key={contract.id}
              href={`/contracts/${contract.id}`}
              className={cn(
                'flex items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors group',
                pathname.includes(contract.id)
                  ? 'bg-muted'
                  : 'hover:bg-muted',
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  statusColors[contract.status] ?? 'bg-muted-foreground',
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{contract.name}</p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {formatCurrency(contract.amount)}
                </p>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </aside>
  )
}
