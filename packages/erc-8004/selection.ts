/**
 * Agent Selection Policy
 *
 * Selects jurors from a pool with diversity constraints and
 * optional reputation-weighted selection.
 *
 * For the hackathon: simple round-robin with provider diversity.
 * Later: reputation-weighted selection using getSummary() from
 * the Reputation Registry.
 */

import type { BufiAgent, SelectionCriteria } from './types'

/**
 * Select jurors from a pool meeting the given criteria.
 *
 * Rules:
 * 1. Exclude any agents in excludeAgentIds
 * 2. If requireDiversity: no two selected agents can share the same provider
 * 3. If minReputationScore > 0: only agents with score >= threshold (future)
 * 4. Select exactly `count` agents, or throw if not enough eligible
 *
 * @returns Array of selected agents
 */
export function selectJurors(
  pool: BufiAgent[],
  criteria: SelectionCriteria
): BufiAgent[] {
  const { count, requireDiversity, minReputationScore, excludeAgentIds } = criteria

  // Filter out excluded agents
  let eligible = pool.filter(
    (agent) => !excludeAgentIds.some((id) => id === agent.agentId)
  )

  // Future: filter by reputation score
  // if (minReputationScore > 0) {
  //   eligible = eligible.filter(agent => agent.reputationScore >= minReputationScore)
  // }

  if (eligible.length < count) {
    throw new Error(
      `Not enough eligible jurors: need ${count}, have ${eligible.length} after exclusions`
    )
  }

  if (!requireDiversity) {
    // Simple: take first N
    return eligible.slice(0, count)
  }

  // Diversity selection: pick one per provider, round-robin
  const selected: BufiAgent[] = []
  const usedProviders = new Set<string>()

  for (const agent of eligible) {
    if (selected.length >= count) break

    const provider = agent.provider ?? 'unknown'
    if (usedProviders.has(provider)) continue

    selected.push(agent)
    usedProviders.add(provider)
  }

  if (selected.length < count) {
    throw new Error(
      `Not enough diverse jurors: need ${count} from different providers, ` +
      `found ${selected.length} unique providers in pool of ${eligible.length}`
    )
  }

  return selected
}

/**
 * Select Layer 3 tribunal jurors (3 from different providers).
 */
export function selectTribunalJurors(pool: BufiAgent[]): BufiAgent[] {
  return selectJurors(pool, {
    count: 3,
    requireDiversity: true,
    minReputationScore: 0,
    excludeAgentIds: [],
  })
}

/**
 * Select Layer 4 supreme court jurors (5 from different providers,
 * excluding all Layer 3 providers).
 */
export function selectSupremeCourtJurors(
  pool: BufiAgent[],
  layer3AgentIds: bigint[]
): BufiAgent[] {
  return selectJurors(pool, {
    count: 5,
    requireDiversity: true,
    minReputationScore: 0,
    excludeAgentIds: layer3AgentIds,
  })
}
