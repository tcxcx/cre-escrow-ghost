import { AppShell } from '@/components/layout'
import { FundingView } from '@/components/contracts/funding/funding-view'

interface FundPageProps {
  params: Promise<{ contractId: string }>
}

export default async function FundPage({ params }: FundPageProps) {
  const { contractId } = await params
  return (
    <AppShell>
      <FundingView contractId={contractId} />
    </AppShell>
  )
}
