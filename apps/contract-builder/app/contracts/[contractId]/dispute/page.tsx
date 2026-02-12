'use client'

import { AppShell } from '@/components/layout'
import { DisputeView } from '@/components/contracts/disputes/dispute-view'

export default function DisputePage() {
  return (
    <AppShell>
      <DisputeView />
    </AppShell>
  )
}
