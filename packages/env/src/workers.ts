/**
 * Cloudflare Workers environment binding sync.
 *
 * Absorbs patterns from:
 *   - apps/shiva/src/utils/env.ts
 *   - packages/trigger/src/utils/env.ts
 *
 * Uses the package-neutral global `__BU_ENV__` (replaces `__SHIVA_ENV__`).
 */

import { resolve } from './core';

declare global {
  // eslint-disable-next-line no-var
  var __BU_ENV_SYNCED__: boolean | undefined;
}

/**
 * Sync bindings provided by Cloudflare with both a global cache and process.env.
 *
 * Idempotent per isolate — subsequent calls are no-ops unless `forceSync` is true
 * (for secret rotation scenarios).
 */
export function syncEnvFromBindings(
  bindings: Record<string, unknown>,
  forceSync = false,
): void {
  if (globalThis.__BU_ENV_SYNCED__ && !forceSync) return;

  const globalEnv = (globalThis.__BU_ENV__ ??= {});

  for (const [key, value] of Object.entries(bindings)) {
    if (typeof value !== 'string') continue;
    globalEnv[key] = value;

    if (typeof process !== 'undefined' && process.env) {
      process.env[key] = value;
    }
  }

  globalThis.__BU_ENV_SYNCED__ = true;
}

/**
 * Read an environment variable. Alias for `resolve()` — kept for backwards compatibility.
 */
export function getEnvVar(key: string): string | undefined {
  return resolve(key);
}
