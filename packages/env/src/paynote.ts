/**
 * Paynote API credentials.
 */

import { resolve, required } from './core';

export function getPaynoteSecretKey(override?: string): string | undefined {
  return resolve('PAYNOTE_SECRET_KEY', override);
}

export function requirePaynoteSecretKey(override?: string): string {
  return required('PAYNOTE_SECRET_KEY', override);
}

export function getPaynoteBaseUrl(override?: string): string | undefined {
  return resolve('PAYNOTE_BASE_URL', override) ?? 'https://paynote-sandbox.seamlesschex.com';
}
