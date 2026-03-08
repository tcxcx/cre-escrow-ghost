/**
 * Trigger.dev credentials.
 */

import { resolve, required, resolveBoolean } from './core';

export function getTriggerSecretKey(override?: string): string | undefined {
  return resolve('TRIGGER_SECRET_KEY', override);
}

export function requireTriggerSecretKey(override?: string): string {
  return required('TRIGGER_SECRET_KEY', override);
}

export function getTriggerApiKey(): string | undefined {
  return resolve('TRIGGER_API_KEY');
}

export function getTriggerApiUrl(): string | undefined {
  return resolve('TRIGGER_API_URL');
}

export function getTriggerEnvironment(): string | undefined {
  return resolve('TRIGGER_ENVIRONMENT');
}

/**
 * Whether to auto-promote unmatched inbox items to manual transactions.
 * Useful for banks without open finance (e.g. Argentine/LATAM banks).
 */
export function isInboxAutoPromoteEnabled(override?: boolean): boolean {
  return resolveBoolean('INBOX_AUTO_PROMOTE_ENABLED', override);
}
