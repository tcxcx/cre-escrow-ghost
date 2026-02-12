'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout'
import { ContractPreview } from '@/components/contracts/preview/contract-preview'
import { useActiveContractStore } from '@/lib/active-contract-store'

export default function PreviewPage() {
  const params = useParams()
  const { contract, loading, fetchContract } = useActiveContractStore()
  
  useEffect(() => {
    if (params.contractId) {
      fetchContract(params.contractId as string)
    }
  }, [params.contractId, fetchContract])
  
  if (loading || !contract) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading contract preview...</div>
        </div>
      </AppShell>
    )
  }
  
  return (
    <AppShell>
      <ContractPreview contract={contract} />
    </AppShell>
  )
}
