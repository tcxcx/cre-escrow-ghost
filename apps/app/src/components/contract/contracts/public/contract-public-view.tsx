'use client'

import { EscrowBalanceCard } from '../escrow/escrow-balance-card'
import { Badge } from '@bu/ui/badge'
import { Button } from '@bu/ui/button'
import { FileText, ExternalLink } from 'lucide-react'

interface ContractPublicViewProps {
  agreement: Record<string, unknown>
  token: string
}

export function ContractPublicView({ agreement, token }: ContractPublicViewProps) {
  const agreementJson = agreement.agreement_json as Record<string, unknown> | null
  const milestones = (agreementJson?.milestones as Array<Record<string, unknown>>) ?? []
  const escrowAddress = agreement.escrow_address as string | null
  const title = (agreement.title as string) ?? 'Untitled Contract'
  const status = (agreement.status as string) ?? 'unknown'
  const totalAmount = (agreement.total_amount as number) ?? 0
  const fundedAmount = (agreement.funded_amount as number) ?? 0
  const contractId = agreement.id as string

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/30 border border-borderFine mb-4">
          <FileText className="w-6 h-6 text-purpleDanis" />
        </div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <Badge className="mt-2" variant="outline">
          {status}
        </Badge>
      </div>

      {/* Escrow Balance */}
      {escrowAddress && (
        <EscrowBalanceCard
          contractId={contractId}
          totalAmount={totalAmount}
          releasedAmount={0}
          pendingAmount={fundedAmount}
          currency="USDC"
          yieldEarned={0}
          yieldApy={0}
          yieldStrategy="none"
        />
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Milestones
          </h2>
          {milestones.map((m, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-borderFine bg-muted/30 shadow-sm"
            >
              <div className="flex justify-between">
                <span className="text-sm font-medium">
                  {(m.title as string) ?? `Milestone ${i + 1}`}
                </span>
                <span className="text-sm font-bold text-purpleDanis">
                  ${((m.amount as number) ?? 0).toLocaleString()}
                </span>
              </div>
              {m.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {m.description as string}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Etherscan link */}
      {escrowAddress && (
        <div className="mt-6">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() =>
              window.open(
                `https://sepolia.etherscan.io/address/${escrowAddress}`,
                '_blank',
              )
            }
          >
            <ExternalLink className="w-4 h-4" />
            Verify on Etherscan
          </Button>
        </div>
      )}
    </div>
  )
}
