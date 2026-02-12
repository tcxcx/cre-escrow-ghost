'use client'

import { AppShell } from '@/components/layout'
import { YieldDashboard } from '@/components/contracts/yield/yield-dashboard'
import { useParams } from 'next/navigation'

export default function YieldPage() {
  const params = useParams()
  return (
    <AppShell>
      <YieldDashboard contractId={params.contractId as string} />
    </AppShell>
  )
}
