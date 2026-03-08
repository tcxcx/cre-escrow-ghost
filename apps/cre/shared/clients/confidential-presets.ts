/**
 * Confidential Client Presets
 *
 * Pre-configured ConfidentialPlatformClients for platform APIs.
 * Use these when request/response data contains sensitive IP
 * (deliverables, dispute evidence, AI verdicts).
 * URLs come from CRE secrets (env vars), NOT from config.json.
 *
 * @example
 * ```ts
 * const shiva = confidentialShivaClient<Config>()
 * const result = shiva.post(runtime, "/intelligence/verify", payload, JSON.parse)
 * // result is EncryptedBodyResult — decrypt in Shiva backend only
 * ```
 */

import { createConfidentialPlatformClient } from "./confidential"
import type { ConfidentialPlatformClient } from "./confidential"

/** Config constraint — only needs owner for Vault DON */
interface ConfidentialOwnerConfig {
  owner: string
}

/**
 * Confidential Shiva client — encryptOutput: true
 * Used for: AI verification, dispute arbitration, receipt generation
 * All responses are AES-256-GCM encrypted (IP-sensitive data)
 * URL: from SHIVA_URL secret
 */
export function confidentialShivaClient<C extends ConfidentialOwnerConfig>(): ConfidentialPlatformClient<C> {
  return createConfidentialPlatformClient<C>({
    urlSecretId: "SHIVA_URL",
    getAuthHeader: () => ({
      key: "shivaApiKey",
      template: "{{.shivaApiKey}}",
    }),
    getOwner: (c) => c.owner,
    encryptOutput: true,
    authHeaderName: "X-API-Key",
  })
}

/**
 * Confidential Motora client — encryptOutput: false
 * Used for: Deframe Pods yield queries (financial ops, not IP)
 * Responses are NOT encrypted (yield data is not sensitive IP)
 * URL: from MOTORA_URL secret
 */
export function confidentialMotoraClient<C extends ConfidentialOwnerConfig>(): ConfidentialPlatformClient<C> {
  return createConfidentialPlatformClient<C>({
    urlSecretId: "MOTORA_URL",
    getAuthHeader: () => ({
      key: "motoraApiKey",
      template: "{{.motoraApiKey}}",
    }),
    getOwner: (c) => c.owner,
    encryptOutput: false,
    authHeaderName: "Authorization",
  })
}
