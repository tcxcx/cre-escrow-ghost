import { Suspense } from 'react'
import { BuilderClientPage } from './page-client'

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <BuilderClientPage />
    </Suspense>
  )
}
