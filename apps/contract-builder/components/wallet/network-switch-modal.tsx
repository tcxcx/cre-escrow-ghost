'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NetworkSwitchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentNetwork: string
  requiredNetwork: string
  onSwitch: () => Promise<void>
}

const networks: Record<string, { name: string; icon: string; color: string }> = {
  'avalanche': {
    name: 'Avalanche C-Chain',
    icon: '/networks/avalanche.svg',
    color: 'from-red-500 to-red-600',
  },
  'ethereum': {
    name: 'Ethereum Mainnet',
    icon: '/networks/ethereum.svg',
    color: 'from-blue-500 to-purple-500',
  },
  'polygon': {
    name: 'Polygon',
    icon: '/networks/polygon.svg',
    color: 'from-purple-500 to-purple-600',
  },
  'arbitrum': {
    name: 'Arbitrum One',
    icon: '/networks/arbitrum.svg',
    color: 'from-blue-400 to-blue-500',
  },
}

export function NetworkSwitchModal({ 
  open, 
  onOpenChange, 
  currentNetwork, 
  requiredNetwork,
  onSwitch 
}: NetworkSwitchModalProps) {
  const [isSwitching, setIsSwitching] = useState(false)

  const current = networks[currentNetwork] || { name: currentNetwork, color: 'from-gray-500 to-gray-600' }
  const required = networks[requiredNetwork] || { name: requiredNetwork, color: 'from-gray-500 to-gray-600' }

  const handleSwitch = async () => {
    setIsSwitching(true)
    try {
      await onSwitch()
      onOpenChange(false)
    } catch (error) {
      // Handle error
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            Wrong Network
          </DialogTitle>
          <DialogDescription>
            Please switch networks to continue with this contract
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="p-6 rounded-lg border border-border bg-muted/30">
            <p className="text-center text-sm text-muted-foreground mb-4">
              This contract is on <span className="font-semibold text-foreground">{required.name}</span>
            </p>

            {/* Network Visual */}
            <div className="flex items-center justify-center gap-4 my-6">
              <div className="text-center">
                <div className={cn(
                  'w-12 h-12 rounded-full bg-gradient-to-br mx-auto mb-2 flex items-center justify-center',
                  current.color
                )}>
                  <div className="w-6 h-6 rounded-full bg-white/20" />
                </div>
                <p className="text-xs text-muted-foreground">{current.name}</p>
                <p className="text-xs text-red-500">Current</p>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground" />

              <div className="text-center">
                <div className={cn(
                  'w-12 h-12 rounded-full bg-gradient-to-br mx-auto mb-2 flex items-center justify-center',
                  required.color
                )}>
                  <div className="w-6 h-6 rounded-full bg-white/20" />
                </div>
                <p className="text-xs text-muted-foreground">{required.name}</p>
                <p className="text-xs text-emerald-500">Required</p>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Your wallet is connected to: <span className="font-medium text-foreground">{current.name}</span>
            </p>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleSwitch}
              disabled={isSwitching}
              className="w-full gap-2"
              size="lg"
            >
              {isSwitching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Switching...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Switch to {required.name}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
