export type AgentKind =
  | 'executor'
  | 'verifier'
  | 'advocate_provider'
  | 'advocate_client'
  | 'juror'

export interface AgentProfile {
  agentId: string
  kind: AgentKind
  provider?: string | null
  modelId?: string | null
  ownerAddress: `0x${string}`
  walletAddress?: `0x${string}` | null
  reputationScore?: number
}

export interface AgentPoolConfig {
  count: number
  minReputationScore: number
  diversityByProvider: boolean
}
