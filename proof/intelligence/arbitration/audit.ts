// =============================================================================
// Audit — Document hashing and on-chain record creation
// Every document generated during arbitration is:
//   1. Serialized to JSON
//   2. Hashed with SHA-256
//   3. Hash stored on-chain in the milestone struct
//   4. Full document stored on IPFS
//   5. IPFS CID linked to on-chain hash
// =============================================================================

/**
 * Hash a document using SHA-256.
 * Deterministic: same input always produces the same hash.
 */
export async function hashDocument(document: unknown): Promise<string> {
  const json = JSON.stringify(document, Object.keys(document as Record<string, unknown>).sort())
  const encoder = new TextEncoder()
  const data = encoder.encode(json)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Create a structured audit record for on-chain storage.
 */
export function createAuditRecord(params: {
  milestoneId: string
  layer: 1 | 2 | 3 | 4
  type: string
  title: string
  document: unknown
  hash: string
  ipfsCid?: string
}) {
  return {
    id: `audit-${params.layer}-${Date.now()}`,
    layer: params.layer,
    type: params.type,
    title: params.title,
    hash: params.hash,
    ipfsCid: params.ipfsCid,
    timestamp: new Date().toISOString(),
    milestoneId: params.milestoneId,
  }
}

/**
 * Build the complete on-chain arbitration record.
 * This mirrors the Solidity ArbitrationRecord struct.
 */
export function buildOnChainRecord(params: {
  milestoneId: string
  verificationReportHash: string
  advocateBriefProviderHash?: string
  advocateBriefClientHash?: string
  tribunalVerdictHashes?: string[]
  tribunalDecisionHash?: string
  supremeCourtVerdictHashes?: string[]
  supremeCourtDecisionHash?: string
  finalVerdict: string
  finalPaymentPct: number
}) {
  return {
    milestoneId: params.milestoneId,
    verificationReportHash: params.verificationReportHash,
    advocateBriefProviderHash: params.advocateBriefProviderHash ?? '',
    advocateBriefClientHash: params.advocateBriefClientHash ?? '',
    tribunalVerdictHashes: params.tribunalVerdictHashes ?? [],
    tribunalDecisionHash: params.tribunalDecisionHash ?? '',
    supremeCourtVerdictHashes: params.supremeCourtVerdictHashes ?? [],
    supremeCourtDecisionHash: params.supremeCourtDecisionHash ?? '',
    finalVerdict: params.finalVerdict,
    finalPaymentPct: params.finalPaymentPct,
    resolvedAt: new Date().toISOString(),
  }
}
