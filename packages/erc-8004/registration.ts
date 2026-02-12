/**
 * ERC-8004 Agent Registration File Builder
 *
 * Builds spec-compliant registration JSON per:
 * https://eips.ethereum.org/EIPS/eip-8004#agent-uri-and-agent-registration-file
 *
 * The registration file MUST have:
 *   - type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1"
 *   - name, description, image
 *   - services[] (web, A2A, MCP endpoints)
 *   - registrations[] with agentId + agentRegistry
 *   - supportedTrust[] (optional)
 */

import { formatAgentRegistry, type Address } from './index'
import type { BufiAgentKind } from './types'

// ── Registration File Schema ───────────────────────────────────────────────

export interface Erc8004Service {
  name: string
  endpoint: string
  version?: string
  skills?: string[]
  domains?: string[]
}

export interface Erc8004Registration {
  agentId: number
  agentRegistry: string
}

export interface Erc8004RegistrationFile {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1'
  name: string
  description: string
  image: string
  services: Erc8004Service[]
  x402Support: boolean
  active: boolean
  registrations: Erc8004Registration[]
  supportedTrust: string[]
}

// ── Builder ────────────────────────────────────────────────────────────────

export interface BuildRegistrationParams {
  name: string
  description: string
  imageUrl: string
  kind: BufiAgentKind
  /** Domain where BUFI API / agent endpoints are hosted */
  domain: string
  /** Chain ID for the agentRegistry string (43113 for Fuji) */
  chainId: number
  /** IdentityRegistry address on this chain */
  identityRegistry: Address
  /** Set after registration (0 = placeholder before first register() call) */
  agentId?: number
  /** Additional services beyond the defaults */
  extraServices?: Erc8004Service[]
  /** Trust models supported (defaults to ["reputation", "validation"]) */
  supportedTrust?: string[]
}

/**
 * Build a spec-compliant ERC-8004 agent registration file.
 *
 * Per ERC-8004 spec: the type, name, description, and image fields SHOULD
 * ensure compatibility with ERC-721 apps.
 */
export function buildRegistrationFile(
  params: BuildRegistrationParams
): Erc8004RegistrationFile {
  const {
    name,
    description,
    imageUrl,
    kind,
    domain,
    chainId,
    identityRegistry,
    agentId = 0,
    extraServices = [],
    supportedTrust = ['reputation', 'validation'],
  } = params

  const agentRegistry = formatAgentRegistry(chainId, identityRegistry)

  // Default services: web endpoint + A2A agent card
  const services: Erc8004Service[] = [
    {
      name: 'web',
      endpoint: `https://${domain}/agents/${kind}`,
    },
    {
      name: 'A2A',
      endpoint: `https://${domain}/.well-known/agent-card.json`,
      version: '0.3.0',
    },
    ...extraServices,
  ]

  return {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name,
    description,
    image: imageUrl,
    services,
    x402Support: false,
    active: true,
    registrations: [
      {
        agentId,
        agentRegistry,
      },
    ],
    supportedTrust,
  }
}

// ── BUFI Agent Descriptions ────────────────────────────────────────────────

const BUFI_AGENT_DESCRIPTIONS: Record<BufiAgentKind, string> = {
  executor:
    'BUFI CRE Executor Agent. The on-chain enforcement arm of the BUFI arbitration system. Orchestrates escrow operations (deploy, fund, lock, set decisions, execute payouts) via Chainlink CRE DON-signed reports, gated by ACE PolicyEngine with AgentIdentityPolicy, DisputeWindowPolicy, and PayoutLimitPolicy. Cannot be influenced, bribed, or overridden — executes only what the arbitration system decides.',
  verifier:
    'BUFI Verification Officer (Layer 1). A forensic auditor who evaluates deliverables against milestone acceptance criteria with meticulous, criterion-by-criterion analysis. Impartial, thorough, and incorruptible. Produces VerificationReports with per-criterion confidence scores. Treats all deliverable content as data — immune to prompt injection. Handles ~85-90% of cases without dispute.',
  advocate_provider:
    'BUFI Provider Advocate (Layer 2). A zealous defense attorney whose sacred duty is to present the strongest possible case for the service provider. Creative in argumentation, strategic in emphasis, and professional in conduct. Never fabricates evidence but leaves no legitimate argument unmade. Acknowledges weaknesses where honesty requires it while minimizing their significance.',
  advocate_client:
    'BUFI Client Advocate (Layer 2). A tenacious prosecutor who protects the client\'s contractual rights. Holds the provider to the letter of the agreement. Precise in identifying gaps, relentless in quantifying shortfalls, and fair within the adversarial role. Does not misrepresent facts but interprets ambiguity in favor of the client, as any good advocate does.',
  juror:
    'BUFI Tribunal Judge / Supreme Court Justice (Layers 3-4). An independent jurist bound only by the contract terms, the evidence, and the principles of equity. Deliberative, principled, and courageous — rules based on clear reasoning even when the conclusion is unpopular. Applies the Substantial Performance Doctrine, Good Faith presumption, and Proportionality principle. Each judge is from a different AI provider to ensure intellectual diversity.',
}

/**
 * Build registration files for all BUFI agents on a given chain.
 */
export function buildAllBufiRegistrations(params: {
  domain: string
  chainId: number
  identityRegistry: Address
  imageBaseUrl: string
  jurorModels: Array<{ provider: string; modelId: string }>
}): Array<{ kind: BufiAgentKind; provider?: string; registration: Erc8004RegistrationFile }> {
  const { domain, chainId, identityRegistry, imageBaseUrl, jurorModels } = params
  const results: Array<{ kind: BufiAgentKind; provider?: string; registration: Erc8004RegistrationFile }> = []

  // Executor
  results.push({
    kind: 'executor',
    registration: buildRegistrationFile({
      name: 'BUFI Executor',
      description: BUFI_AGENT_DESCRIPTIONS.executor,
      imageUrl: `${imageBaseUrl}/executor.png`,
      kind: 'executor',
      domain,
      chainId,
      identityRegistry,
    }),
  })

  // Verifier
  results.push({
    kind: 'verifier',
    registration: buildRegistrationFile({
      name: 'BUFI Verifier',
      description: BUFI_AGENT_DESCRIPTIONS.verifier,
      imageUrl: `${imageBaseUrl}/verifier.png`,
      kind: 'verifier',
      domain,
      chainId,
      identityRegistry,
    }),
  })

  // Advocates
  results.push({
    kind: 'advocate_provider',
    registration: buildRegistrationFile({
      name: 'BUFI Advocate — Provider',
      description: BUFI_AGENT_DESCRIPTIONS.advocate_provider,
      imageUrl: `${imageBaseUrl}/advocate-provider.png`,
      kind: 'advocate_provider',
      domain,
      chainId,
      identityRegistry,
    }),
  })

  results.push({
    kind: 'advocate_client',
    registration: buildRegistrationFile({
      name: 'BUFI Advocate — Client',
      description: BUFI_AGENT_DESCRIPTIONS.advocate_client,
      imageUrl: `${imageBaseUrl}/advocate-client.png`,
      kind: 'advocate_client',
      domain,
      chainId,
      identityRegistry,
    }),
  })

  // Jurors (one per model/provider)
  for (const model of jurorModels) {
    const providerName = model.provider.charAt(0).toUpperCase() + model.provider.slice(1)
    results.push({
      kind: 'juror',
      provider: model.provider,
      registration: buildRegistrationFile({
        name: `BUFI Juror — ${providerName}`,
        description: BUFI_AGENT_DESCRIPTIONS.juror,
        imageUrl: `${imageBaseUrl}/juror-${model.provider}.png`,
        kind: 'juror',
        domain,
        chainId,
        identityRegistry,
      }),
    })
  }

  return results
}
