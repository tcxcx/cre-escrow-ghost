// =============================================================================
// Arbitration Model Pool + Selection Algorithm
// =============================================================================
// Curated models for advocate selection (user-facing) and neutral model pool
// for auto-selecting tribunal/supreme court judges with provider diversity.
// All model strings use Vercel AI Gateway format: "provider/model-name"
// =============================================================================

// ── Curated Advocate Models (user-selectable) ───────────

export interface AdvocateModelOption {
  id: string
  displayName: string
  provider: string
  costTier: '$' | '$$' | '$$$'
  personality: string
}

export const ADVOCATE_MODEL_OPTIONS: AdvocateModelOption[] = [
  {
    id: 'anthropic/claude-sonnet-4-5',
    displayName: 'Claude Sonnet',
    provider: 'Anthropic',
    costTier: '$$',
    personality: 'Precise, balanced reasoning',
  },
  {
    id: 'openai/gpt-4o',
    displayName: 'GPT-4o',
    provider: 'OpenAI',
    costTier: '$$',
    personality: 'Broad knowledge, persuasive',
  },
  {
    id: 'google/gemini-2.0-flash',
    displayName: 'Gemini Flash',
    provider: 'Google',
    costTier: '$',
    personality: 'Fast, analytical',
  },
  {
    id: 'xai/grok-4-fast',
    displayName: 'Grok',
    provider: 'xAI',
    costTier: '$$',
    personality: 'Direct, unconventional arguments',
  },
  {
    id: 'fireworks/accounts/fireworks/models/deepseek-v3',
    displayName: 'DeepSeek V3',
    provider: 'Fireworks',
    costTier: '$',
    personality: 'Strong logic chains',
  },
]

// ── Full Neutral Model Pool ─────────────────────────────

const NEUTRAL_POOL = [
  'anthropic/claude-sonnet-4-5-20250929',
  'anthropic/claude-opus-4-5',
  'openai/gpt-4o',
  'openai/gpt-5-mini',
  'google/gemini-2.0-flash',
  'xai/grok-4-fast',
  'fireworks/accounts/fireworks/models/llama-v3p3-70b-instruct',
  'fireworks/accounts/fireworks/models/deepseek-v3',
  'mistral/mistral-large-latest',
]

export function extractProvider(model: string): string {
  const slash = model.indexOf('/')
  return slash > 0 ? model.slice(0, slash) : model
}

// ── Selection Algorithm ─────────────────────────────────

/**
 * Select N models from the pool, excluding specified models,
 * maximizing provider diversity (round-robin by provider).
 */
function selectDiverse(
  pool: string[],
  exclude: string[],
  count: number,
): string[] {
  const excludeSet = new Set(exclude)
  const available = pool.filter((m) => !excludeSet.has(m))

  // Group by provider
  const byProvider = new Map<string, string[]>()
  for (const m of available) {
    const p = extractProvider(m)
    if (!byProvider.has(p)) byProvider.set(p, [])
    byProvider.get(p)!.push(m)
  }

  // Round-robin across providers
  const result: string[] = []
  const providers = [...byProvider.keys()]
  let providerIdx = 0

  while (result.length < count && providers.length > 0) {
    const provider = providers[providerIdx % providers.length]!
    const models = byProvider.get(provider)!
    if (models.length > 0) {
      result.push(models.shift()!)
      if (models.length === 0) {
        providers.splice(providerIdx % providers.length, 1)
        if (providers.length === 0) break
        providerIdx = providerIdx % providers.length
      } else {
        providerIdx++
      }
    } else {
      providers.splice(providerIdx % providers.length, 1)
    }
  }

  return result
}

/**
 * Select 3 tribunal judges, excluding advocate models.
 */
export function selectTribunalModels(
  payerAdvocateModel: string,
  payeeAdvocateModel: string,
): [string, string, string] {
  const result = selectDiverse(NEUTRAL_POOL, [payerAdvocateModel, payeeAdvocateModel], 3)
  if (result.length < 3) {
    throw new Error(`Cannot select 3 diverse tribunal models after excluding advocates`)
  }
  return result as [string, string, string]
}

/**
 * Select 5 supreme court judges, excluding advocate + tribunal models.
 */
export function selectSupremeCourtModels(
  payerAdvocateModel: string,
  payeeAdvocateModel: string,
  tribunalModels: string[],
): [string, string, string, string, string] {
  const exclude = [payerAdvocateModel, payeeAdvocateModel, ...tribunalModels]
  const result = selectDiverse(NEUTRAL_POOL, exclude, 5)
  if (result.length < 5) {
    // Relax: allow same provider different model if pool is exhausted
    const relaxed = selectDiverse(NEUTRAL_POOL, [payerAdvocateModel, payeeAdvocateModel], 5)
    if (relaxed.length < 5) {
      throw new Error(`Cannot select 5 supreme court models`)
    }
    return relaxed as [string, string, string, string, string]
  }
  return result as [string, string, string, string, string]
}
