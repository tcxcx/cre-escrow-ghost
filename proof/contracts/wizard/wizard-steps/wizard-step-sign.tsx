'use client'

import { Button } from '@bu/ui/button'
import { Input } from '@bu/ui/input'
import { Label } from '@bu/ui/label'
import { Send, Copy, Link2, Check } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@bu/ui/cn'
import { useContractStore } from '@/lib/contract-store'

export function WizardStepSign() {
  const contractName = useContractStore((s) => s.contractName)
  const setContractName = useContractStore((s) => s.setContractName)
  const nodes = useContractStore((s) => s.nodes)
  const [copied, setCopied] = useState(false)

  const payees = nodes.filter((n) => n.type === 'party-payee')
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/share/contracts/preview` : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-darkText dark:text-whiteDanis">
          Finalize & Send
        </h2>
        <p className="mt-1 text-sm text-purpleDanis">
          Name your contract, then send it to the counterparty for signature.
        </p>
      </div>

      {/* Contract name */}
      <div className="rounded-xl border border-borderFine dark:border-darkBorder p-4 space-y-3">
        <Label className="text-sm font-medium text-darkText dark:text-whiteDanis">
          Contract Name
        </Label>
        <Input
          value={contractName}
          onChange={(e) => setContractName(e.target.value)}
          placeholder="e.g. Web Design Agreement — Acme Corp"
          className="border-borderFine dark:border-darkBorder"
        />
      </div>

      {/* Counterparty invites */}
      <div className="rounded-xl border border-borderFine dark:border-darkBorder p-4 space-y-4">
        <p className="text-xs text-purpleDanis uppercase tracking-wider font-semibold">
          Send to Counterparty
        </p>

        {payees.length > 0 ? (
          <div className="space-y-3">
            {payees.map((n) => {
              const d = n.data as { name?: string; email?: string }
              return (
                <div
                  key={n.id}
                  className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-950/50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-darkText dark:text-whiteDanis">
                      {d.name || 'Unnamed'}
                    </p>
                    <p className="text-xs text-purpleDanis">{d.email || 'No email'}</p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-2 bg-purpleDanis hover:bg-violeta text-white"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send Invite
                  </Button>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-purpleDanis">No payees configured</p>
        )}
      </div>

      {/* Share link */}
      <div className="rounded-xl border border-borderFine dark:border-darkBorder p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-purpleDanis" />
          <p className="text-sm font-medium text-darkText dark:text-whiteDanis">
            Shareable Link
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            readOnly
            value={shareUrl}
            className="border-borderFine dark:border-darkBorder text-xs font-mono flex-1"
          />
          <Button
            variant="glass"
            size="icon"
            onClick={handleCopy}
            className="border-borderFine dark:border-darkBorder shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-vverde" />
            ) : (
              <Copy className="h-4 w-4 text-purpleDanis" />
            )}
          </Button>
        </div>
        <p className="text-xs text-purpleDanis">
          Share this link with anyone who needs to view or sign this contract.
        </p>
      </div>
    </div>
  )
}
