'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ArrowRight, Plus } from 'lucide-react'
import { Button } from '@bu/ui/button'
import { Badge } from '@bu/ui/badge'
import { Card, CardContent, CardHeader } from '@bu/ui/card'
import { cn } from '@bu/ui/cn'
import { getContractDestination, formatCurrency } from '@bu/contracts/shared'
import { useProjectContracts } from '@/hooks/use-project-contracts'
import { useContractParams } from '@/hooks/use-contract-params'

export function ContractsWidget({ className }: { className?: string }) {
  const router = useRouter()
  const { openSheet } = useContractParams()
  const { contracts, isLoading, error } = useProjectContracts()

  if (isLoading) {
    return <ContractsWidgetSkeleton className={className} />
  }

  return (
    <Card className={cn('border-border', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Contracts</h3>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground gap-1" onClick={openSheet}>
            <Plus className="w-3.5 h-3.5" />
            New Contract
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {error || contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No contracts yet</p>
        ) : (
          <>
            <div className="divide-y divide-border">
              {contracts.map((contract) => (
                <button
                  key={contract.id}
                  type="button"
                  onClick={() => router.push(getContractDestination(contract.id, contract.status))}
                  className="w-full flex items-center justify-between py-2.5 text-left group"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{contract.name}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm tabular-nums text-muted-foreground">{formatCurrency(contract.budget)}</span>
                    <Badge variant="outline" className="text-xs capitalize">{contract.status.replace(/_/g, ' ')}</Badge>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-muted-foreground gap-1" onClick={() => router.push('/contracts')}>
              View all contracts <ArrowRight className="w-3 h-3" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function ContractsWidgetSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('border-border', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          <div className="h-7 w-7 bg-muted animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="flex items-center gap-3">
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                <div className="h-5 w-14 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
