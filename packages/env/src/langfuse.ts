/**
 * Langfuse observability credentials.
 *
 * Required env vars:
 *   LANGFUSE_SECRET_KEY  — sk-lf-...
 *   LANGFUSE_PUBLIC_KEY  — pk-lf-...
 *   LANGFUSE_BASE_URL    — https://us.cloud.langfuse.com (Langfuse Cloud US)
 */

import { resolve, resolveBoolean } from './core';

export function getLangfuseSecretKey(): string | undefined {
  return resolve('LANGFUSE_SECRET_KEY');
}

export function getLangfusePublicKey(): string | undefined {
  return resolve('LANGFUSE_PUBLIC_KEY');
}

export function getLangfuseBaseUrl(): string | undefined {
  return resolve('LANGFUSE_BASE_URL');
}

/**
 * Whether Langfuse tracing is enabled.
 * Defaults to true when credentials are present.
 */
export function isLangfuseEnabled(): boolean {
  const explicit = resolveBoolean('LANGFUSE_ENABLED');
  if (explicit) return true;

  // Auto-enable when credentials are present
  return !!(getLangfuseSecretKey() && getLangfusePublicKey());
}

/**
 * Whether Langfuse prompt management is enabled.
 * Defaults to false — enable once prompts are created in Langfuse UI.
 * When false, getPromptWithFallback() returns the fallback immediately
 * with zero network calls and zero SDK error logs.
 */
export function isLangfusePromptManagementEnabled(): boolean {
  return resolveBoolean('LANGFUSE_PROMPT_MANAGEMENT');
}

/**
 * Whether LLM-as-a-judge evaluators are enabled.
 * Defaults to false — enable when ready to run automated quality evaluations.
 * Each evaluation makes an extra LLM call (gpt-4.1-nano), so opt-in only.
 */
export function isLangfuseEvaluatorsEnabled(): boolean {
  return resolveBoolean('LANGFUSE_EVALUATORS');
}
