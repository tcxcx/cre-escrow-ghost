import { AppShell } from '@/components/layout'
import { SigningView } from '@/components/contracts/signing'

interface SignPageProps {
  params: Promise<{ contractId: string }>
}

export default async function SignPage({ params }: SignPageProps) {
  const { contractId } = await params
  return (
    <AppShell>
      <SigningView contractId={contractId} />
    </AppShell>
  )
}
