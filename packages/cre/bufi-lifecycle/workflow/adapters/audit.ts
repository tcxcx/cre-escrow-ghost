/**
 * Audit Adapter — Canonical JSON + SHA-256 for CRE workflows
 *
 * Lightweight version of packages/core/artifacts/canonical.ts
 * that works within the CRE WASM runtime (no Node.js crypto import).
 */

/**
 * Serialize to canonical JSON (sorted keys, compact).
 */
export function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, (_, value) => {
    if (value === null || value === undefined) return value
    if (typeof value === 'bigint') return value.toString()
    if (Array.isArray(value)) return value
    if (typeof value === 'object') {
      const sorted: Record<string, unknown> = {}
      for (const key of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[key] = (value as Record<string, unknown>)[key]
      }
      return sorted
    }
    return value
  })
}

/**
 * SHA-256 hash (works in CRE WASM environment).
 * Returns lowercase hex string.
 */
export async function sha256(data: string): Promise<string> {
  const bytes = new TextEncoder().encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Hash a document: canonical JSON -> SHA-256.
 */
export async function hashDocument(doc: unknown): Promise<string> {
  return sha256(canonicalJson(doc))
}

/**
 * Create an artifact record with hash.
 */
export async function createArtifact(
  doc: unknown,
  type: string,
  pathPrefix: string
): Promise<{
  json: string
  sha256: string
  type: string
  storageRef: string
  createdAt: string
}> {
  const json = canonicalJson(doc)
  const hash = await sha256(json)
  return {
    json,
    sha256: hash,
    type,
    storageRef: `${pathPrefix}/${type}_${hash.slice(0, 12)}.json`,
    createdAt: new Date().toISOString(),
  }
}
