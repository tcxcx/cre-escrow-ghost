'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Upload, FileSpreadsheet, FileText, Loader2, X, Download } from 'lucide-react'
import { Button } from '@bu/ui/button'
import { Progress } from '@bu/ui/progress'
import { cn } from '@bu/ui/cn'

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export type AcceptedFileType = '.csv' | '.pdf'

export interface UploadedFile {
  file: File
  type: AcceptedFileType
}

export interface FileDropzoneProps {
  /** Which file types to accept. Defaults to both. */
  accept?: AcceptedFileType[]
  /** Max file size in bytes. Defaults to 25MB. */
  maxSize?: number
  /** Called when a valid file is selected */
  onFileAccepted: (uploaded: UploadedFile) => void
  /** Whether the dropzone is currently processing */
  isProcessing?: boolean
  /** Upload progress 0-100. Shown when isProcessing is true */
  progress?: number
  /** The currently selected file (for showing progress card) */
  currentFile?: File | null
  /** Upload start time label */
  uploadStartTime?: string | null
  /** Called to clear the current file */
  onClear?: () => void
  /** Template download config. If set, shows the template card. */
  templateDownload?: {
    label: string
    description: string
    onDownload: () => void
  }
  className?: string
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getExtension(name: string): AcceptedFileType | null {
  if (name.endsWith('.csv')) return '.csv'
  if (name.endsWith('.pdf')) return '.pdf'
  return null
}

function FileIcon({ ext, className }: { ext: AcceptedFileType | null; className?: string }) {
  if (ext === '.csv') return <FileSpreadsheet className={className} />
  if (ext === '.pdf') return <FileText className={className} />
  return <Upload className={className} />
}

const formatLabels: Record<AcceptedFileType, string> = {
  '.csv': 'CSV',
  '.pdf': 'PDF',
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export function FileDropzone({
  accept = ['.csv', '.pdf'],
  maxSize = 25 * 1024 * 1024,
  onFileAccepted,
  isProcessing = false,
  progress = 0,
  currentFile = null,
  uploadStartTime = null,
  onClear,
  templateDownload,
  className,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptStr = accept.join(',')
  const formatList = accept.map((a) => formatLabels[a]).join(', ')
  const maxSizeMB = `${Math.round(maxSize / (1024 * 1024))}MB`

  const validate = useCallback(
    (file: File): UploadedFile | null => {
      setError(null)
      const ext = getExtension(file.name)
      if (!ext || !accept.includes(ext)) {
        setError(`Please upload a ${formatList} file`)
        return null
      }
      if (file.size > maxSize) {
        setError(`File size must be less than ${maxSizeMB}`)
        return null
      }
      return { file, type: ext }
    },
    [accept, maxSize, formatList, maxSizeMB]
  )

  const handleSelect = useCallback(
    (file: File) => {
      const result = validate(file)
      if (result) onFileAccepted(result)
    },
    [validate, onFileAccepted]
  )

  // Drag handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleSelect(file)
  }
  const handleClick = () => {
    if (!isProcessing && !currentFile) inputRef.current?.click()
  }

  const hasFile = !!currentFile
  const fileExt = currentFile ? getExtension(currentFile.name) : null

  return (
    <div className={cn('space-y-4', className)}>
      {/* ── Dropzone area ── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isProcessing && !hasFile) handleClick()
        }}
        role="button"
        tabIndex={0}
        aria-label="File upload area"
        className={cn(
          'relative rounded-xl p-12 text-center transition-all',
          'border-2 border-dashed',
          isDragging && 'border-primary bg-primary/5',
          !isDragging && !hasFile && 'border-border/60 bg-muted/30 hover:border-muted-foreground/30 cursor-pointer',
          !isDragging && hasFile && 'border-border/60 bg-muted/30',
          isProcessing && 'pointer-events-none'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptStr}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleSelect(f)
            e.target.value = ''
          }}
        />

        {/* Folder/file icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-14 rounded-xl bg-muted/80 border border-border/40 flex items-center justify-center shadow-sm">
            <Upload className="w-6 h-6 text-muted-foreground/70" />
          </div>
        </div>

        <p className="text-foreground font-medium text-[15px]">
          Choose a file or drag & drop it here.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {formatList} format, up to {maxSizeMB}.
        </p>

        <Button
          variant="outline"
          size="sm"
          className="mt-4 gap-2 bg-transparent"
          onClick={(e) => {
            e.stopPropagation()
            inputRef.current?.click()
          }}
        >
          <FileIcon ext={accept.length === 1 ? accept[0] : null} className="w-4 h-4" />
          Browse file
        </Button>
      </div>

      {/* ── Format / size info ── */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          {'Supported formats: '}
          <span className="font-medium text-foreground">{formatList}</span>
        </span>
        <span>
          {'Maximum size: '}
          <span className="font-medium text-foreground">{maxSizeMB}</span>
        </span>
      </div>

      {/* ── Error message ── */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Upload progress card ── */}
      {isProcessing && currentFile && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <FileIcon ext={fileExt} className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{currentFile.name}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Uploading...</span>
                </div>
              </div>
            </div>
            {uploadStartTime && (
              <span className="text-xs text-muted-foreground">
                {'Started: '}{uploadStartTime}
              </span>
            )}
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {/* ── Completed file card (not processing) ── */}
      {!isProcessing && currentFile && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <FileIcon ext={fileExt} className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{currentFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(currentFile.size)}</p>
              </div>
            </div>
            {onClear && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 bg-transparent"
                onClick={onClear}
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Template download card ── */}
      {templateDownload && !isProcessing && !currentFile && (
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{templateDownload.label}</p>
              <p className="text-xs text-muted-foreground">
                {templateDownload.description}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent shrink-0"
            onClick={templateDownload.onDownload}
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      )}
    </div>
  )
}
