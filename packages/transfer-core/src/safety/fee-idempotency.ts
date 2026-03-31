/**
 * Fee Idempotency — deterministic, UUID-formatted idempotency keys for fee
 * collection transactions.
 *
 * Same inputs always produce the same key, preventing double-collection on
 * retry while remaining Circle-API compatible (UUID v4 format).
 */

import { createHash } from 'crypto';

/**
 * Generate a deterministic idempotency key from stable user-intent identifiers.
 *
 * Uses walletId + recipientAddress + amounts (and optionally transactionId)
 * to produce a key that is identical across retries of the same transfer:
 * - Retries always produce the same key (prevents double-charge)
 * - Different user intents (different amounts/recipients) produce different keys
 *
 * No time component is included — the key is purely intent-based to avoid
 * boundary issues where a retry crossing a time window would generate a
 * different key and cause a double-charge.
 *
 * Output is formatted as a UUID v4-like string (8-4-4-4-12) so it passes
 * Circle API validation.
 */
export function generateFeeIdempotencyKey(
  walletId: string,
  recipientAddress: string,
  feeAmount: string,
  transferAmount: string,
  transactionId?: string,
): string {
  const parts = [
    'fee',
    walletId,
    recipientAddress,
    feeAmount,
    transferAmount,
  ];
  if (transactionId) {
    parts.push(transactionId);
  }
  const input = parts.join(':');
  const hash = createHash('sha256').update(input).digest('hex');

  // Format first 32 hex chars as UUID: 8-4-4-4-12
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-');
}
