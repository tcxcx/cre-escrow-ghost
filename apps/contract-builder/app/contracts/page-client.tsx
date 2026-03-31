'use client'

import { useQueryState, parseAsString } from 'nuqs'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout'
import { ContractsList } from '@/components/contracts/list/contracts-list'
import { TemplateSelector } from '@/components/contract-builder/template-selector'
import { ImportContractModal } from '@/components/contract-builder/import-contract-modal'

export function ContractsClientPage() {
  const router = useRouter()
  const [panel, setPanel] = useQueryState('panel', parseAsString)

  return (
    <AppShell>
      <ContractsList />

      <TemplateSelector
        open={panel === 'new'}
        onOpenChange={(open) => setPanel(open ? 'new' : null)}
        onTemplateSelect={(id) => {
          setPanel(null)
          router.push(`/builder?template=${id}`)
        }}
      />
      <ImportContractModal
        open={panel === 'import'}
        onOpenChange={(open) => setPanel(open ? 'import' : null)}
        onImportComplete={(id) => {
          setPanel(null)
          router.push(`/builder?template=${id}`)
        }}
      />
    </AppShell>
  )
}
