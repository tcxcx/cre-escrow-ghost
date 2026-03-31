import type { Artifact } from '@/lib/api/client'
import type {
  DisputeRecord,
  DisputePhase,
  VerificationReport,
  AdvocateBrief,
  TribunalDecision,
  TribunalJudgeVerdict,
  SupremeCourtDecision,
  SupremeCourtJudgeVerdict,
  AuditDocument,
} from '@/types/arbitration'

interface DisputeContext {
  contractId: string
  contractName: string
  milestoneId: string
  milestoneName: string
  disputeWindowEnd?: string
  totalAmount: number
}

// ── Doc type constants ──────────────────────────────────────────────────

const DOC_VERIFICATION = 'VerificationReportJSON'
const DOC_ADVOCATE_PROVIDER = 'AdvocateBriefProviderJSON'
const DOC_ADVOCATE_CLIENT = 'AdvocateBriefClientJSON'
const DOC_TRIBUNAL_VERDICT = 'TribunalVerdictJSON'
const DOC_TRIBUNAL_DECISION = 'TribunalDecisionJSON'
const DOC_SUPREME_VERDICT = 'SupremeCourtVerdictJSON'
const DOC_SUPREME_DECISION = 'SupremeCourtDecisionJSON'
const DOC_DISPUTE_FILED = 'DisputeFiledJSON'
const DOC_FINAL_RECEIPT = 'FinalReceiptJSON'

// ── Helpers ─────────────────────────────────────────────────────────────

function findByDocType(artifacts: Artifact[], docType: string): Artifact | undefined {
  return artifacts.find((a) => a.doc_type === docType)
}

function filterByDocType(artifacts: Artifact[], docType: string): Artifact[] {
  return artifacts.filter((a) => a.doc_type === docType)
}

function json(artifact: Artifact): Record<string, unknown> {
  return artifact.content_json
}

// ── Layer extractors ────────────────────────────────────────────────────

function extractVerificationReport(artifact: Artifact): VerificationReport {
  const c = json(artifact)
  return {
    verdict: (c.verdict as string) ?? 'UNKNOWN',
    confidence: (c.confidence as number) ?? 0,
    summary: (c.summary as string) ?? '',
    model: {
      provider: artifact.model_provider,
      id: artifact.model_id,
    },
    criteriaEvaluation: Array.isArray(c.criteriaEvaluation)
      ? (c.criteriaEvaluation as VerificationReport['criteriaEvaluation'])
      : [],
    hash: artifact.sha256,
  }
}

function extractAdvocateBrief(artifact: Artifact, role: 'pro_provider' | 'pro_client'): AdvocateBrief {
  const c = json(artifact)
  return {
    advocateRole: role,
    positionSummary: (c.positionSummary as string) ?? (c.summary as string) ?? '',
    keyArguments: Array.isArray(c.keyArguments)
      ? (c.keyArguments as AdvocateBrief['keyArguments'])
      : [],
    recommendedVerdict: (c.recommendedVerdict as AdvocateBrief['recommendedVerdict']) ?? 'PARTIAL',
    recommendedAmountPct: (c.recommendedAmountPct as number) ?? 0,
    model: {
      provider: artifact.model_provider,
      id: artifact.model_id,
    },
    hash: artifact.sha256,
  }
}

function extractTribunalVerdict(artifact: Artifact, index: number): TribunalJudgeVerdict {
  const c = json(artifact)
  return {
    verdictId: artifact.id,
    judgeIndex: (c.judgeIndex as number) ?? index,
    verdict: (c.verdict as TribunalJudgeVerdict['verdict']) ?? 'PARTIAL',
    paymentPct: (c.paymentPct as number) ?? 0,
    confidence: (c.confidence as number) ?? 0,
    reasoning: {
      summary: (c.reasoning as Record<string, unknown>)?.summary as string ?? (c.summary as string) ?? '',
      criteriaAnalysis: Array.isArray((c.reasoning as Record<string, unknown>)?.criteriaAnalysis)
        ? ((c.reasoning as Record<string, unknown>).criteriaAnalysis as TribunalJudgeVerdict['reasoning']['criteriaAnalysis'])
        : [],
    },
    model: {
      provider: artifact.model_provider,
      id: artifact.model_id,
    },
    hash: artifact.sha256,
  }
}

function extractTribunalDecision(artifacts: Artifact[]): TribunalDecision | undefined {
  const decisionArtifact = findByDocType(artifacts, DOC_TRIBUNAL_DECISION)
  const verdictArtifacts = filterByDocType(artifacts, DOC_TRIBUNAL_VERDICT)

  if (!decisionArtifact && verdictArtifacts.length === 0) return undefined

  const verdicts = verdictArtifacts.map((a, i) => extractTribunalVerdict(a, i + 1))

  if (decisionArtifact) {
    const c = json(decisionArtifact)
    return {
      direction: (c.direction as TribunalDecision['direction']) ?? 'PARTIAL',
      vote: (c.vote as string) ?? '',
      paymentPct: (c.paymentPct as number) ?? 0,
      unanimous: (c.unanimous as boolean) ?? false,
      appealable: (c.appealable as boolean) ?? false,
      dissenter: (c.dissenter as number | null) ?? null,
      verdicts,
    }
  }

  // Derive from individual verdicts if no aggregate decision artifact
  const votes = verdicts.map((v) => v.verdict)
  const majorityVote = votes.sort((a, b) =>
    votes.filter((v) => v === b).length - votes.filter((v) => v === a).length
  )[0] ?? 'PARTIAL'
  const avgPct = verdicts.length > 0
    ? Math.round(verdicts.reduce((s, v) => s + v.paymentPct, 0) / verdicts.length)
    : 0
  const unanimous = new Set(votes).size === 1

  return {
    direction: majorityVote,
    vote: `${votes.filter((v) => v === majorityVote).length}-${votes.filter((v) => v !== majorityVote).length}`,
    paymentPct: avgPct,
    unanimous,
    appealable: !unanimous,
    dissenter: !unanimous
      ? verdicts.find((v) => v.verdict !== majorityVote)?.judgeIndex ?? null
      : null,
    verdicts,
  }
}

function extractSupremeCourtVerdict(artifact: Artifact, index: number): SupremeCourtJudgeVerdict {
  const c = json(artifact)
  const reasoning = (c.reasoning as Record<string, unknown>) ?? {}
  return {
    verdictId: artifact.id,
    judgeIndex: (c.judgeIndex as number) ?? index,
    verdict: (c.verdict as SupremeCourtJudgeVerdict['verdict']) ?? 'PARTIAL',
    paymentPct: (c.paymentPct as number) ?? 0,
    confidence: (c.confidence as number) ?? 0,
    reasoning: {
      summary: (reasoning.summary as string) ?? (c.summary as string) ?? '',
      upholdsTribunal: (reasoning.upholdsTribunal as boolean) ?? false,
      responseToTribunalMajority: (reasoning.responseToTribunalMajority as string) ?? '',
      responseToTribunalDissent: (reasoning.responseToTribunalDissent as string) ?? '',
    },
    model: {
      provider: artifact.model_provider,
      id: artifact.model_id,
    },
    hash: artifact.sha256,
  }
}

function extractSupremeCourtDecision(artifacts: Artifact[]): SupremeCourtDecision | undefined {
  const decisionArtifact = findByDocType(artifacts, DOC_SUPREME_DECISION)
  const verdictArtifacts = filterByDocType(artifacts, DOC_SUPREME_VERDICT)

  if (!decisionArtifact && verdictArtifacts.length === 0) return undefined

  const verdicts = verdictArtifacts.map((a, i) => extractSupremeCourtVerdict(a, i + 1))

  if (decisionArtifact) {
    const c = json(decisionArtifact)
    return {
      overturned: (c.overturned as boolean) ?? false,
      vote: (c.vote as string) ?? '',
      finalDirection: (c.finalDirection as SupremeCourtDecision['finalDirection']) ?? 'PARTIAL',
      paymentPct: (c.paymentPct as number) ?? 0,
      verdicts,
    }
  }

  // Derive from individual verdicts
  const upholdCount = verdicts.filter((v) => v.reasoning.upholdsTribunal).length
  const overturned = upholdCount <= 1 // 4/5 needed to overturn
  const votes = verdicts.map((v) => v.verdict)
  const majorityVote = votes.sort((a, b) =>
    votes.filter((v) => v === b).length - votes.filter((v) => v === a).length
  )[0] ?? 'PARTIAL'
  const avgPct = verdicts.length > 0
    ? Math.round(verdicts.reduce((s, v) => s + v.paymentPct, 0) / verdicts.length)
    : 0

  return {
    overturned,
    vote: `${votes.filter((v) => v === majorityVote).length}-${votes.filter((v) => v !== majorityVote).length}`,
    finalDirection: majorityVote,
    paymentPct: avgPct,
    verdicts,
  }
}

// ── Audit trail builder ─────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  [DOC_VERIFICATION]: 'Verification Report',
  [DOC_ADVOCATE_PROVIDER]: 'Provider Advocate Brief',
  [DOC_ADVOCATE_CLIENT]: 'Client Advocate Brief',
  [DOC_TRIBUNAL_VERDICT]: 'Tribunal Judge Verdict',
  [DOC_TRIBUNAL_DECISION]: 'Tribunal Decision',
  [DOC_SUPREME_VERDICT]: 'Supreme Court Justice Verdict',
  [DOC_SUPREME_DECISION]: 'Supreme Court Decision',
  [DOC_DISPUTE_FILED]: 'Dispute Filed',
  [DOC_FINAL_RECEIPT]: 'Final Receipt',
}

function buildAuditTrail(artifacts: Artifact[]): AuditDocument[] {
  return artifacts
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((a) => ({
      id: a.id,
      layer: a.layer,
      title: DOC_TYPE_LABELS[a.doc_type] ?? a.doc_type,
      hash: a.sha256,
      createdAt: a.created_at,
    }))
}

// ── Phase derivation ────────────────────────────────────────────────────

function derivePhase(artifacts: Artifact[], disputeWindowEnd?: string): DisputePhase {
  const has = (dt: string) => artifacts.some((a) => a.doc_type === dt)

  if (has(DOC_FINAL_RECEIPT)) return 'final'
  if (has(DOC_SUPREME_DECISION) || has(DOC_SUPREME_VERDICT)) return 'supreme_court'

  if (has(DOC_TRIBUNAL_DECISION)) {
    // Check if tribunal was unanimous -- if not, there's an appeal window
    const decision = findByDocType(artifacts, DOC_TRIBUNAL_DECISION)
    const unanimous = decision ? (json(decision).unanimous as boolean) : true
    if (!unanimous) return 'appeal_window'
    return 'tribunal_decided'
  }

  if (has(DOC_TRIBUNAL_VERDICT)) return 'tribunal'
  if (has(DOC_ADVOCATE_PROVIDER) || has(DOC_ADVOCATE_CLIENT)) return 'advocates'

  if (disputeWindowEnd && new Date(disputeWindowEnd).getTime() > Date.now()) {
    return 'dispute_window'
  }

  return 'verification'
}

// ── Main transform ──────────────────────────────────────────────────────

export function transformArtifactsToDisputeRecord(
  artifacts: Artifact[],
  context: DisputeContext,
): DisputeRecord {
  // Extract dispute metadata from DisputeFiledJSON if present
  const disputeArtifact = findByDocType(artifacts, DOC_DISPUTE_FILED)
  const disputeMeta = disputeArtifact ? json(disputeArtifact) : {}

  // Extract verification report (always expected)
  const verificationArtifact = findByDocType(artifacts, DOC_VERIFICATION)
  const verificationReport = verificationArtifact
    ? extractVerificationReport(verificationArtifact)
    : {
        verdict: 'PENDING',
        confidence: 0,
        summary: 'Verification pending.',
        model: { provider: 'unknown', id: 'unknown' },
        criteriaEvaluation: [],
        hash: '',
      }

  // Extract advocate briefs
  const providerBriefArtifact = findByDocType(artifacts, DOC_ADVOCATE_PROVIDER)
  const clientBriefArtifact = findByDocType(artifacts, DOC_ADVOCATE_CLIENT)
  const advocateBriefProvider = providerBriefArtifact
    ? extractAdvocateBrief(providerBriefArtifact, 'pro_provider')
    : undefined
  const advocateBriefClient = clientBriefArtifact
    ? extractAdvocateBrief(clientBriefArtifact, 'pro_client')
    : undefined

  // Extract tribunal & supreme court decisions
  const tribunalDecision = extractTribunalDecision(artifacts)
  const supremeCourtDecision = extractSupremeCourtDecision(artifacts)

  // Derive phase
  const phase = derivePhase(artifacts, context.disputeWindowEnd)

  // Extract final outcome from receipt if present
  const receiptArtifact = findByDocType(artifacts, DOC_FINAL_RECEIPT)
  const receiptMeta = receiptArtifact ? json(receiptArtifact) : undefined

  // Build dispute ID from first artifact's dispute_id
  const disputeId = artifacts[0]?.dispute_id ?? `${context.contractId}-${context.milestoneId}`

  return {
    id: disputeId,
    contractId: context.contractId,
    contractName: context.contractName,
    milestoneId: context.milestoneId,
    milestoneName: context.milestoneName,
    phase,
    reason: (disputeMeta.reason as string) ?? '',
    filedBy: (disputeMeta.filedBy as string) ?? '',
    filedAt: (disputeMeta.filedAt as string) ?? disputeArtifact?.created_at ?? '',
    disputedAmount: (disputeMeta.disputedAmount as number) ?? context.totalAmount,
    currency: (disputeMeta.currency as string) ?? 'USDC',
    supportingEvidence: Array.isArray(disputeMeta.supportingEvidence)
      ? (disputeMeta.supportingEvidence as string[])
      : [],
    verificationReport,
    advocateBriefProvider,
    advocateBriefClient,
    tribunalDecision,
    supremeCourtDecision,
    auditTrail: buildAuditTrail(artifacts),
    finalVerdict: receiptMeta
      ? (receiptMeta.finalVerdict as DisputeRecord['finalVerdict'])
      : undefined,
    finalPaymentPct: receiptMeta
      ? (receiptMeta.finalPaymentPct as number)
      : undefined,
    resolvedAt: receiptArtifact?.created_at,
    disputeWindowEnd: context.disputeWindowEnd,
    appealWindowEnd: (disputeMeta.appealWindowEnd as string) ?? undefined,
  }
}
