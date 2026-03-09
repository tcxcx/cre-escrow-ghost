/**
 * Confidential Platform Client Factory
 *
 * Same interface as createPlatformClient(), but uses ConfidentialHTTPClient
 * for enclave-executed requests with secret injection and optional AES-256-GCM
 * response encryption.
 *
 * Secrets are referenced via {{.secretName}} template syntax -- they are
 * resolved inside the enclave and never leave it in plaintext.
 *
 * @example
 * ```ts
 * const client = createConfidentialPlatformClient<Config>({
 *   urlSecretId: "SHIVA_URL",
 *   getAuthHeader: (c) => ({ key: "shivaApiKey", template: "{{.shivaApiKey}}" }),
 *   getOwner: (c) => c.owner,
 *   encryptOutput: true,
 * })
 *
 * const result = client.post(runtime, "/intelligence/verify", payload, JSON.parse)
 * // result.bodyBase64 contains AES-256-GCM encrypted response
 * ```
 */

import {
  ConfidentialHTTPClient,
  consensusIdenticalAggregation,
  ok,
  type ConfidentialHTTPSendRequester,
  type Runtime,
} from "@chainlink/cre-sdk"

// ============================================================================
// Types
// ============================================================================

/** Base64-encoded AES-256-GCM encrypted body (nonce || ciphertext || tag) */
export interface EncryptedBodyResult {
  bodyBase64: string
}

/** Auth header configuration for confidential requests */
interface ConfidentialAuth {
  /** CRE Vault DON secret key name */
  key: string
  /** Template reference, e.g., "{{.shivaApiKey}}" */
  template: string
}

/** Configuration for creating a confidential platform client */
export interface ConfidentialClientOptions<C> {
  /** CRE secret ID for the base URL (e.g., "SHIVA_URL") */
  urlSecretId: string
  /** Get the auth header secret key and template */
  getAuthHeader: (config: C) => ConfidentialAuth
  /** Get the Vault DON owner address (empty string in simulation) */
  getOwner: (config: C) => string
  /** If true, response is AES-256-GCM encrypted before leaving enclave */
  encryptOutput?: boolean
  /** Auth header name (default: "X-API-Key") */
  authHeaderName?: string
}

/** A confidential HTTP client for enclave-protected API calls */
export interface ConfidentialPlatformClient<C> {
  /** GET with confidential execution */
  get<R>(runtime: Runtime<C>, path: string, parse: (body: string) => R): R | EncryptedBodyResult
  /** POST with confidential execution */
  post<R>(
    runtime: Runtime<C>,
    path: string,
    payload: unknown,
    parse: (body: string) => R,
  ): R | EncryptedBodyResult
}

// ============================================================================
// Helpers
// ============================================================================

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

export function bytesToBase64(bytes: Uint8Array): string {
  let out = ""
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    out += BASE64_ALPHABET[a >> 2]
    out += BASE64_ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)]
    out += b === undefined ? "=" : BASE64_ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)]
    out += c === undefined ? "=" : BASE64_ALPHABET[c & 63]
  }
  return out
}

/** WASM-safe btoa replacement: base64-encode a string (UTF-8) */
export function stringToBase64(str: string): string {
  return bytesToBase64(new TextEncoder().encode(str))
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a confidential platform client for enclave-protected API calls.
 *
 * Uses ConfidentialHTTPClient from CRE SDK:
 * - Secrets are injected via {{.secretName}} templates (resolved in enclave)
 * - vaultDonSecrets maps secret keys to Vault DON
 * - encryptOutput: true encrypts response with AES-256-GCM before leaving enclave
 * - consensusIdenticalAggregation verifies all enclaves produce identical results
 */
export function createConfidentialPlatformClient<C>(
  options: ConfidentialClientOptions<C>
): ConfidentialPlatformClient<C> {
  const headerName = options.authHeaderName ?? "X-API-Key"
  const shouldEncrypt = options.encryptOutput ?? false

  function buildVaultSecrets(config: C): Array<{ key: string; owner: string }> {
    const auth = options.getAuthHeader(config)
    const owner = options.getOwner(config)
    const secrets = [{ key: auth.key, owner }]
    if (shouldEncrypt) {
      secrets.push({ key: "san_marino_aes_gcm_encryption_key", owner })
    }
    return secrets
  }

  return {
    get<R>(runtime: Runtime<C>, path: string, parse: (body: string) => R): R | EncryptedBodyResult {
      const confClient = new ConfidentialHTTPClient()
      const baseUrl = runtime.getSecret({ id: options.urlSecretId }).result().value
      const auth = options.getAuthHeader(runtime.config)

      const fetchFn = (sendRequester: ConfidentialHTTPSendRequester, config: C) => {
        const resp = sendRequester
          .sendRequest({
            request: {
              url: `${baseUrl}${path}`,
              method: "GET",
              multiHeaders: {
                [headerName]: { values: [auth.template] },
                "Content-Type": { values: ["application/json"] },
              },
            },
            vaultDonSecrets: buildVaultSecrets(config),
            encryptOutput: shouldEncrypt,
          })
          .result()

        if (!ok(resp)) {
          throw new Error(`Confidential GET ${baseUrl}${path} failed (${resp.statusCode})`)
        }

        if (shouldEncrypt) {
          const body = resp.body ?? new Uint8Array(0)
          return { bodyBase64: bytesToBase64(body) } as EncryptedBodyResult
        }

        return parse(new TextDecoder().decode(resp.body)) as R
      }

      if (shouldEncrypt) {
        return confClient
          .sendRequest(runtime, fetchFn as any, consensusIdenticalAggregation<EncryptedBodyResult>())
          (runtime.config)
          .result() as EncryptedBodyResult
      }

      return confClient
        .sendRequest(runtime, fetchFn as any, consensusIdenticalAggregation<R>())
        (runtime.config)
        .result() as R
    },

    post<R>(
      runtime: Runtime<C>,
      path: string,
      payload: unknown,
      parse: (body: string) => R,
    ): R | EncryptedBodyResult {
      const confClient = new ConfidentialHTTPClient()
      const baseUrl = runtime.getSecret({ id: options.urlSecretId }).result().value
      const auth = options.getAuthHeader(runtime.config)
      const bodyBytes = new TextEncoder().encode(JSON.stringify(payload))
      const bodyB64 = bytesToBase64(bodyBytes)

      const fetchFn = (sendRequester: ConfidentialHTTPSendRequester, config: C) => {
        const resp = sendRequester
          .sendRequest({
            request: {
              url: `${baseUrl}${path}`,
              method: "POST",
              bodyString: bodyB64,
              multiHeaders: {
                [headerName]: { values: [auth.template] },
                "Content-Type": { values: ["application/json"] },
              },
            },
            vaultDonSecrets: buildVaultSecrets(config),
            encryptOutput: shouldEncrypt,
          })
          .result()

        if (!ok(resp)) {
          throw new Error(`Confidential POST ${baseUrl}${path} failed (${resp.statusCode})`)
        }

        if (shouldEncrypt) {
          const body = resp.body ?? new Uint8Array(0)
          return { bodyBase64: bytesToBase64(body) } as EncryptedBodyResult
        }

        return parse(new TextDecoder().decode(resp.body)) as R
      }

      if (shouldEncrypt) {
        return confClient
          .sendRequest(runtime, fetchFn as any, consensusIdenticalAggregation<EncryptedBodyResult>())
          (runtime.config)
          .result() as EncryptedBodyResult
      }

      return confClient
        .sendRequest(runtime, fetchFn as any, consensusIdenticalAggregation<R>())
        (runtime.config)
        .result() as R
    },
  }
}
