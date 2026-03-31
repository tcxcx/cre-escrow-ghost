/**
 * Canonical JSON Serialization + SHA-256 Hashing
 *
 * Every artifact in the BUFI system must be:
 *   1. Serialized to canonical JSON (sorted keys, no whitespace)
 *   2. Hashed with SHA-256
 *   3. The hash is deterministic: same input always produces same hash
 *
 * Migrated from apps/contract-builder/packages/intelligence/audit.ts
 * and hardened for cross-platform consistency.
 */

/**
 * Serialize an object to canonical JSON.
 *
 * Rules for deterministic hashing:
 *   - Sort object keys lexicographically (recursive)
 *   - Use arrays in their original order (arrays are ordered)
 *   - No whitespace (compact)
 *   - Integer strings for token amounts
 *   - Normalize timestamps to ISO8601
 */
export function canonicalJsonSerialize(obj: unknown): string {
  return JSON.stringify(obj, sortReplacer)
}

/**
 * JSON.stringify replacer that sorts object keys lexicographically.
 */
function sortReplacer(_key: string, value: unknown): unknown {
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
}

/**
 * Hash a document using SHA-256.
 *
 * Works in both Node.js (via crypto.subtle) and Cloudflare Workers.
 * Returns lowercase hex string (no 0x prefix).
 */
export async function sha256Hash(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Canonical hash: serialize to canonical JSON then SHA-256.
 *
 * This is the standard operation for all artifacts:
 *   const hash = await canonicalHash(myArtifact)
 */
export async function canonicalHash(document: unknown): Promise<string> {
  const json = canonicalJsonSerialize(document)
  return sha256Hash(json)
}

/**
 * Hash and serialize together — returns both the canonical JSON string and its hash.
 * Useful when you need to store the JSON and its hash in one operation.
 */
export async function hashAndSerialize(document: unknown): Promise<{
  json: string
  sha256: string
}> {
  const json = canonicalJsonSerialize(document)
  const hash = await sha256Hash(json)
  return { json, sha256: hash }
}
