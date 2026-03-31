/**
 * Motora API credentials.
 */

import { resolve, required } from './core';

export function getMotoraApiKey(override?: string): string | undefined {
  return resolve('MOTORA_API_KEY', override);
}

export function requireMotoraApiKey(override?: string): string {
  return required('MOTORA_API_KEY', override);
}

export function getMotoraUrl(override?: string): string | undefined {
  return resolve('MOTORA_URL', override);
}

export function requireMotoraUrl(override?: string): string {
  return required('MOTORA_URL', override);
}

export function getMotoraBackendUrl(): string | undefined {
  return resolve('MOTORA_BACKEND_URL') ?? resolve('MOTORA_URL');
}

export function getMotoraApiUrl(): string | undefined {
  return resolve('MOTORA_API_URL') ?? resolve('NEXT_PUBLIC_MOTORA_API_URL');
}

export function getMotoraSecret(): string | undefined {
  return resolve('MOTORA_SECRET');
}
