'use client'

import React from 'react'
import { AppSidebar } from './app-sidebar'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  className?: string
  /** Hide the inner sidebar (e.g. fullscreen views). Defaults to true. */
  showSidebar?: boolean
  /** Whether content should fill remaining height. Defaults to false */
  fullHeight?: boolean
}

export function AppShell({
  children,
  className,
  showSidebar = true,
  fullHeight = false,
}: AppShellProps) {
  return (
    <div className={cn('flex h-full bg-background', className)}>
      {showSidebar && <AppSidebar />}
      <main
        className={cn(
          'flex-1 min-w-0 overflow-x-hidden',
          fullHeight && 'flex flex-col',
        )}
      >
        {children}
      </main>
    </div>
  )
}
