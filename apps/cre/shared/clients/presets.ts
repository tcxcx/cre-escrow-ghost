/**
 * Pre-Configured Platform Clients
 *
 * One-liner client creation for each platform service.
 * URLs come from CRE secrets (env vars), NOT from config.json.
 *
 * @example
 * ```ts
 * const shiva = shivaClient()
 * const transfer = shiva.get(runtime, `/transfers/${id}`, JSON.parse)
 * ```
 */

import { createPlatformClient, type PlatformClient } from "./create-client"

// ============================================================================
// Shiva -- Transfers, Wallets, Invoices, Payroll, Cards
// ============================================================================

/**
 * Shiva API client with consensus verification.
 * Auth: X-API-Key header (same as Shiva's conditionalAuth middleware).
 * URL: from SHIVA_URL secret (env var SHIVA_URL_VAR)
 */
export function shivaClient<C>(): PlatformClient<C> {
  return createPlatformClient<C>({
    secretId: "SHIVA_API_KEY",
    urlSecretId: "SHIVA_URL",
    authType: "api-key",
  })
}

// ============================================================================
// Motora -- Bridge, Alfred, Bank Data, Ramps, Rates
// ============================================================================

/**
 * Motora API client with consensus verification.
 * Auth: Bearer token (same as Motora's API_SECRET_KEY auth).
 * URL: from MOTORA_URL secret (env var MOTORA_URL_VAR)
 */
export function motoraClient<C>(): PlatformClient<C> {
  return createPlatformClient<C>({
    secretId: "MOTORA_API_KEY",
    urlSecretId: "MOTORA_URL",
    authType: "bearer",
  })
}

// ============================================================================
// Supabase -- Direct DB Verification Queries
// ============================================================================

/**
 * Supabase REST API client with consensus verification.
 * Auth: apikey header with service role key (PostgREST standard).
 * URL: from SUPABASE_URL secret + /rest/v1 suffix
 */
export function supabaseClient<C>(): PlatformClient<C> {
  return createPlatformClient<C>({
    secretId: "SUPABASE_SERVICE_KEY",
    urlSecretId: "SUPABASE_URL",
    urlSuffix: "/rest/v1",
    authType: "bearer",
    authHeader: "apikey",
  })
}

// ============================================================================
// ACE -- Chainlink ACE Private Transfer API
// ============================================================================

/**
 * ACE API client with consensus verification.
 * Auth: Bearer token (API key for ACE convergence token API).
 * URL: from ACE_URL secret (env var ACE_URL_VAR)
 */
export function aceClient<C>(): PlatformClient<C> {
  return createPlatformClient<C>({
    secretId: "ACE_API_KEY",
    urlSecretId: "ACE_URL",
    authType: "bearer",
  })
}
