'use client'

import { useState, useEffect } from 'react'
import { Button } from '@bu/ui/button'
import { Scale, X, UserPlus } from 'lucide-react'
import { cn } from '@bu/ui/cn'

interface DisclaimerBannerProps {
  onInviteLawyer?: () => void
  className?: string
}

export function DisclaimerBanner({ onInviteLawyer, className }: DisclaimerBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check session storage for dismissal
    const dismissed = sessionStorage.getItem('bufi_disclaimer_banner_dismissed')
    if (!dismissed) {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem('bufi_disclaimer_banner_dismissed', 'true')
    setIsDismissed(true)
  }

  if (!isVisible || isDismissed) return null

  return (
    <div 
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <span className="font-medium">Template Only</span>
          <span className="text-amber-600 dark:text-amber-400"> — Have your legal counsel review before signing</span>
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-amber-700 dark:text-amber-300 hover:text-amber-800 hover:bg-amber-500/20 bg-transparent"
          onClick={onInviteLawyer}
        >
          <UserPlus className="w-3.5 h-3.5 mr-1.5" />
          Invite Lawyer
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-500/20 bg-transparent"
          onClick={handleDismiss}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
