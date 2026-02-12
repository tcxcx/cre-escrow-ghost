'use client'

import { useState, useEffect } from 'react'

export function usePlatform() {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0)
  }, [])

  return { isMac }
}

export function useModifierKey() {
  const { isMac } = usePlatform()
  
  return {
    mod: isMac ? '⌘' : 'Ctrl',
    shift: isMac ? '⇧' : 'Shift',
    alt: isMac ? '⌥' : 'Alt',
    ctrl: isMac ? '⌃' : 'Ctrl',
  }
}
