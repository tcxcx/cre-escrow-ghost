/**
 * Type definitions for @bu/env
 */

/** A function that resolves an optional env var (may return undefined). */
export type EnvAccessor = (override?: string) => string | undefined;

/** A function that resolves a required env var (throws if missing). */
export type RequiredEnvAccessor = (override?: string) => string;
