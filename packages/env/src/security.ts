/**
 * Security credentials (Guardia, JWT, webhook secrets).
 */

import { resolve, required } from './core';

export function getGuardiaEncryptionKey(override?: string): string | undefined {
  return resolve('GUARDIA_ENCRYPTION_KEY', override);
}

export function requireGuardiaEncryptionKey(override?: string): string {
  return required('GUARDIA_ENCRYPTION_KEY', override);
}

export function getInvoiceJwtSecret(): string | undefined {
  return resolve('INVOICE_JWT_SECRET');
}

export function getBillingStateSecret(): string | undefined {
  return resolve('BILLING_STATE_SECRET');
}

export function getBuCacheApiSecret(): string | undefined {
  return resolve('BU_CACHE_API_SECRET');
}

export function getGuardiaEncryptionKeyPrevious(): string | undefined {
  return resolve('GUARDIA_ENCRYPTION_KEY_PREVIOUS');
}

export function getApiSecretKey(): string | undefined {
  return resolve('API_SECRET_KEY');
}

export function getTeamStateSecret(): string | undefined {
  return resolve('TEAM_STATE_SECRET');
}

export function getWebhookSecretKey(): string | undefined {
  return resolve('WEBHOOK_SECRET_KEY');
}

export function getIpHashSalt(): string | undefined {
  return resolve('IP_HASH_SALT');
}

export function getCacheBusterSecret(): string | undefined {
  return resolve('CACHE_BUSTER_SECRET');
}

export function getGuardiaDebug(): boolean {
  return resolve('GUARDIA_DEBUG') === 'true';
}

// -- Bu Encryption ---------------------------------------------------------

export function getBuEncryptionKey(): string | undefined {
  return resolve('BU_ENCRYPTION_KEY');
}

export function requireBuEncryptionKey(): string {
  return required('BU_ENCRYPTION_KEY');
}

export function getFileKeySecret(): string | undefined {
  return resolve('FILE_KEY_SECRET');
}

export function requireFileKeySecret(): string {
  return required('FILE_KEY_SECRET');
}

// -- Insights Audio Token --------------------------------------------------

export function getInsightsAudioTokenSecret(): string | undefined {
  return resolve('INSIGHTS_AUDIO_TOKEN_SECRET');
}

export function requireInsightsAudioTokenSecret(): string {
  return required('INSIGHTS_AUDIO_TOKEN_SECRET');
}

// -- Logging ---------------------------------------------------------------

export function getLogLevel(): string {
  return resolve('LOG_LEVEL') ?? 'info';
}

export function isLogPretty(): boolean {
  return resolve('LOG_PRETTY') === 'true';
}
