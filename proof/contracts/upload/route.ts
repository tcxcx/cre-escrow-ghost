// SECURITY: requires auth — upload deliverable files for a milestone
import { NextResponse } from 'next/server'
import { requireAuth, requireRateLimit } from '@bu/api-helpers'
import { getLimiter } from '@bu/kv/ratelimit'
import { createLogger } from '@bu/logger'

const logger = createLogger({ prefix: 'api:contracts:milestone-upload' })

const BUCKET_NAME = 'contract-deliverables'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const MAX_FILES = 10
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/markdown',
  'application/json',
])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; msId: string }> },
) {
  try {
    const { user, supabase, error: authError } = await requireAuth()
    if (authError) return authError

    const { error: rlError } = await requireRateLimit(
      `user:${user.id}`,
      getLimiter('standard'),
    )
    if (rlError) return rlError

    const { id: agreementId, msId: milestoneId } = await params

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files per upload` },
        { status: 400 },
      )
    }

    // Validate all files before uploading any
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `File type not allowed: ${file.type} (${file.name})` },
          { status: 400 },
        )
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large: ${file.name} (max 50 MB)` },
          { status: 400 },
        )
      }
      if (file.size === 0) {
        return NextResponse.json(
          { error: `Empty file: ${file.name}` },
          { status: 400 },
        )
      }
    }

    const uploadedFiles: Array<{
      name: string
      url: string
      path: string
      size: number
      type: string
      uploadedAt: string
    }> = []

    for (const file of files) {
      const bytes = await file.arrayBuffer()
      const safeName = encodeURIComponent(file.name)
      const timestamp = Date.now()
      const storagePath = `${agreementId}/${milestoneId}/${timestamp}_${safeName}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, bytes, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        logger.error('Storage upload failed', {
          agreementId,
          milestoneId,
          fileName: file.name,
          error: uploadError.message,
        })
        return NextResponse.json(
          { error: `Upload failed for ${file.name}: ${uploadError.message}` },
          { status: 500 },
        )
      }

      // Create a signed URL (7 days) — bucket is private by default
      const { data: signedData, error: signedError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(storagePath, 7 * 24 * 60 * 60)

      if (signedError || !signedData?.signedUrl) {
        logger.error('Failed to create signed URL', {
          storagePath,
          error: signedError?.message,
        })
        // File was uploaded but we can't get a URL — still return the path
        uploadedFiles.push({
          name: file.name,
          url: '',
          path: storagePath,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        })
        continue
      }

      uploadedFiles.push({
        name: file.name,
        url: signedData.signedUrl,
        path: storagePath,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      })
    }

    logger.info('Deliverable files uploaded', {
      agreementId,
      milestoneId,
      userId: user.id,
      fileCount: uploadedFiles.length,
      totalBytes: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
    })

    return NextResponse.json({
      files: uploadedFiles,
      agreementId,
      milestoneId,
    })
  } catch (error) {
    logger.error('Milestone file upload failed', {
      error: (error as Error).message,
    })
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 },
    )
  }
}
