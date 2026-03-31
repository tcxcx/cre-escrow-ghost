/**
 * @bu/env — Universal environment variable reader
 *
 * Resolution order: override → process.env → globalThis.__BU_ENV__
 *
 * Works in Node, CF Workers, and edge runtimes.
 */

declare global {
  // eslint-disable-next-line no-var
  var __BU_ENV__: Record<string, string> | undefined;
}

/**
 * Resolve an env var with override-first semantics.
 * Returns undefined when not found anywhere.
 */
export function resolve(key: string, override?: string): string | undefined {
  if (override !== undefined && override !== '') return override;

  if (typeof process !== 'undefined' && process.env?.[key] !== undefined) {
    return process.env[key];
  }

  return globalThis.__BU_ENV__?.[key];
}

/**
 * Resolve an env var, throwing if it is missing.
 */
export function required(key: string, override?: string): string {
  const value = resolve(key, override);
  if (value === undefined || value === '') {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Resolve a boolean env var.
 * Truthy: "true", "1", "yes" (case-insensitive).
 */
export function resolveBoolean(key: string, override?: boolean): boolean {
  if (override !== undefined) return override;
  const raw = resolve(key);
  if (!raw) return false;
  return ['true', '1', 'yes'].includes(raw.toLowerCase());
}

/**
 * Resolve a numeric env var with a fallback default.
 */
export function resolveNumber(key: string, fallback: number, override?: number): number {
  if (override !== undefined) return override;
  const raw = resolve(key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
}

// ---------------------------------------------------------------------------
// NODE_ENV helpers
// ---------------------------------------------------------------------------

export function nodeEnv(): string {
  return resolve('NODE_ENV') ?? 'development';
}

export function isDev(): boolean {
  return nodeEnv() === 'development';
}

export function isProd(): boolean {
  return nodeEnv() === 'production';
}

export function isTest(): boolean {
  return nodeEnv() === 'test';
}
