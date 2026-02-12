'use client'

import { useQueryState, parseAsString } from 'nuqs'
import { AppShell } from '@/components/layout'
import { HomeDashboard } from '@/components/dashboard'
import { TemplateSelector } from '@/components/contract-builder/template-selector'
import { ImportContractModal } from '@/components/contract-builder/import-contract-modal'
import { useRouter } from 'next/navigation'

export function HomeClientPage() {
  const router = useRouter()
  const [panel, setPanel] = useQueryState('panel', parseAsString)

  return (
    <AppShell>
      <HomeDashboard />

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
