/**
 * Artifact Storage Adapter
 *
 * Abstract interface for storing artifact JSON + metadata.
 * Uses Supabase Storage (arbitration-documents bucket) for confidential documents.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { canonicalJsonSerialize, sha256Hash } from './canonical'
import type { ArtifactType, StoredArtifact } from './types'

// ── Interface ──────────────────────────────────────────────────────────────

export interface ArtifactStore {
  /**
   * Store an artifact: serialize to canonical JSON, hash, upload, return ref.
   */
  putJSON(
    artifact: unknown,
    type: ArtifactType,
    pathPrefix: string
  ): Promise<StoredArtifact>

  /**
   * Retrieve an artifact by its storage ref.
   */
  getJSON(storageRef: string): Promise<unknown>
}

// ── Supabase Implementation ────────────────────────────────────────────────

const BUCKET_NAME = 'arbitration-documents'

export function createSupabaseArtifactStore(supabase: SupabaseClient): ArtifactStore {
  return {
    async putJSON(
      artifact: unknown,
      type: ArtifactType,
      pathPrefix: string
    ): Promise<StoredArtifact> {
      const json = canonicalJsonSerialize(artifact)
      const hash = await sha256Hash(json)
      const bytes = new TextEncoder().encode(json)

      const fileName = `${type}_${hash.slice(0, 12)}.json`
      const filePath = `${pathPrefix}/${fileName}`

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, bytes, {
          contentType: 'application/json',
          upsert: false,
        })

      // If file already exists (duplicate hash), that's fine — idempotent
      if (error && !error.message.includes('already exists') && !error.message.includes('Duplicate')) {
        throw new Error(`Failed to store artifact: ${error.message}`)
      }

      return {
        type,
        sha256: hash,
        storageRef: `supabase://${BUCKET_NAME}/${filePath}`,
        createdAt: new Date().toISOString(),
        sizeBytes: bytes.length,
      }
    },

    async getJSON(storageRef: string): Promise<unknown> {
      // Parse supabase://bucket/path
      const match = storageRef.match(/^supabase:\/\/([^/]+)\/(.+)$/)
      if (!match) {
        throw new Error(`Invalid storage ref: ${storageRef}`)
      }

      const [, bucket, path] = match
      const { data, error } = await supabase.storage.from(bucket).download(path)

      if (error || !data) {
        throw new Error(`Failed to retrieve artifact: ${error?.message}`)
      }

      const text = await data.text()
      return JSON.parse(text)
    },
  }
}

