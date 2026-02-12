import { AppShell } from '@/components/layout'
import { ContractDashboard } from '@/components/contracts/dashboard/contract-dashboard'

interface ContractPageProps {
  params: Promise<{ contractId: string }>
}

export default async function ContractPage({ params }: ContractPageProps) {
  const { contractId } = await params
  return (
    <AppShell>
      <ContractDashboard contractId={contractId} />
    </AppShell>
  )
}
