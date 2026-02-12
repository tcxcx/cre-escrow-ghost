// =============================================================================
// AI Gateway — Single entry point for ALL AI calls in the intelligence package
// =============================================================================
// Uses Vercel AI Gateway via AI SDK 6 (zero-config).
// Model strings like "anthropic/claude-sonnet-4-5-20250929" route through
// the gateway automatically — no provider packages needed.
//
// DRY: Every layer calls `gateway.structured()` instead of duplicating
// the generateText + Output.object() + hash + metadata pattern.
// =============================================================================

import { generateText, Output } from 'ai'
import type { z } from 'zod'
import { hashDocument } from './audit'

// -- Types -------------------------------------------------------------------

export interface GatewayCallOptions<T extends z.ZodType> {
  /** AI Gateway model string, e.g. "anthropic/claude-sonnet-4-5-20250929" */
  model: string
  /** System prompt from ARBITRATION_PROMPTS */
  system: string
  /** User prompt (case-specific context) */
  prompt: string
  /** Zod schema for structured output */
  schema: T
  /** Identifier prefix for the result, e.g. "vr" for verification report */
  idPrefix: string
  /** Additional metadata to attach to the result */
  metadata?: Record<string, unknown>
}

export interface GatewayResult<T> {
  id: string
  timestamp: string
  model: {
    /** Full model string as passed to AI Gateway */
    modelId: string
    /** Extracted provider name, e.g. "anthropic" */
    provider: string
  }
  output: T
  hash: string
}

// -- Helpers -----------------------------------------------------------------

/**
 * Extract provider from an AI Gateway model string.
 * "anthropic/claude-sonnet-4-5-20250929" -> "anthropic"
 * "openai/gpt-4o" -> "openai"
 */
export function extractProvider(model: string): string {
  const slash = model.indexOf('/')
  return slash > 0 ? model.slice(0, slash) : model
}

// -- Gateway -----------------------------------------------------------------

/**
 * Make a structured AI call through Vercel AI Gateway.
 *
 * This is the ONLY function in the intelligence package that calls the AI SDK.
 * All layers use this, ensuring:
 *   - Consistent error handling
 *   - Automatic hashing for audit trail
 *   - Uniform metadata shape
 *   - Single place to add rate limiting, retries, logging, cost tracking
 */
export async function structured<T extends z.ZodType>(
  options: GatewayCallOptions<T>,
): Promise<GatewayResult<z.infer<T>>> {
  const { model, system, prompt, schema, idPrefix, metadata: _metadata } = options

  const { output } = await generateText({
    model,
    system,
    prompt,
    output: Output.object({ schema }),
  })

  if (!output) {
    throw new Error(`AI Gateway returned no structured output for ${idPrefix} call to ${model}`)
  }

  const id = `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const timestamp = new Date().toISOString()
  const hash = await hashDocument(output)

  return {
    id,
    timestamp,
    model: {
      modelId: model,
      provider: extractProvider(model),
    },
    output,
    hash,
  }
}

/**
 * Run multiple structured calls in parallel (for tribunal/supreme court judges).
 * Each call is independent — no judge sees another's output.
 */
export async function parallelStructured<T extends z.ZodType>(
  calls: GatewayCallOptions<T>[],
): Promise<GatewayResult<z.infer<T>>[]> {
  return Promise.all(calls.map((call) => structured(call)))
}
