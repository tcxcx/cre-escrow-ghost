/**
 * AI service credentials (OpenAI, Anthropic, Google AI, Tavily, Exa, XAI, ElevenLabs).
 */

import { resolve, isProd } from './core';

export function getOpenAiApiKey(): string | undefined {
  return resolve('OPENAI_API_KEY');
}

export function getAnthropicApiKey(): string | undefined {
  return resolve('ANTHROPIC_API_KEY');
}

export function getXaiApiKey(): string | undefined {
  return resolve('XAI_API_KEY');
}

export function getElevenLabsApiKey(): string | undefined {
  return resolve('ELEVENLABS_API_KEY');
}

export function getElevenLabsVoiceId(): string | undefined {
  return resolve('ELEVENLABS_VOICE_ID');
}

export function getExaApiKey(): string | undefined {
  return resolve('EXA_API_KEY');
}

export function getGoogleAiApiKey(): string | undefined {
  return resolve('GOOGLE_GENERATIVE_AI_API_KEY');
}

export function getTavilyApiKey(): string | undefined {
  return resolve('TAVILY_API_KEY');
}

/** @deprecated Perplexity replaced by Exa. Will be removed after env var cleanup. */
export function getPerplexityApiKey(): string | undefined {
  return resolve('PERPLEXITY_API_KEY');
}

export function getAssemblyaiApiKey(): string | undefined {
  return resolve('ASSEMBLYAI_API_KEY');
}

export function getDeepgramApiKey(): string | undefined {
  return resolve('DEEPGRAM_API_KEY');
}

export function getGroqApiKey(): string | undefined {
  return resolve('GROQ_API_KEY');
}

export function getMistralApiKey(): string | undefined {
  return resolve('MISTRAL_API_KEY');
}

export function getLmntApiKey(): string | undefined {
  return resolve('LMNT_API_KEY');
}

export function getCfAccountId(): string | undefined {
  return resolve('CF_ACCOUNT_ID');
}

export function getCfGatewayId(): string | undefined {
  return resolve('CF_GATEWAY_ID');
}

export function getCfAigToken(): string | undefined {
  return resolve('CF_AIG_TOKEN');
}

export function getPipedreamApiKey(): string | undefined {
  return resolve('PIPEDREAM_API_KEY');
}

/** Whether A2UI generative UI emission is enabled. Defaults to false. */
export function isA2UIEnabled(): boolean {
  return resolve('A2UI_ENABLED') === 'true';
}

export function getPipedreamProjectId(): string | undefined {
  return resolve('PIPEDREAM_PROJECT_ID');
}

export function getPipedreamClientId(): string | undefined {
  return resolve('PIPEDREAM_CLIENT_ID');
}

export function getPipedreamClientSecret(): string | undefined {
  return resolve('PIPEDREAM_CLIENT_SECRET');
}

export function getPipedreamEnvironment(): string {
  return resolve('PIPEDREAM_ENVIRONMENT') || (isProd() ? 'production' : 'development');
}

export function getPipedreamAllowedOrigins(): string | undefined {
  return resolve('PIPEDREAM_ALLOWED_ORIGINS');
}
