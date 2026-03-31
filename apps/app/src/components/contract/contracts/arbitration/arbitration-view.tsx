'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@bu/ui/badge'
import { Button } from '@bu/ui/button'
import { ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { cn } from '@bu/ui/cn'
import type { DisputeRecord } from '@/types/arbitration'
import { transformArtifactsToDisputeRecord } from './transform-artifacts'
import { getAgreementArtifacts, getAgreement } from '@/lib/api/client'
import { ArbitrationTimeline } from './arbitration-timeline'
import { AdvocateBriefCard } from './advocate-brief-card'
import { TribunalPanel } from './tribunal-panel'
import { SupremeCourtPanel } from './supreme-court-panel'
import { AuditTrail } from './audit-trail'
import { FinalOutcomeCard } from './final-outcome-card'
import { DisputeWindowBanner } from './dispute-window-banner'

const phaseLabels: Record<string, string> = {
  dispute_window: 'Dispute Window',
  advocates: 'Advocates',
  tribunal: 'Tribunal',
  tribunal_decided: 'Tribunal Decided',
  appeal_window: 'Appeal Window',
  supreme_court: 'Supreme Court',
  final: 'Resolved',
}

interface ArbitrationViewProps {
  contractId: string
  milestoneId: string
}

export function ArbitrationView({ contractId, milestoneId }: ArbitrationViewProps) {
  const router = useRouter()
  const [dispute, setDispute] = useState<DisputeRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [{ artifacts }, agreement] = await Promise.all([
        getAgreementArtifacts(contractId),
        getAgreement(contractId),
      ])

      const milestone = agreement.milestones.find((m) => m.id === milestoneId)

      const record = transformArtifactsToDisputeRecord(artifacts, {
        contractId,
        contractName: agreement.title,
        milestoneId,
        milestoneName: milestone?.title ?? `Milestone ${milestone?.index ?? 0}`,
        disputeWindowEnd: milestone?.dispute_window_end ?? undefined,
        totalAmount: milestone?.amount ?? agreement.total_amount,
      })

      setDispute(record)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [contractId, milestoneId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !dispute) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-3">
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground" onClick={() => router.back()}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">{error ?? 'No dispute data found.'}</p>
          {error && (
            <Button variant="outline" size="sm" onClick={fetchData}>
              Try again
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground" onClick={() => router.back()}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">AI Arbitration</Badge>
            <Badge variant="outline" className="text-xs">{phaseLabels[dispute.phase]}</Badge>
          </div>
          <h1 className="text-xl font-semibold text-foreground">{dispute.contractName}</h1>
          <p className="text-sm text-muted-foreground">Milestone: {dispute.milestoneName} -- #{dispute.id.slice(-6)}</p>
        </div>

        {/* Final outcome at top if resolved */}
        {dispute.phase === 'final' && <FinalOutcomeCard dispute={dispute} className="mb-6" />}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
          {/* Main */}
          <div className="space-y-6">
            {/* Dispute window */}
            {dispute.phase === 'dispute_window' && dispute.disputeWindowEnd && (
              <DisputeWindowBanner
                milestoneId={dispute.milestoneId}
                contractId={dispute.contractId}
                windowEndTime={dispute.disputeWindowEnd}
                verificationConfidence={dispute.verificationReport.confidence}
                currentUserRole="payer"
                onDisputeFiled={fetchData}
              />
            )}

            {/* Layer 1 -- Verification card */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Layer 1 -- Verification</h2>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">{dispute.verificationReport.verdict}</Badge>
                <span className="text-sm tabular-nums text-muted-foreground">{dispute.verificationReport.confidence}% confidence</span>
                <span className="text-xs text-muted-foreground">{dispute.verificationReport.model.provider}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{dispute.verificationReport.summary}</p>
              <div className="space-y-1.5">
                {dispute.verificationReport.criteriaEvaluation.map((c) => (
                  <div key={c.criterionId} className="flex items-start gap-2 text-sm">
                    <span className={cn('shrink-0 mt-0.5', c.met ? 'text-foreground' : 'text-muted-foreground')}>{c.met ? '+' : '-'}</span>
                    <div>
                      <span className={cn(c.met ? 'text-foreground' : 'text-muted-foreground')}>{c.criterionDescription}</span>
                      <span className="text-xs text-muted-foreground ml-2">{c.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground font-mono pt-1">{dispute.verificationReport.hash.slice(0, 24)}...</p>
            </div>

            {/* Layer 2 -- Advocates card */}
            {dispute.advocateBriefProvider && dispute.advocateBriefClient && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Layer 2 -- Advocates</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border p-4">
                    <AdvocateBriefCard brief={dispute.advocateBriefProvider} partyName="Provider" />
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <AdvocateBriefCard brief={dispute.advocateBriefClient} partyName="Client" />
                  </div>
                </div>
              </div>
            )}

            {/* Layer 3 -- Tribunal card */}
            {dispute.tribunalDecision && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Layer 3 -- Tribunal</h2>
                <TribunalPanel decision={dispute.tribunalDecision} />
              </div>
            )}

            {/* Layer 4 -- Supreme Court card */}
            {dispute.supremeCourtDecision && dispute.tribunalDecision && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Layer 4 -- Supreme Court</h2>
                <SupremeCourtPanel decision={dispute.supremeCourtDecision} tribunalDirection={dispute.tribunalDecision.direction} />
              </div>
            )}

            {/* Audit trail card */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Audit trail</h2>
              <AuditTrail documents={dispute.auditTrail} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timeline card */}
            <div className="rounded-xl border border-border bg-card p-5">
              <ArbitrationTimeline
                currentPhase={dispute.phase}
                disputeWindowEnd={dispute.disputeWindowEnd}
                appealWindowEnd={dispute.appealWindowEnd}
                tribunalUnanimous={dispute.tribunalDecision?.unanimous}
              />
            </div>

            {/* Dispute info card */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dispute info</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Filed by</span>
                  <p className="font-medium text-foreground capitalize">{dispute.filedBy}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium text-foreground">{new Date(dispute.filedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount</span>
                  <p className="font-medium text-foreground tabular-nums">${dispute.disputedAmount.toLocaleString()} {dispute.currency}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Reason</span>
                  <p className="text-foreground">{dispute.reason}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Evidence</span>
                  {dispute.supportingEvidence.map((ev) => (
                    <p key={ev} className="text-foreground flex items-center gap-1.5"><FileText className="w-3 h-3 text-muted-foreground" />{ev}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
