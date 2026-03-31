/**
 * Circle credentials.
 *
 * Absorbs: packages/circle/src/utils/secrets.ts
 */

import { resolve, required } from './core';

export function getCircleApiKey(override?: string): string | undefined {
  return resolve('CIRCLE_API_KEY', override);
}

export function getCircleEntitySecret(override?: string): string | undefined {
  return resolve('CIRCLE_ENTITY_SECRET', override);
}

export function getSolanaPrivateKey(override?: string): string | undefined {
  return resolve('SOLANA_PRIVATE_KEY', override);
}

export function getEthereumPrivateKey(override?: string): string | undefined {
  return resolve('ETH_PRIVATE_KEY', override);
}

export function getPrivateKey(network: 'solana' | 'evm', override?: string): string {
  if (!network) {
    throw new Error('No network sending route declared for viem or solana adapters');
  }

  if (network === 'solana') {
    const key = getSolanaPrivateKey(override);
    if (!key) throw new Error('SOLANA_PRIVATE_KEY is required for Solana network');
    return key;
  }

  const key = getEthereumPrivateKey(override);
  if (!key) throw new Error('ETH_PRIVATE_KEY is required for EVM network');
  return key;
}

export function getCircleCredentials(apiKey?: string, entitySecret?: string) {
  const key = getCircleApiKey(apiKey);
  const secret = getCircleEntitySecret(entitySecret);

  if (!key || !secret) {
    throw new Error('CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET are required');
  }

  return { apiKey: key, entitySecret: secret };
}

export function getCircleWebhookSecret(): string | undefined {
  return resolve('CIRCLE_WEBHOOK_SECRET');
}
