'use client'

import React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, ArrowRight, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { ContractStatus } from '@/types/contracts'
import { getContractDestination } from '@repo/contract-shared'
import { listAgreements } from '@/lib/api/client'

interface ContractListItem {
  id: string
  name: string
  status: ContractStatus
  totalValue: number
  currency: string
  payerName: string
  payeeName: string
  milestonesCompleted: number
  milestonesTotal: number
  updatedAt: Date
}

const statusMap: Record<string, ContractStatus> = {
  DRAFT: 'draft',
  PENDING_SIGN: 'pending_sign',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
  CANCELLED: 'cancelled',
}

export function ContractsList() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const [contracts, setContracts] = useState<ContractListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const response = await listAgreements({ limit: 200 })
        const rows = response.agreements ?? []
        setContracts(
          rows.map((row) => ({
            id: String(row.agreement_id ?? ''),
            name: String(row.title ?? 'Untitled Agreement'),
            status: statusMap[String(row.status ?? 'DRAFT')] ?? 'draft',
            totalValue: Number(row.total_amount ?? 0),
            currency: 'USDC',
            payerName: 'Payer',
            payeeName: 'Payee',
            milestonesCompleted: 0,
            milestonesTotal: 0,
            updatedAt: new Date(String(row.updated_at ?? row.created_at ?? Date.now())),
          }))
        )
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => contracts.filter((c) => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.payerName.toLowerCase().includes(search.toLowerCase())
    const matchesTab = tab === 'all' ||
      (tab === 'active' && c.status === 'active') ||
      (tab === 'pending' && (c.status === 'pending_sign' || c.status === 'draft')) ||
      (tab === 'completed' && c.status === 'completed')
    return matchesSearch && matchesTab
  }), [contracts, search, tab])

  return (
    <div className="flex flex-col h-full p-6 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-foreground">Contracts</h1>
        <Button size="sm" className="gap-2" onClick={() => router.push('/builder')}>
          <Plus className="w-3.5 h-3.5" />
          New
        </Button>
      </div>

      {/* Search + Tabs + List inside bordered card */}
      <div className="rounded-xl border border-border bg-card flex-1 flex flex-col overflow-hidden">
        {/* Search bar */}
        <div className="px-5 pt-4 pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 bg-muted/50" />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
          <div className="border-b border-border px-5">
            <TabsList className="h-10 bg-transparent p-0 gap-4">
              {['all', 'active', 'pending', 'completed'].map((t) => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-0 capitalize text-sm">
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value={tab} className="flex-1 m-0">
            <div className="px-5 py-3">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-12">Loading contracts...</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No contracts found</p>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map((contract) => (
                    <button
                      key={contract.id}
                      type="button"
                      onClick={() => router.push(getContractDestination(contract.id, contract.status))}
                      className="w-full flex items-center justify-between py-3.5 text-left group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <p className="text-sm font-medium text-foreground truncate">{contract.name}</p>
                          <Badge variant="outline" className="text-xs capitalize shrink-0">
                            {contract.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {contract.payerName} <ArrowRight className="w-3 h-3 inline" /> {contract.payeeName}
                          <span className="mx-2 text-border">|</span>
                          {contract.milestonesCompleted}/{contract.milestonesTotal} milestones
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-sm tabular-nums text-muted-foreground">{contract.totalValue.toLocaleString()} {contract.currency}</span>
                        <span className="text-xs text-muted-foreground">{contract.updatedAt.toLocaleDateString()}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
