/**
 * Exa API credentials for web research enrichment.
 *
 * Required env vars:
 *   EXA_API_KEY — Exa API key from https://exa.ai
 */

import { resolve } from './core';

export function getExaApiKey(): string | undefined {
  return resolve('EXA_API_KEY');
}

export function requireExaApiKey(): string {
  const key = getExaApiKey();
  if (!key) throw new Error('EXA_API_KEY is required for web research enrichment');
  return key;
}

/**
 * Whether Exa enrichment is enabled.
 * Auto-enabled when API key is present.
 */
export function isExaEnabled(): boolean {
  return !!getExaApiKey();
}
