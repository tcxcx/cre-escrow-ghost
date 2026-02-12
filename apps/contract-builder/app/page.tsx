import { Suspense } from 'react'
import { HomeClientPage } from './home-client'

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HomeClientPage />
    </Suspense>
  )
}
