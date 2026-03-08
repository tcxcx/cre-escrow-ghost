'use client'

import { useState, useCallback } from 'react'
import { Button } from '@bu/ui/button'
import { Textarea } from '@bu/ui/textarea'
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@bu/ui/cn'

interface DeliverableSubmitFormProps {
  agreementId: string
  milestoneId: string
  milestoneTitle: string
  onSuccess?: () => void
}

type UploadedFile = { name: string; url: string; size: number; type: string }

export function DeliverableSubmitForm({
  agreementId,
  milestoneId,
  milestoneTitle,
  onSuccess,
}: DeliverableSubmitFormProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [notes, setNotes] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...droppedFiles])
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
    }
  }, [])

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setError(null)
    setIsUploading(true)

    try {
      // Step 1: Upload files to Supabase Storage
      let fileRefs: UploadedFile[] = uploadedFiles
      if (files.length > 0) {
        const formData = new FormData()
        for (const file of files) {
          formData.append('files', file)
        }

        const uploadRes = await fetch(
          `/api/contracts/agreements/${agreementId}/milestones/${milestoneId}/upload`,
          { method: 'POST', body: formData },
        )

        if (!uploadRes.ok) {
          const err = await uploadRes.json()
          throw new Error(err.error || 'Upload failed')
        }

        const uploadData = await uploadRes.json()
        fileRefs = [...uploadedFiles, ...uploadData.files]
        setUploadedFiles(fileRefs)
      }

      setIsUploading(false)
      setIsSubmitting(true)

      // Step 2: Submit deliverable to Shiva
      const submitRes = await fetch(
        `/api/contracts/agreements/${agreementId}/milestones/${milestoneId}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: fileRefs,
            notes,
          }),
        },
      )

      if (!submitRes.ok) {
        const err = await submitRes.json()
        throw new Error(err.error || 'Submission failed')
      }

      setSuccess(true)
      onSuccess?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsUploading(false)
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        <h3 className="text-lg font-semibold text-foreground">Deliverable Submitted</h3>
        <p className="text-sm text-muted-foreground">
          The AI arbitrator is now verifying your submission for &quot;{milestoneTitle}&quot;.
          You&apos;ll be notified when verification is complete.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Submit Deliverable</h3>
        <p className="text-sm text-muted-foreground">
          Upload your work for &quot;{milestoneTitle}&quot; — it will be verified by the AI arbitrator.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
          'border-border hover:border-primary/50 hover:bg-primary/5',
        )}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Drop files here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, images, ZIP, or any document</p>
        <input
          id="file-input"
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((file, i) => (
            <div key={`file-${file.name}-${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button type="button" onClick={() => removeFile(i)} className="p-1 hover:bg-muted rounded">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      <div>
        <label htmlFor="submission-notes" className="text-sm font-medium text-foreground mb-2 block">
          Submission Notes
        </label>
        <Textarea
          id="submission-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe what you're delivering, any notes for the reviewer..."
          rows={4}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {notes.length}/2000
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={isUploading || isSubmitting || (files.length === 0 && uploadedFiles.length === 0)}
        className="w-full"
      >
        {isUploading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading Files...</>
        ) : isSubmitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting for AI Verification...</>
        ) : (
          'Submit Deliverable'
        )}
      </Button>
    </div>
  )
}
