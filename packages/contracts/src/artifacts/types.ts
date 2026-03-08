/**
 * Artifact Type Definitions
 *
 * Every CRE workflow step produces an artifact:
 *   - Serialized to canonical JSON
 *   - Hashed with SHA-256
 *   - Stored (Supabase / IPFS)
 *   - Referenced in the DB (arbitration_documents table)
 */

export type ArtifactType =
  | 'AgreementJSON'
  | 'TemplateCompileReport'
  | 'SubmissionJSON'
  | 'VerificationReport'
  | 'DisputeOpen'
  | 'AdvocateBrief_Provider'
  | 'AdvocateBrief_Client'
  | 'TribunalVerdict'
  | 'TribunalAggregate'
  | 'SupremeCourtVerdict'
  | 'SupremeCourtAggregate'
  | 'DecisionFinalized'
  | 'FinalReceiptJSON'
  | 'EscrowDeploymentReceipt'
  | 'FundingReceipt'
  | 'ExecutionReceipt'
  | 'ReputationUpdateReceipt'
  | 'AgentRegistrySnapshot'

export interface StoredArtifact {
  /** Artifact type */
  type: ArtifactType
  /** SHA-256 hash of the canonical JSON */
  sha256: string
  /** Storage reference (supabase://path or ipfs://CID) */
  storageRef: string
  /** Timestamp of creation */
  createdAt: string
  /** Size in bytes */
  sizeBytes?: number
}

export interface ArtifactReference {
  type: ArtifactType
  hash: string
  uri: string
}

/**
 * FinalReceiptJSON — Root artifact anchored on-chain.
 * Contains references to all sub-artifacts + agent identities + tx hashes.
 */
export interface FinalReceiptJSON {
  schemaVersion: '1.0'
  agreementId: string
  milestoneId: string
  decision: {
    type: 'approve' | 'deny' | 'split'
    payeeBps: number
    payerBps: number
  }
  payouts: Array<{
    to: string
    amount: string
    label: string
  }>
  agentIdentities: {
    executorAgentId: string
    verifierAgentId?: string
    advocateAgentIds?: string[]
    tribunalAgentIds?: string[]
    supremeCourtAgentIds?: string[]
  }
  artifacts: ArtifactReference[]
  onchain: {
    escrowAddress: string
    chain: string
    chainId: number
    setDecisionTx?: string
    executeDecisionTx?: string
  }
  hashing: {
    algo: 'sha256'
    receiptHash: string
  }
}
