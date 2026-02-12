/**
 * LLM Adapter for CRE Workflows
 *
 * Pattern copied from: hardhat/cre-templates/cre-por-llm-demo/por/main.ts
 * (the fetchRiskAnalysis function)
 *
 * Uses CRE HTTPClient to call LLM APIs (Gemini, OpenAI, Anthropic)
 * with DON consensus via ConsensusAggregationByFields.
 */

import {
  type HTTPSendRequester,
  ok,
} from '@chainlink/cre-sdk'

// ── Types ──────────────────────────────────────────────────────────────────

export interface LLMCallParams {
  provider: string
  model: string
  systemPrompt: string
  userPrompt: string
  temperature?: number
  responseFormat?: 'json' | 'text'
}

export interface LLMResponse {
  text: string
  provider: string
  model: string
}

// ── Gemini API ─────────────────────────────────────────────────────────────

interface GeminiApiResponse {
  candidates: {
    content: {
      parts: { text: string }[]
    }
  }[]
}

/**
 * Build a CRE HTTPClient request function for Gemini.
 * Pattern: cre-por-llm-demo/por/main.ts → fetchRiskAnalysis
 */
export const callGemini =
  (apiKey: string, params: LLMCallParams) =>
  (sendRequester: HTTPSendRequester): LLMResponse => {
    const dataToSend = {
      system_instruction: { parts: [{ text: params.systemPrompt }] },
      contents: [{ parts: [{ text: params.userPrompt }] }],
      generationConfig: {
        temperature: params.temperature ?? 0,
        ...(params.responseFormat === 'json'
          ? { responseMimeType: 'application/json' }
          : {}),
      },
    }

    const bodyBytes = new TextEncoder().encode(JSON.stringify(dataToSend))
    const body = Buffer.from(bodyBytes).toString('base64')

    const resp = sendRequester.sendRequest({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent`,
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
    }).result()

    const bodyText = new TextDecoder().decode(resp.body)
    if (!ok(resp)) throw new Error(`Gemini API error: ${resp.statusCode} ${bodyText}`)

    const parsed = JSON.parse(bodyText) as GeminiApiResponse
    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Malformed Gemini response')

    return { text: text.trim(), provider: 'google', model: params.model }
  }

// ── OpenAI API ─────────────────────────────────────────────────────────────

interface OpenAIResponse {
  choices: { message: { content: string } }[]
}

export const callOpenAI =
  (apiKey: string, params: LLMCallParams) =>
  (sendRequester: HTTPSendRequester): LLMResponse => {
    const dataToSend = {
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      temperature: params.temperature ?? 0,
      ...(params.responseFormat === 'json'
        ? { response_format: { type: 'json_object' } }
        : {}),
    }

    const bodyBytes = new TextEncoder().encode(JSON.stringify(dataToSend))
    const body = Buffer.from(bodyBytes).toString('base64')

    const resp = sendRequester.sendRequest({
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    }).result()

    const bodyText = new TextDecoder().decode(resp.body)
    if (!ok(resp)) throw new Error(`OpenAI API error: ${resp.statusCode} ${bodyText}`)

    const parsed = JSON.parse(bodyText) as OpenAIResponse
    const text = parsed?.choices?.[0]?.message?.content
    if (!text) throw new Error('Malformed OpenAI response')

    return { text: text.trim(), provider: 'openai', model: params.model }
  }

// ── Anthropic API ──────────────────────────────────────────────────────────

interface AnthropicResponse {
  content: { type: string; text: string }[]
}

export const callAnthropic =
  (apiKey: string, params: LLMCallParams) =>
  (sendRequester: HTTPSendRequester): LLMResponse => {
    const dataToSend = {
      model: params.model,
      max_tokens: 4096,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userPrompt }],
      temperature: params.temperature ?? 0,
    }

    const bodyBytes = new TextEncoder().encode(JSON.stringify(dataToSend))
    const body = Buffer.from(bodyBytes).toString('base64')

    const resp = sendRequester.sendRequest({
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    }).result()

    const bodyText = new TextDecoder().decode(resp.body)
    if (!ok(resp)) throw new Error(`Anthropic API error: ${resp.statusCode} ${bodyText}`)

    const parsed = JSON.parse(bodyText) as AnthropicResponse
    const text = parsed?.content?.find((c) => c.type === 'text')?.text
    if (!text) throw new Error('Malformed Anthropic response')

    return { text: text.trim(), provider: 'anthropic', model: params.model }
  }

// ── Provider Router ────────────────────────────────────────────────────────

export function getLLMCaller(
  provider: string,
  apiKey: string,
  params: LLMCallParams
): (sendRequester: HTTPSendRequester) => LLMResponse {
  switch (provider) {
    case 'google':
      return callGemini(apiKey, params)
    case 'openai':
      return callOpenAI(apiKey, params)
    case 'anthropic':
      return callAnthropic(apiKey, params)
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`)
  }
}

/**
 * Map provider name to the CRE secret key that holds its API key.
 */
export function getSecretKeyForProvider(provider: string): string {
  switch (provider) {
    case 'google':
      return 'GEMINI_API_KEY'
    case 'openai':
      return 'OPENAI_API_KEY'
    case 'anthropic':
      return 'ANTHROPIC_API_KEY'
    case 'fireworks':
      return 'FIREWORKS_API_KEY'
    case 'xai':
      return 'XAI_API_KEY'
    default:
      return `${provider.toUpperCase()}_API_KEY`
  }
}
