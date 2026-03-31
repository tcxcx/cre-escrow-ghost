'use client'

import { Label } from '@bu/ui/label'
import { Switch } from '@bu/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@bu/ui/select'
import { Coins, Globe, TrendingUp, Shield } from 'lucide-react'
import { useContractStore } from '@/lib/contract-store'

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
] as const

export function WizardStepEscrow() {
  const settings = useContractStore((s) => s.settings)
  const setSettings = useContractStore((s) => s.setSettings)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-darkText dark:text-whiteDanis">
          Escrow Configuration
        </h2>
        <p className="mt-1 text-sm text-purpleDanis">
          Choose the blockchain, currency, and escrow settings for this contract.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Chain */}
        <div className="rounded-xl border border-borderFine dark:border-darkBorder p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-purpleDanis" />
            <Label className="text-sm font-medium text-darkText dark:text-whiteDanis">
              Blockchain Network
            </Label>
          </div>
          <Select
            value={settings.chain}
            onValueChange={(v) => setSettings({ chain: v as typeof settings.chain })}
          >
            <SelectTrigger className="border-borderFine dark:border-darkBorder">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {chainOptions.map((chain) => (
                <SelectItem key={chain.value} value={chain.value}>
                  <span className="flex items-center gap-2">
                    <span>{chain.icon}</span>
                    <span>{chain.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Currency */}
        <div className="rounded-xl border border-borderFine dark:border-darkBorder p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-purpleDanis" />
            <Label className="text-sm font-medium text-darkText dark:text-whiteDanis">
              Currency
            </Label>
          </div>
          <Select
            value={settings.currency}
            onValueChange={(v) => setSettings({ currency: v })}
          >
            <SelectTrigger className="border-borderFine dark:border-darkBorder">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencyOptions.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{c.label}</span>
                    <span className="text-purpleDanis text-xs">{c.description}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Yield strategy */}
      <div className="rounded-xl border border-borderFine dark:border-darkBorder p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-vverde" />
            <div>
              <Label className="text-sm font-medium text-darkText dark:text-whiteDanis">
                Earn Yield on Escrow
              </Label>
              <p className="text-xs text-purpleDanis mt-0.5">
                Funds earn yield while held in escrow via DeFi protocols
              </p>
            </div>
          </div>
          <Switch
            checked={settings.yieldStrategy?.enabled ?? false}
            onCheckedChange={(checked) =>
              setSettings({ yieldStrategy: { ...settings.yieldStrategy, enabled: checked } })
            }
          />
        </div>
      </div>

      {/* Security info */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-vverde mt-0.5" />
          <div>
            <p className="text-sm font-medium text-vverde">Smart Contract Escrow</p>
            <p className="text-xs text-purpleDanis mt-1">
              Funds are held in an audited smart contract on-chain. Neither party can access
              funds until milestone conditions are met and verified.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
