'use client'

import React from 'react'
import { MessageSquare } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface SubmissionNotesProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  disabled?: boolean
  className?: string
}

export function SubmissionNotes({
  value,
  onChange,
  placeholder = 'Add any notes or context for the reviewer...',
  maxLength = 2000,
  disabled = false,
  className,
}: SubmissionNotesProps) {
  const charCount = value.length
  const isNearLimit = charCount > maxLength * 0.9

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          Submission Notes
        </Label>
        <span className={cn(
          'text-xs',
          isNearLimit ? 'text-amber-500' : 'text-muted-foreground'
        )}>
          {charCount}/{maxLength}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        disabled={disabled}
        rows={4}
        className="resize-none"
      />
      <p className="text-xs text-muted-foreground">
        Include any relevant context, explanations, or instructions for the reviewer.
      </p>
    </div>
  )
}
