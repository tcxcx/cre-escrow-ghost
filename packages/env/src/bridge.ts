/**
 * Bridge API credentials.
 */

import { resolve, required } from './core';

export function getBridgeApiKey(override?: string): string | undefined {
  return resolve('BRIDGE_API_KEY', override);
}

export function requireBridgeApiKey(override?: string): string {
  return required('BRIDGE_API_KEY', override);
}

export function getBridgeBaseUrl(override?: string): string | undefined {
  return resolve('BRIDGE_BASE_URL', override);
}

export function getBridgeEnvironment(): string | undefined {
  return resolve('BRIDGE_ENVIRONMENT');
}

export function getBridgeWebhookSecret(): string | undefined {
  return resolve('BRIDGE_WEBHOOK_SECRET');
}

export function getBridgeWebhookPublicKeyPem(): string | undefined {
  return resolve('BRIDGE_WEBHOOK_PUBLIC_KEY_PEM');
}

export function getBridgeApiUrl(): string | undefined {
  return resolve('BRIDGE_API_URL') ?? resolve('BRIDGE_BASE_URL');
}
