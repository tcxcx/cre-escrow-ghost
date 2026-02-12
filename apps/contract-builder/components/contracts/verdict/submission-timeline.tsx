'use client'

import React from 'react'
import {
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface SubmissionEntry {
  id: string
  attempt: number
  submittedAt: string
  status: 'approved' | 'rejected' | 'pending'
  filesCount: number
  confidenceScore?: number
  feedback?: string
  issues?: string[]
}

interface SubmissionTimelineProps {
  entries: SubmissionEntry[]
  maxAttempts: number
  className?: string
}

export function SubmissionTimeline({
  entries,
  maxAttempts,
  className,
}: SubmissionTimelineProps) {
  const [expandedEntry, setExpandedEntry] = React.useState<string | null>(
    entries[0]?.id || null
  )

  const toggleEntry = (id: string) => {
    setExpandedEntry(expandedEntry === id ? null : id)
  }

  const statusConfig = {
    approved: {
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500',
      label: 'Approved',
    },
    rejected: {
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive',
      label: 'Rejected',
    },
    pending: {
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500',
      label: 'In Review',
    },
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Submission History
          </CardTitle>
          <Badge variant="secondary">
            {entries.length}/{maxAttempts} attempts
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

          {/* Timeline Entries */}
          <div className="space-y-4">
            {entries.map((entry, index) => {
              const config = statusConfig[entry.status]
              const StatusIcon = config.icon
              const isExpanded = expandedEntry === entry.id
              const isLatest = index === 0

              return (
                <div key={entry.id} className="relative pl-12">
                  {/* Timeline Dot */}
                  <div className={cn(
                    'absolute left-3 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-background',
                    config.borderColor
                  )}>
                    <div className={cn('w-2 h-2 rounded-full', config.bgColor.replace('/10', ''))} />
                  </div>

                  {/* Entry Card */}
                  <div className={cn(
                    'border rounded-lg transition-colors',
                    isLatest && 'ring-1 ring-primary/20'
                  )}>
                    {/* Header */}
                    <button
                      type="button"
                      onClick={() => toggleEntry(entry.id)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('p-1.5 rounded-md', config.bgColor)}>
                          <StatusIcon className={cn('w-4 h-4', config.color)} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              Attempt {entry.attempt}
                            </span>
                            {isLatest && (
                              <Badge variant="secondary" className="text-xs">Latest</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{entry.submittedAt}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={cn('text-xs', config.bgColor, config.color, 'border-none')}>
                          {config.label}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border mt-0">
                        <div className="pt-3 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Files Submitted</p>
                            <div className="flex items-center gap-1.5">
                              <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-medium">{entry.filesCount} file{entry.filesCount !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          {entry.confidenceScore !== undefined && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">AI Confidence</p>
                              <span className={cn(
                                'font-medium',
                                entry.confidenceScore >= 80 ? 'text-emerald-500' :
                                entry.confidenceScore >= 60 ? 'text-amber-500' : 'text-destructive'
                              )}>
                                {entry.confidenceScore}%
                              </span>
                            </div>
                          )}
                        </div>

                        {entry.feedback && (
                          <div className="p-2.5 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground mb-1">Feedback</p>
                            <p className="text-sm text-foreground">{entry.feedback}</p>
                          </div>
                        )}

                        {entry.issues && entry.issues.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Issues Found</p>
                            <ul className="space-y-1">
                              {entry.issues.map((issue, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
