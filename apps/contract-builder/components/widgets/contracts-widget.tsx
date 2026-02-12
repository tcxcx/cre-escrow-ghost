'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ArrowRight, Upload, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateContractButton } from '@/components/shared/create-contract-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getContractDestination } from '@repo/contract-shared'
import { formatCurrency } from '@repo/contract-shared'

interface Contract {
  id: string
  name: string
  counterparty: string
  status: string
  amount: number
}

const mockContracts: Contract[] = [
  { id: 'contract-1', name: 'MOIC Website Redesign', counterparty: 'MOIC Digital', status: 'active', amount: 12500 },
  { id: 'contract-2', name: 'Q1 Marketing Retainer', counterparty: 'Acme Corp', status: 'pending_signature', amount: 8000 },
  { id: 'contract-3', name: 'API Integration Project', counterparty: 'DevAgency', status: 'awaiting_funding', amount: 15000 },
  { id: 'contract-4', name: 'Brand Guidelines', counterparty: 'ClientCo', status: 'disputed', amount: 5000 },
]

interface ContractsWidgetProps {
  className?: string
}

export function ContractsWidget({ className }: ContractsWidgetProps) {
  const router = useRouter()

  return (
    <Card className={cn('border-border', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Contracts</h3>
          <CreateContractButton variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" label="" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border">
          {mockContracts.map((contract) => (
            <button
              key={contract.id}
              type="button"
              onClick={() => router.push(getContractDestination(contract.id, contract.status))}
              className="w-full flex items-center justify-between py-2.5 text-left group"
            >
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">{contract.name}</p>
                <p className="text-xs text-muted-foreground">{contract.counterparty}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm tabular-nums text-muted-foreground">{formatCurrency(contract.amount)}</span>
                <Badge variant="outline" className="text-xs capitalize">{contract.status.replace(/_/g, ' ')}</Badge>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-muted-foreground gap-1" onClick={() => router.push('/contracts')}>
          View all contracts <ArrowRight className="w-3 h-3" />
        </Button>
      </CardContent>
    </Card>
  )
}

export function ContractsWidgetSkeleton() {
  return <Card className="border-border animate-pulse h-48" />
}
