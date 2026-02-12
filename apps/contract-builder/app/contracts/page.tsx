import { Suspense } from 'react'
import { ContractsClientPage } from './page-client'

export default function ContractsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ContractsClientPage />
    </Suspense>
  )
}
