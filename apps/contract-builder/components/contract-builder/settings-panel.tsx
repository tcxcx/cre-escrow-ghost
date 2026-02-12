'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  X,
  Settings2,
  Coins,
  Globe,
  TrendingUp,
  Shield,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useContractStore } from '@/lib/contract-store'

const chainOptions = [
  { value: 'ethereum', label: 'Ethereum', icon: '⟠' },
  { value: 'polygon', label: 'Polygon', icon: '⬟' },
  { value: 'arbitrum', label: 'Arbitrum', icon: '🔵' },
  { value: 'base', label: 'Base', icon: '🔷' },
] as const

const yieldOptions = [
  { value: 'none', label: 'No Yield', description: 'Funds held in escrow without interest' },
  { value: 'aave', label: 'AAVE', description: 'Earn yield through AAVE lending protocol' },
  { value: 'compound', label: 'Compound', description: 'Earn yield through Compound protocol' },
] as const

const currencyOptions = [
  { value: 'USDC', label: 'USDC', description: 'USD Coin' },
  { value: 'USDT', label: 'USDT', description: 'Tether' },
  { value: 'DAI', label: 'DAI', description: 'Dai Stablecoin' },
  { value: 'ETH', label: 'ETH', description: 'Ethereum' },
] as const

export function SettingsPanel() {
  const {
    isSettingsOpen,
    setSettingsOpen,
    settings,
    updateSettings,
    nodes,
  } = useContractStore()

  // Calculate total from milestones and payments
  const calculatedTotal = nodes.reduce((sum, node) => {
    if (node.type === 'milestone' || node.type === 'payment') {
      const data = node.data as { amount?: number }
      return sum + (data.amount || 0)
    }
    return sum
  }, 0)

  // Calculate total commissions
  const totalCommissions = nodes.reduce((sum, node) => {
    if (node.type === 'commission') {
      const data = node.data as { percentage?: number }
      return sum + (data.percentage || 0)
    }
    return sum
  }, 0)

  return (
    <Sheet open={isSettingsOpen} onOpenChange={setSettingsOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-card border-border">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <SheetHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                <SheetTitle className="text-lg font-semibold">Contract Settings</SheetTitle>
              </div>
              <SheetDescription className="text-sm text-muted-foreground">
                Configure escrow and payment settings
              </SheetDescription>
            </SheetHeader>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 bg-transparent"
              onClick={() => setSettingsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Contract Value Summary */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Contract Value</span>
                <Coins className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                ${calculatedTotal.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {settings.currency}
                </span>
              </p>
              {totalCommissions > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Commission: {totalCommissions}% (${Math.round(calculatedTotal * totalCommissions / 100).toLocaleString()})
                </p>
              )}
            </div>

            <Separator />

            {/* Blockchain Network */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Blockchain Network</Label>
              </div>
              <Select
                value={settings.chain}
                onValueChange={(value) => updateSettings({ chain: value as typeof settings.chain })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chainOptions.map((chain) => (
                    <SelectItem key={chain.value} value={chain.value}>
                      <div className="flex items-center gap-2">
                        <span>{chain.icon}</span>
                        <span>{chain.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The blockchain where your contract will be deployed
              </p>
            </div>

            <Separator />

            {/* Payment Currency */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Payment Currency</Label>
              </div>
              <Select
                value={settings.currency}
                onValueChange={(value) => updateSettings({ currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{currency.label}</span>
                        <span className="text-muted-foreground">- {currency.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Yield Strategy */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Yield Strategy</Label>
              </div>
              <div className="space-y-2">
                {yieldOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => updateSettings({ yieldStrategy: option.value as typeof settings.yieldStrategy })}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left',
                      settings.yieldStrategy === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center',
                      settings.yieldStrategy === option.value
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    )}>
                      {settings.yieldStrategy === option.value && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              {settings.yieldStrategy !== 'none' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-400/90">
                    Yield strategies involve DeFi protocols which carry smart contract risks. Funds may be subject to protocol fees and variable APY.
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Security Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Security Options</Label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Multi-sig Approval</p>
                  <p className="text-xs text-muted-foreground">Require multiple signatures for releases</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Dispute Resolution</p>
                  <p className="text-xs text-muted-foreground">Enable 3rd party arbitration</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Auto-release Timer</p>
                  <p className="text-xs text-muted-foreground">Release funds after 14 days if no dispute</p>
                </div>
                <Switch />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <Button className="w-full" onClick={() => setSettingsOpen(false)}>
              Apply Settings
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
