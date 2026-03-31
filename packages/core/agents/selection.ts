import type { AgentPoolConfig, AgentProfile } from './types'

export function selectAgents(pool: AgentProfile[], config: AgentPoolConfig): AgentProfile[] {
  const eligible = pool.filter(
    (agent) => (agent.reputationScore ?? 0) >= config.minReputationScore
  )

  if (!config.diversityByProvider) {
    return eligible.slice(0, config.count)
  }

  const selected: AgentProfile[] = []
  const seenProviders = new Set<string>()

  for (const agent of eligible) {
    const provider = agent.provider ?? 'unknown'
    if (!seenProviders.has(provider)) {
      selected.push(agent)
      seenProviders.add(provider)
    }
    if (selected.length >= config.count) {
      return selected
    }
  }

  for (const agent of eligible) {
    if (selected.length >= config.count) {
      break
    }
    if (!selected.some((s) => s.agentId === agent.agentId)) {
      selected.push(agent)
    }
  }

  return selected
}
