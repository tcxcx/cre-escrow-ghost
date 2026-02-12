'use client'

import React, { useState, useCallback } from 'react'
import {
  Upload,
  File,
  FileText,
  FileImage,
  FileCode,
  FileArchive,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export interface UploadedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  status: 'uploading' | 'complete' | 'error'
  progress: number
  ipfsHash?: string
  error?: string
}

interface FileUploadZoneProps {
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSizeBytes?: number
  acceptedTypes?: string[]
  disabled?: boolean
  className?: string
}

const fileTypeIcons: Record<string, React.ElementType> = {
  'application/pdf': FileText,
  'image/': FileImage,
  'text/': FileCode,
  'application/zip': FileArchive,
  'application/x-zip-compressed': FileArchive,
}

function getFileIcon(type: string) {
  for (const [key, Icon] of Object.entries(fileTypeIcons)) {
    if (type.startsWith(key) || type === key) {
      return Icon
    }
  }
  return File
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUploadZone({
  files,
  onFilesChange,
  maxFiles = 10,
  maxSizeBytes = 50 * 1024 * 1024, // 50MB
  acceptedTypes = [
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
  ],
  disabled = false,
  className,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const processFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || disabled) return

    const newFiles: UploadedFile[] = []
    const currentCount = files.length

    Array.from(fileList).forEach((file, index) => {
      if (currentCount + newFiles.length >= maxFiles) {
        return
      }

      // Validate file type
      const isValidType = acceptedTypes.some(type => {
        if (type.endsWith('/')) {
          return file.type.startsWith(type)
        }
        return file.type === type
      })

      if (!isValidType) {
        newFiles.push({
          id: `${Date.now()}-${index}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'error',
          progress: 0,
          error: 'File type not supported',
        })
        return
      }

      // Validate file size
      if (file.size > maxSizeBytes) {
        newFiles.push({
          id: `${Date.now()}-${index}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'error',
          progress: 0,
          error: `File exceeds ${formatFileSize(maxSizeBytes)} limit`,
        })
        return
      }

      // Create uploading file entry
      const uploadFile: UploadedFile = {
        id: `${Date.now()}-${index}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        progress: 0,
      }

      newFiles.push(uploadFile)

      // Simulate upload progress (in production, this would be actual IPFS upload)
      simulateUpload(uploadFile.id)
    })

    onFilesChange([...files, ...newFiles])
  }, [files, onFilesChange, maxFiles, maxSizeBytes, acceptedTypes, disabled])

  const simulateUpload = (fileId: string) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 30 + 10
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        
        // Mark as complete with mock IPFS hash
        onFilesChange(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, status: 'complete' as const, progress: 100, ipfsHash: `Qm${Math.random().toString(36).substring(2, 15)}` }
            : f
        ))
      } else {
        onFilesChange(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, progress: Math.min(progress, 99) }
            : f
        ))
      }
    }, 200)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    processFiles(e.dataTransfer.files)
  }, [processFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files)
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [processFiles])

  const removeFile = useCallback((fileId: string) => {
    onFilesChange(files.filter(f => f.id !== fileId))
  }, [files, onFilesChange])

  const hasFiles = files.length > 0
  const canAddMore = files.length < maxFiles && !disabled

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-all',
          isDragging && 'border-primary bg-primary/5 scale-[1.02]',
          !isDragging && !disabled && 'border-border hover:border-primary/50 hover:bg-muted/30',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer'
        )}
        onClick={() => !disabled && document.getElementById('file-upload-input')?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            document.getElementById('file-upload-input')?.click()
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        <input
          id="file-upload-input"
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled}
        />

        <div className={cn(
          'w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-colors',
          isDragging ? 'bg-primary/10' : 'bg-muted'
        )}>
          <Upload className={cn(
            'w-8 h-8 transition-colors',
            isDragging ? 'text-primary' : 'text-muted-foreground'
          )} />
        </div>

        <p className="text-base font-medium text-foreground mb-1">
          {isDragging ? 'Drop files here' : 'Drag and drop your files'}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          or <span className="text-primary font-medium">click to browse</span>
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, Images, ZIP, JSON, TXT up to {formatFileSize(maxSizeBytes)} each
        </p>
        {maxFiles > 1 && (
          <p className="text-xs text-muted-foreground mt-1">
            {files.length} / {maxFiles} files uploaded
          </p>
        )}
      </div>

      {/* File List */}
      {hasFiles && (
        <div className="space-y-2">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.type)
            return (
              <div
                key={file.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                  file.status === 'error' && 'border-destructive/50 bg-destructive/5',
                  file.status === 'complete' && 'border-emerald-500/50 bg-emerald-500/5',
                  file.status === 'uploading' && 'border-border bg-muted/30'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                  file.status === 'error' && 'bg-destructive/10',
                  file.status === 'complete' && 'bg-emerald-500/10',
                  file.status === 'uploading' && 'bg-muted'
                )}>
                  <FileIcon className={cn(
                    'w-5 h-5',
                    file.status === 'error' && 'text-destructive',
                    file.status === 'complete' && 'text-emerald-500',
                    file.status === 'uploading' && 'text-muted-foreground'
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    {file.status === 'complete' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    {file.status === 'uploading' && (
                      <>
                        <span className="text-border">•</span>
                        <span>Uploading to IPFS...</span>
                      </>
                    )}
                    {file.status === 'complete' && file.ipfsHash && (
                      <>
                        <span className="text-border">•</span>
                        <span className="font-mono text-emerald-500">{file.ipfsHash.slice(0, 12)}...</span>
                      </>
                    )}
                    {file.status === 'error' && file.error && (
                      <>
                        <span className="text-border">•</span>
                        <span className="text-destructive">{file.error}</span>
                      </>
                    )}
                  </div>
                  {file.status === 'uploading' && (
                    <Progress value={file.progress} className="h-1 mt-2" />
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(file.id)
                  }}
                >
                  {file.status === 'uploading' ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
