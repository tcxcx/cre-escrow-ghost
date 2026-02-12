'use client'

import React, { useState, useEffect } from 'react'
import { Receipt, Hash, Users, Banknote, ExternalLink, Shield, CheckCircle2, XCircle, Scale } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getMilestoneReceipt } from '@/lib/api/client'

interface ReceiptData {
  id: string
  content_json: {
    schemaVersion: string
    agreementId: string
    milestoneId: string
    decision: {
      type: string
      payeeBps: number
      payerBps: number
    }
    payouts?: Array<{
      to: string
      amount: string
      label: string
    }>
    agentIdentities?: {
      executorAgentId?: string
      verifierAgentId?: string
      tribunalAgentIds?: string[]
    }
    artifacts?: Array<{
      index: number
      hash: string
    }>
    onchain?: {
      escrowAddress?: string
      chain?: string
      setDecisionTx?: string
      executeDecisionTx?: string
    }
    timestamp?: string
  }
  sha256: string
  storage_ref: string
}

interface ReceiptViewerProps {
  agreementId: string
  milestoneId: string
}

export function ReceiptViewer({ agreementId, milestoneId }: ReceiptViewerProps) {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getMilestoneReceipt(agreementId, milestoneId)
        setReceipt(data as ReceiptData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load receipt')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [agreementId, milestoneId])

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading receipt...</div>
  }

  if (error || !receipt) {
    return (
      <div className="p-6 text-center">
        <Receipt className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{error || 'No receipt available yet.'}</p>
      </div>
    )
  }

  const { content_json: data } = receipt
  const decisionType = data.decision?.type || 'unknown'

  const DecisionIcon = decisionType === 'approve' ? CheckCircle2
    : decisionType === 'deny' ? XCircle
    : Scale

  const decisionColor = decisionType === 'approve' ? 'text-emerald-500'
    : decisionType === 'deny' ? 'text-red-500'
    : 'text-amber-500'

  return (
    <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Final Receipt</h3>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {receipt.sha256.slice(0, 12)}...
        </Badge>
      </div>

      {/* Decision */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
        <DecisionIcon className={`w-8 h-8 ${decisionColor}`} />
        <div>
          <p className="font-semibold text-foreground capitalize">{decisionType}</p>
          <p className="text-sm text-muted-foreground">
            Payee: {(data.decision?.payeeBps || 0) / 100}% | Payer: {(data.decision?.payerBps || 0) / 100}%
          </p>
        </div>
      </div>

      {/* Payouts */}
      {data.payouts && data.payouts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Banknote className="w-4 h-4" />
            Payouts
          </div>
          {data.payouts.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
              <div>
                <span className="text-muted-foreground">{p.label}:</span>{' '}
                <code className="font-mono text-xs">{p.to.slice(0, 6)}...{p.to.slice(-4)}</code>
              </div>
              <span className="font-medium">{p.amount} USDC</span>
            </div>
          ))}
        </div>
      )}

      {/* Agent Identities */}
      {data.agentIdentities && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Users className="w-4 h-4" />
            Agent Identities (ERC-8004)
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {data.agentIdentities.executorAgentId && (
              <div className="p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">Executor:</span>{' '}
                <span className="font-mono">#{data.agentIdentities.executorAgentId}</span>
              </div>
            )}
            {data.agentIdentities.verifierAgentId && (
              <div className="p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">Verifier:</span>{' '}
                <span className="font-mono">#{data.agentIdentities.verifierAgentId}</span>
              </div>
            )}
            {data.agentIdentities.tribunalAgentIds?.map((id, i) => (
              <div key={i} className="p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">Juror {i + 1}:</span>{' '}
                <span className="font-mono">#{id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* On-chain References */}
      {data.onchain && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Shield className="w-4 h-4" />
            On-chain
          </div>
          <div className="space-y-1 text-xs">
            {data.onchain.escrowAddress && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Escrow:</span>
                <code className="font-mono">{data.onchain.escrowAddress}</code>
              </div>
            )}
            {data.onchain.setDecisionTx && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">setDecision tx:</span>
                <a
                  href={`https://testnet.snowtrace.io/tx/${data.onchain.setDecisionTx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline flex items-center gap-1"
                >
                  {data.onchain.setDecisionTx.slice(0, 10)}...
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {data.onchain.executeDecisionTx && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">execute tx:</span>
                <a
                  href={`https://testnet.snowtrace.io/tx/${data.onchain.executeDecisionTx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline flex items-center gap-1"
                >
                  {data.onchain.executeDecisionTx.slice(0, 10)}...
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Artifact Hashes */}
      {data.artifacts && data.artifacts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Hash className="w-4 h-4" />
            Artifact Hashes ({data.artifacts.length})
          </div>
          <div className="space-y-1">
            {data.artifacts.map((a, i) => (
              <div key={i} className="text-xs font-mono text-muted-foreground truncate">
                {i}: {a.hash}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receipt Hash (anchored on-chain) */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          Receipt hash (on-chain): <code className="font-mono">{receipt.sha256}</code>
        </div>
      </div>
    </div>
  )
}
