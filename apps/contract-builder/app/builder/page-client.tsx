'use client'

import { useEffect } from 'react'
import { useQueryState, parseAsString } from 'nuqs'
import { AppShell } from '@/components/layout'
import { ContractBuilder } from '@/components/contract-builder'
import { useContractStore } from '@/lib/contract-store'

export function BuilderClientPage() {
  const [draft] = useQueryState('draft', parseAsString)
  const loadSavedContract = useContractStore((s) => s.loadSavedContract)

  useEffect(() => {
    if (draft) {
      loadSavedContract(draft)
    }
  }, [draft, loadSavedContract])

  return (
    <AppShell showSidebar fullHeight>
      <ContractBuilder />
    </AppShell>
  )
}
