'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppShell } from '@/components/layout'
import { ReceivedContractView } from '@/components/contracts/received/received-contract-view'
import { useActiveContractStore } from '@/lib/active-contract-store'

export default function ReceivedContractPage() {
  const router = useRouter()
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
          <div className="animate-pulse text-muted-foreground">Loading contract...</div>
        </div>
      </AppShell>
    )
  }
  
  return (
    <AppShell>
      <ReceivedContractView
        contract={contract}
        senderMessage="Hey team, here's the contract for our website redesign project. Let me know if you have any questions!"
        senderEmail={contract.payer.email}
        sentAt={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        onViewFull={() => router.push(`/contracts/${params.contractId}/preview`)}
        onRequestChanges={() => {}}
        onAcceptAndSign={() => router.push(`/contracts/${params.contractId}/sign`)}
      />
    </AppShell>
  )
}
