'use client'

import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout'
import { MilestoneDetail } from '@/components/contracts/milestones/milestone-detail'

export default function MilestonePage() {
  const params = useParams()
  const contractId = params.contractId as string
  const milestoneId = params.milestoneId as string
  
  return (
    <AppShell>
      <MilestoneDetail contractId={contractId} milestoneId={milestoneId} />
    </AppShell>
  )
}
