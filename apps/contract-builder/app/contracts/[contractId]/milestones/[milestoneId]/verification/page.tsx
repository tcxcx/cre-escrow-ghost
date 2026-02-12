'use client'

import { useRouter, useParams } from 'next/navigation'
import { AppShell } from '@/components/layout'
import { AIVerificationReport } from '@/components/contracts/verification/ai-verification-report'

// Mock data for demonstration
const mockVerificationData = {
  milestoneName: 'Design Refinement',
  attemptNumber: 2,
  maxAttempts: 3,
  status: 'failed' as const,
  confidence: 68,
  aiSummary: 'The submission shows good progress but is missing key responsive breakpoints specified in the verification criteria. The desktop designs are strong, but mobile and tablet variants are absent.',
  criteria: [
    {
      id: '1',
      description: 'Refined color palette based on feedback',
      status: 'pass' as const,
      details: 'Updated palette with 3 new accent colors',
    },
    {
      id: '2',
      description: 'Typography adjustments per client notes',
      status: 'pass' as const,
      details: 'Heading sizes reduced, line-height improved',
    },
    {
      id: '3',
      description: 'Responsive breakpoints (mobile, tablet, desktop)',
      status: 'fail' as const,
      details: 'Only desktop breakpoint found (1440px)',
      required: '375px, 768px, 1440px',
    },
    {
      id: '4',
      description: 'Updated component library',
      status: 'pass' as const,
      details: '8 components updated with new styles',
    },
  ],
  suggestions: [
    'Add mobile breakpoint (375px) - Create a "Mobile" frame in Figma with phone dimensions',
    'Add tablet breakpoint (768px) - Create a "Tablet" frame for iPad-sized layouts',
    'Ensure all updated components have responsive variants - Each of the 8 components should resize appropriately',
  ],
  blockchainProof: {
    txHash: '0x8f2b...3c4d',
    block: 48412033,
    timestamp: 'Feb 12, 2026 at 3:45 PM',
    verifiedBy: 'Chainlink DON (5/5 nodes consensus)',
  },
}

export default function VerificationPage() {
  const router = useRouter()
  const params = useParams()
  const contractId = params.contractId as string
  const milestoneId = params.milestoneId as string

  return (
    <AppShell>
      <AIVerificationReport
        contractId={contractId}
        milestoneId={milestoneId}
        {...mockVerificationData}
        onResubmit={() => router.push(`/contracts/${contractId}/milestones/${milestoneId}`)}
        onViewPrevious={() => {}}
      />
    </AppShell>
  )
}
