// =============================================================================
// Arbitration Configuration
// =============================================================================
// All model strings use Vercel AI Gateway format: "provider/model-name"
// The gateway handles routing, auth, and rate limiting automatically.
// No provider packages or API keys needed — zero-config.
// =============================================================================

export interface ArbitrationConfig {
  // Timing
  disputeWindowHours: number // min 24, max 168, default 72
  appealWindowHours: number // fixed 48
  maxResubmissions: number // default 3

  // Thresholds
  verificationConfidenceThreshold: number // default 80
  tribunalMajority: number // 2 of 3
  supremeCourtSupermajority: number // 4 of 5

  // Layer 1 — Verifier (single model)
  layer1: {
    model: string // AI Gateway model string
  }

  // Layer 2 — Advocates (same model, adversarial prompts)
  layer2: {
    model: string
  }

  // Layer 3 — Tribunal (3 DIFFERENT provider models)
  layer3: {
    judges: [{ model: string }, { model: string }, { model: string }]
  }

  // Layer 4 — Supreme Court (5 DIFFERENT provider models, excludes L3 providers)
  layer4: {
    judges: [
      { model: string },
      { model: string },
      { model: string },
      { model: string },
      { model: string },
    ]
  }

  // Infrastructure
  ipfsGateway: string
  oracleAddress?: string
  escrowContractAddress?: string
}

// =============================================================================
// Default Configuration
// =============================================================================
// Layer 3 and Layer 4 use providers with zero-config AI Gateway support:
//   AWS Bedrock, Google Vertex, OpenAI, Fireworks AI, Anthropic
// Other providers (xAI, Mistral, etc.) require user API keys.
// =============================================================================

export const DEFAULT_ARBITRATION_CONFIG: ArbitrationConfig = {
  disputeWindowHours: 72,
  appealWindowHours: 48,
  maxResubmissions: 3,
  verificationConfidenceThreshold: 80,
  tribunalMajority: 2,
  supremeCourtSupermajority: 4,

  layer1: {
    model: 'anthropic/claude-sonnet-4-5-20250929',
  },

  layer2: {
    model: 'anthropic/claude-sonnet-4-5-20250929',
  },

  // 3 different providers for reasoning diversity
  layer3: {
    judges: [
      { model: 'anthropic/claude-sonnet-4-5-20250929' },
      { model: 'openai/gpt-4o' },
      { model: 'fireworks/accounts/fireworks/models/llama-v3p3-70b-instruct' },
    ],
  },

  // 5 different providers — NONE overlap with Layer 3
  layer4: {
    judges: [
      { model: 'xai/grok-4-fast' },
      { model: 'google/gemini-2.0-flash' },
      { model: 'anthropic/claude-opus-4-5' },
      { model: 'openai/gpt-5-mini' },
      { model: 'fireworks/accounts/fireworks/models/deepseek-v3' },
    ],
  },

  ipfsGateway: 'https://gateway.pinata.cloud',
}
