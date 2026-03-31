/**
 * Pods (Deframe) API credentials.
 */

import { resolve, required } from './core';

export function getPodsApiKey(override?: string): string | undefined {
  return resolve('PODS_API_KEY', override);
}

export function requirePodsApiKey(override?: string): string {
  return required('PODS_API_KEY', override);
}

export function getPodsBaseUrl(override?: string): string | undefined {
  return resolve('PODS_BASE_URL', override);
}

export function requirePodsBaseUrl(override?: string): string {
  return required('PODS_BASE_URL', override);
}
