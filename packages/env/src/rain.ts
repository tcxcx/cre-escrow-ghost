/**
 * Rain API credentials.
 */

import { resolve, required } from './core';

export function getRainApiKey(override?: string): string | undefined {
  return resolve('RAIN_API_KEY', override);
}

export function requireRainApiKey(override?: string): string {
  return required('RAIN_API_KEY', override);
}

export function getRainUrl(override?: string): string | undefined {
  return resolve('RAIN_URL', override);
}

export function requireRainUrl(override?: string): string {
  return required('RAIN_URL', override);
}

export function getRainWebhookSecret(): string | undefined {
  return resolve('RAIN_WEBHOOK_SECRET');
}
