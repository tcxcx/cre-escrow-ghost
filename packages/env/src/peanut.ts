/**
 * Peanut Protocol credentials.
 *
 * Absorbs: packages/transfer-core/src/protocols/peanut-protocol/secrets.ts
 */

import { resolve } from './core';

export function getPeanutGasPrivateKey(override?: string): string | undefined {
  return resolve('PEANUT_GAS_PRIVATE_KEY', override);
}

/**
 * Peanut fallback wallet address for gas monitoring (admin dashboard).
 * Use this instead of deriving from private key — set PEANUT_FALLBACK_ADDRESS in env.
 */
export function getPeanutFallbackAddress(override?: string): string | undefined {
  return resolve('PEANUT_FALLBACK_ADDRESS', override);
}

export function getPeanutApiKey(override?: string): string | undefined {
  return resolve('PEANUT_API_KEY', override);
}

export function getPeanutRpcUrl(chainId: number, override?: string): string | undefined {
  return override || resolve(`PEANUT_RPC_URL_${chainId}`);
}

export function getPeanutCredentials(gasPrivateKey?: string, apiKey?: string) {
  const key = getPeanutGasPrivateKey(gasPrivateKey);
  if (!key) {
    throw new Error(
      'PEANUT_GAS_PRIVATE_KEY is required. Set it as an env var or pass as override.',
    );
  }
  return { gasPrivateKey: key, apiKey: getPeanutApiKey(apiKey) };
}
