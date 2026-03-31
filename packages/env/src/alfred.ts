/**
 * Alfred API credentials.
 */

import { resolve, required } from './core';

export function getAlfredApiKey(override?: string): string | undefined {
  return resolve('ALFRED_API_KEY', override);
}

export function requireAlfredApiKey(override?: string): string {
  return required('ALFRED_API_KEY', override);
}

export function getAlfredSecret(override?: string): string | undefined {
  return resolve('ALFRED_SECRET', override);
}

export function getAlfredUrl(override?: string): string | undefined {
  return resolve('ALFRED_URL', override);
}

export function requireAlfredUrl(override?: string): string {
  return required('ALFRED_URL', override);
}

export function getAlfredWebsocketKey(): string | undefined {
  return resolve('ALFRED_WEBSOCKET_KEY');
}

export function getAlfredWebhookSecret(): string | undefined {
  return resolve('ALFRED_WEBHOOK_SECRET');
}
