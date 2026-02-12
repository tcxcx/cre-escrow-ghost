'use client'

import { AppShell } from '@/components/layout'
import { CompletionView } from '@/components/contracts/completion/completion-view'

export default function CompletionPage() {
  return (
    <AppShell>
      <CompletionView />
    </AppShell>
  )
}
