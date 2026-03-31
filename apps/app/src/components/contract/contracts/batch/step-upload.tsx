'use client'

import React, { useState, useCallback } from 'react'
import { FileDropzone, type UploadedFile } from '@/components/contract/shared/file-dropzone'
import { useBatchStore, parseCsvText, downloadCsvTemplate, autoMapColumns } from '@/lib/batch-store'
import { toast } from 'sonner'

export function StepUpload() {
  const { file, setFile, setParsedCsv, setMappings, setStep } = useBatchStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStartTime, setUploadStartTime] = useState<string | null>(null)

  const handleFileAccepted = useCallback(
    async ({ file: selectedFile }: UploadedFile) => {
      setFile(selectedFile)
      setIsProcessing(true)
      setUploadStartTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      )

      // Simulate upload progress
      for (let p = 0; p <= 100; p += 15) {
        setUploadProgress(Math.min(p, 100))
        await new Promise((r) => setTimeout(r, 120))
      }
      setUploadProgress(100)

      try {
        const text = await selectedFile.text()
        const csv = parseCsvText(text, selectedFile.name, selectedFile.size)
        setParsedCsv(csv)

        // Auto-map columns locally
        const autoMappings = autoMapColumns(csv.columns)
        setMappings(autoMappings)

        // Try AI-enhanced mapping
        try {
          const res = await fetch('/api/v1/batch/map', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              columns: csv.columns.map((c) => ({
                name: c.name,
                sampleValues: c.sampleValues,
              })),
            }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.mappings?.length) {
              setMappings(
                data.mappings.map(
                  (m: { csvColumn: string; bufiField: string; confidence: number }) => ({
                    ...m,
                    isAutoMapped: true,
                  })
                )
              )
            }
          }
        } catch {
          // AI mapping failed, keep local auto-mapping
        }

        toast.success(`Parsed ${csv.totalRows} recipients from ${selectedFile.name}`)
        setIsProcessing(false)
        setStep('mapping')
      } catch {
        toast.error('Failed to parse CSV file')
        setIsProcessing(false)
        setFile(null)
      }
    },
    [setFile, setParsedCsv, setMappings, setStep]
  )

  return (
    <FileDropzone
      accept={['.csv']}
      onFileAccepted={handleFileAccepted}
      isProcessing={isProcessing}
      progress={uploadProgress}
      currentFile={file}
      uploadStartTime={uploadStartTime}
      onClear={() => {
        setFile(null)
        setIsProcessing(false)
        setUploadProgress(0)
      }}
      templateDownload={{
        label: 'CSV Template',
        description:
          'Download the attached example and use it as a starting point for your own file.',
        onDownload: () => {
          downloadCsvTemplate()
          toast.success('Template downloaded')
        },
      }}
    />
  )
}
