/**
 * Platform Client Factory
 *
 * One factory that creates consensus-verified HTTP clients for any platform API.
 * Every call goes through CRE consensus -- multiple DON nodes independently
 * call the API and must agree on the response.
 *
 * @example
 * ```ts
 * const client = createPlatformClient<MyConfig>({
 *   secretId: "MY_API_KEY",
 *   urlSecretId: "MY_URL",
 *   authType: "bearer",
 * })
 *
 * const data = client.get(runtime, "/endpoint", JSON.parse)
 * ```
 */

import {
  HTTPClient,
  ok,
  consensusIdenticalAggregation,
  type Runtime,
  type HTTPSendRequester,
} from "@chainlink/cre-sdk"

// ============================================================================
// Types
// ============================================================================

/** Configuration for creating a platform client */
export interface PlatformClientOptions {
  /** CRE secret ID for authentication (e.g., "SHIVA_API_KEY") */
  secretId: string
  /** CRE secret ID for the base URL (e.g., "SHIVA_URL") */
  urlSecretId: string
  /** Authentication header format */
  authType: "bearer" | "api-key"
  /**
   * Custom auth header name.
   * Defaults to "Authorization" for bearer, "X-API-Key" for api-key.
   */
  authHeader?: string
  /** Suffix to append to the resolved base URL (e.g., "/rest/v1") */
  urlSuffix?: string
}

/** A consensus-verified HTTP client for a platform API */
export interface PlatformClient<C> {
  /** GET request with consensus verification */
  get<R>(runtime: Runtime<C>, path: string, parse: (body: string) => R): R
  /** POST request with consensus verification */
  post<R>(
    runtime: Runtime<C>,
    path: string,
    payload: unknown,
    parse: (body: string) => R,
    headers?: Record<string, string>
  ): R
  /** PATCH request with consensus verification */
  patch<R>(
    runtime: Runtime<C>,
    path: string,
    payload: unknown,
    parse: (body: string) => R,
    headers?: Record<string, string>
  ): R
}

// ============================================================================
// Helpers
// ============================================================================

function buildAuthHeaders(
  authType: "bearer" | "api-key",
  authHeader: string | undefined,
  secretValue: string
): Record<string, string> {
  if (authType === "bearer") {
    return { [authHeader ?? "Authorization"]: `Bearer ${secretValue}` }
  }
  return { [authHeader ?? "X-API-Key"]: secretValue }
}

function encodeBody(payload: unknown): string {
  const bodyBytes = new TextEncoder().encode(JSON.stringify(payload))
  return Buffer.from(bodyBytes).toString("base64")
}

/** Resolve base URL from CRE secret */
function resolveBaseUrl<C>(options: PlatformClientOptions, runtime: Runtime<C>): string {
  const raw = runtime.getSecret({ id: options.urlSecretId }).result().value
  return options.urlSuffix ? `${raw}${options.urlSuffix}` : raw
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a consensus-verified HTTP client for any platform API.
 *
 * The returned client's get() and post() methods run through CRE's
 * HTTPClient capability, which means:
 * - Multiple DON nodes independently call the API
 * - Results are aggregated via consensus (identical aggregation)
 * - You get a single, verified response
 *
 * @template C - Workflow config type
 * @param options - Client configuration
 * @returns Platform client with get() and post() methods
 */
export function createPlatformClient<C>(options: PlatformClientOptions): PlatformClient<C> {
  return {
    get<R>(runtime: Runtime<C>, path: string, parse: (body: string) => R): R {
      const httpClient = new HTTPClient()
      const secret = runtime.getSecret({ id: options.secretId }).result()
      const baseUrl = resolveBaseUrl(options, runtime)

      return httpClient
        .sendRequest(
          runtime,
          (sendRequester: HTTPSendRequester, config: C): R => {
            const resp = sendRequester
              .sendRequest({
                url: `${baseUrl}${path}`,
                method: "GET" as const,
                headers: {
                  ...buildAuthHeaders(options.authType, options.authHeader, secret.value),
                  "Content-Type": "application/json",
                },
              })
              .result()

            if (!ok(resp)) {
              const bodyText = resp.body ? new TextDecoder().decode(resp.body) : ""
              throw new Error(`GET ${baseUrl}${path} failed (${resp.statusCode}): ${bodyText}`)
            }

            return parse(new TextDecoder().decode(resp.body))
          },
          consensusIdenticalAggregation<R>()
        )(runtime.config)
        .result()
    },

    post<R>(
      runtime: Runtime<C>,
      path: string,
      payload: unknown,
      parse: (body: string) => R,
      headers?: Record<string, string>
    ): R {
      const httpClient = new HTTPClient()
      const secret = runtime.getSecret({ id: options.secretId }).result()
      const baseUrl = resolveBaseUrl(options, runtime)

      return httpClient
        .sendRequest(
          runtime,
          (sendRequester: HTTPSendRequester, config: C): R => {
            const resp = sendRequester
              .sendRequest({
                url: `${baseUrl}${path}`,
                method: "POST" as const,
                body: encodeBody(payload),
                headers: {
                  ...buildAuthHeaders(options.authType, options.authHeader, secret.value),
                  "Content-Type": "application/json",
                  ...(headers ?? {}),
                },
              })
              .result()

            if (!ok(resp)) {
              const bodyText = resp.body ? new TextDecoder().decode(resp.body) : ""
              throw new Error(`POST ${baseUrl}${path} failed (${resp.statusCode}): ${bodyText}`)
            }

            return parse(new TextDecoder().decode(resp.body))
          },
          consensusIdenticalAggregation<R>()
        )(runtime.config)
        .result()
    },
    patch<R>(
      runtime: Runtime<C>,
      path: string,
      payload: unknown,
      parse: (body: string) => R,
      headers?: Record<string, string>
    ): R {
      const httpClient = new HTTPClient()
      const secret = runtime.getSecret({ id: options.secretId }).result()
      const baseUrl = resolveBaseUrl(options, runtime)

      return httpClient
        .sendRequest(
          runtime,
          (sendRequester: HTTPSendRequester, config: C): R => {
            const resp = sendRequester
              .sendRequest({
                url: `${baseUrl}${path}`,
                method: "PATCH" as const,
                body: encodeBody(payload),
                headers: {
                  ...buildAuthHeaders(options.authType, options.authHeader, secret.value),
                  "Content-Type": "application/json",
                  ...(headers ?? {}),
                },
              })
              .result()

            if (!ok(resp)) {
              const bodyText = resp.body ? new TextDecoder().decode(resp.body) : ""
              throw new Error(`PATCH ${baseUrl}${path} failed (${resp.statusCode}): ${bodyText}`)
            }

            return parse(new TextDecoder().decode(resp.body))
          },
          consensusIdenticalAggregation<R>()
        )(runtime.config)
        .result()
    },
  }
}
