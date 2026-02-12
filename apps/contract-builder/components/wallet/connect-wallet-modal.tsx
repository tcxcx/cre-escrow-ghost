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
  Wallet,
  ExternalLink,
  ArrowRight,
  Loader2,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConnectWalletModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnect: (walletType: string) => Promise<void>
}

const wallets = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '/wallets/metamask.svg',
    description: 'Popular',
    color: 'from-orange-500/10 to-orange-600/10',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '/wallets/coinbase.svg',
    description: null,
    color: 'from-blue-500/10 to-blue-600/10',
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    icon: '/wallets/rainbow.svg',
    description: null,
    color: 'from-purple-500/10 to-pink-500/10',
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '/wallets/walletconnect.svg',
    description: 'Scan with mobile wallet',
    color: 'from-blue-400/10 to-blue-500/10',
  },
]

export function ConnectWalletModal({ open, onOpenChange, onConnect }: ConnectWalletModalProps) {
  const [connecting, setConnecting] = useState<string | null>(null)

  const handleConnect = async (walletId: string) => {
    setConnecting(walletId)
    try {
      await onConnect(walletId)
      onOpenChange(false)
    } catch (error) {
      // Handle error
    } finally {
      setConnecting(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Connect your wallet to sign contracts and fund escrow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {wallets.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => handleConnect(wallet.id)}
              disabled={connecting !== null}
              className={cn(
                'w-full flex items-center justify-between p-4 rounded-lg border border-border',
                'hover:bg-muted/50 transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'group'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br',
                  wallet.color
                )}>
                  {/* Wallet icon placeholder - in production use actual icons */}
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/50 to-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">{wallet.name}</p>
                  {wallet.description && (
                    <p className="text-xs text-muted-foreground">{wallet.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {connecting === wallet.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* New to Web3 Section */}
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm">New to Web3?</p>
              <p className="text-sm text-muted-foreground mt-1">
                BUFI uses blockchain for secure, trustless contracts. You'll need a wallet to sign and fund contracts.
              </p>
              <Button variant="link" className="h-auto p-0 mt-2 text-primary" asChild>
                <a href="https://learn.bufi.finance/wallets" target="_blank" rel="noopener noreferrer">
                  Learn More
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
