'use client'

import { Button } from '@bu/ui/button'
import { Label } from '@bu/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@bu/ui/select'
import { Switch } from '@bu/ui/switch'
import { Separator } from '@bu/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@bu/ui/sheet'
import {
  X,
  Settings2,
  Coins,
  Globe,
  TrendingUp,
  Shield,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { useContractStore } from '@/lib/contract-store'
import { usePodsStrategies } from '@/hooks/use-pods-strategies'

const chainOptions = [
  { value: 'ethereum', label: 'Ethereum', icon: '⟠' },
  { value: 'polygon', label: 'Polygon', icon: '⬟' },
  { value: 'arbitrum', label: 'Arbitrum', icon: '🔵' },
  { value: 'base', label: 'Base', icon: '🔷' },
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

  const { strategies, isLoading: strategiesLoading } = usePodsStrategies()
  const yieldEnabled = settings.yieldStrategy.enabled

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
            <div className="p-4 rounded-xl bg-muted/30 border border-borderFine shadow-sm">
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Earn Yield on Escrow</Label>
                </div>
                <Switch
                  checked={yieldEnabled}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      updateSettings({ yieldStrategy: { enabled: false } })
                    } else {
                      // Auto-select the highest APY strategy if available
                      const best = strategies.reduce<typeof strategies[number] | null>(
                        (prev, cur) => (!prev || cur.apy > prev.apy ? cur : prev),
                        null,
                      )
                      if (best) {
                        updateSettings({
                          yieldStrategy: {
                            enabled: true,
                            strategyId: best.id,
                            strategyName: best.name,
                            apy: best.apy,
                            podAddress: best.assetAddress,
                          },
                        })
                      } else {
                        updateSettings({ yieldStrategy: { enabled: false } })
                      }
                    }
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Deposit escrow funds into a DeFi yield strategy while awaiting milestone completion.
              </p>

              {yieldEnabled && (
                <div className="space-y-2">
                  {strategiesLoading ? (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-sm">Loading strategies...</span>
                    </div>
                  ) : strategies.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No yield strategies available at this time.
                    </p>
                  ) : (
                    strategies.filter((s) => !s.paused).map((strategy) => {
                      const isSelected =
                        settings.yieldStrategy.enabled &&
                        settings.yieldStrategy.strategyId === strategy.id
                      return (
                        <button
                          type="button"
                          key={strategy.id}
                          onClick={() =>
                            updateSettings({
                              yieldStrategy: {
                                enabled: true,
                                strategyId: strategy.id,
                                strategyName: strategy.name,
                                apy: strategy.apy,
                                podAddress: strategy.assetAddress,
                              },
                            })
                          }
                          className={cn(
                            'w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left',
                            isSelected
                              ? 'border-purpleDanis bg-muted/30'
                              : 'border-borderFine hover:border-purpleDanis/40',
                          )}
                        >
                          <div
                            className={cn(
                              'w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center',
                              isSelected ? 'border-purpleDanis bg-purpleDanis' : 'border-muted-foreground',
                            )}
                          >
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-foreground">{strategy.name}</p>
                              <span className="text-xs font-semibold text-purpleDanis">
                                {strategy.apy.toFixed(2)}% APY
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {strategy.protocol} &middot; {strategy.asset} &middot; {strategy.network}
                            </p>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              )}

              {yieldEnabled && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-[rgba(255,235,180,0.2)] border border-borderFine">
                  <AlertTriangle className="w-4 h-4 text-textDanis shrink-0 mt-0.5" />
                  <p className="text-xs text-textDanis">
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
