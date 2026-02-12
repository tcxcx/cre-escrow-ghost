/**
 * ERC-8004 BUFI Agent Types
 *
 * Type definitions for agent identities in the BUFI arbitration system.
 * All ERC-8004 integration follows the spec at:
 * https://eips.ethereum.org/EIPS/eip-8004
 */

import type { Address } from './index'

// ── Agent Kinds ────────────────────────────────────────────────────────────

export type BufiAgentKind =
  | 'executor'
  | 'verifier'
  | 'advocate_provider'
  | 'advocate_client'
  | 'juror'

// ── Agent Record (DB + runtime) ────────────────────────────────────────────

export interface BufiAgent {
  /** Internal DB id */
  id: string
  /** Agent role in the BUFI system */
  kind: BufiAgentKind
  /** EVM chain ID where registered (43113 for Fuji) */
  chainId: number
  /** ERC-8004 IdentityRegistry address on this chain */
  identityRegistry: Address
  /** ERC-8004 ReputationRegistry address on this chain */
  reputationRegistry: Address
  /** ERC-721 tokenId returned by IdentityRegistry.register() */
  agentId: bigint
  /** HTTPS/IPFS URI pointing to the registration JSON */
  agentUri: string
  /** Address that owns this agent NFT */
  ownerAddress: Address
  /** Verified wallet per ERC-8004 agentWallet metadata */
  agentWallet?: Address
  /** LLM model identifier (e.g., "anthropic/claude-sonnet-4-5-20250929") */
  modelId?: string
  /** Provider name (e.g., "anthropic", "openai") */
  provider?: string
  /** Timestamp of registration */
  createdAt: string
}

// ── Agent Pool Config ──────────────────────────────────────────────────────

export interface AgentPoolConfig {
  /** Available juror agents for Layer 3 tribunal */
  tribunalPool: BufiAgent[]
  /** Available juror agents for Layer 4 supreme court */
  supremeCourtPool: BufiAgent[]
  /** Advocate agents (exactly 2: provider + client) */
  advocates: {
    provider: BufiAgent
    client: BufiAgent
  }
  /** Verifier agent for Layer 1 */
  verifier: BufiAgent
  /** CRE executor agent */
  executor: BufiAgent
}

// ── Selection Policy ───────────────────────────────────────────────────────

export interface SelectionCriteria {
  /** Number of jurors to select */
  count: number
  /** Require all from different providers */
  requireDiversity: boolean
  /** Minimum reputation score (from getSummary) — 0 means no minimum */
  minReputationScore: number
  /** Agent IDs to exclude (e.g., Layer 3 jurors excluded from Layer 4) */
  excludeAgentIds: bigint[]
}

// ── Feedback Tags (BUFI-specific, used with ReputationRegistry) ────────────

/**
 * Standard tag1 values for BUFI reputation feedback.
 * Per ERC-8004 spec: tag1 and tag2 are developer-defined strings.
 */
export const BUFI_FEEDBACK_TAGS = {
  /** Juror accuracy: did verdict match final outcome? (0-100) */
  ACCURACY: 'accuracy',
  /** Juror consistency: 1 if matched majority, 0 if dissent */
  CONSISTENCY: 'consistency',
  /** Was Layer 3 decision overturned by Layer 4? (binary) */
  WAS_OVERTURNED: 'was_overturned',
  /** Verifier accuracy: was Layer 1 verdict upheld? (0-100) */
  VERIFICATION_ACCURACY: 'verification_accuracy',
  /** Response time in milliseconds */
  RESPONSE_TIME: 'responseTime',
  /** Success rate percentage */
  SUCCESS_RATE: 'successRate',
} as const

export type BufiFeedbackTag = (typeof BUFI_FEEDBACK_TAGS)[keyof typeof BUFI_FEEDBACK_TAGS]

// ── Stablecoin Token Addresses (Escrow payments) ───────────────────────────

export const STABLECOIN_ADDRESSES = {
  fuji: {
    USDC: '0x5425890298aed601595a70AB815c96711a31Bc65' as Address,
    EURC: '0x5E44db7996c682E92a960b65AC713a54AD815c6B' as Address,
  },
  avalanche: {
    USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' as Address,
    EURC: '0xC891EB4cbdEFf6e073e859e987815Ed1505c2ACD' as Address,
  },
} as const

export type StablecoinSymbol = 'USDC' | 'EURC'

/** Token decimals — both USDC and EURC use 6 */
export const STABLECOIN_DECIMALS = 6

// ── Validation Registry Note ───────────────────────────────────────────────
/**
 * IMPORTANT: Per the ava-labs/8004-boilerplate deploy script:
 * - Identity Registry and Reputation Registry are shared singletons (one per chain)
 * - Validation Registry is deployed PER-PROJECT / PER-AGENT (not shared)
 *
 * This means BUFI must deploy its own ValidationRegistry instance on Fuji.
 * The boilerplate deploys it with: `new ValidationRegistry(identityRegistryAddress)`
 *
 * Ref: https://github.com/ava-labs/8004-boilerplate/blob/main/scripts/deploy.js
 * Ref: https://github.com/ava-labs/8004-boilerplate/blob/main/config/agent.config.js
 *   → validation: null (deployed fresh per agent)
 */
export const VALIDATION_REGISTRY_NOTE = 'Validation Registry must be deployed per-project. Identity and Reputation are shared singletons.' as const
