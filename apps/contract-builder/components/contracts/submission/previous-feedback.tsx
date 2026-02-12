'use client'

import React from 'react'
import { AlertTriangle, Clock, MessageSquare, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface FeedbackItem {
  id: string
  attempt: number
  timestamp: string
  reviewer: string
  verdict: 'rejected' | 'needs_revision'
  summary: string
  issues: string[]
}

interface PreviousFeedbackProps {
  feedback: FeedbackItem[]
  className?: string
}

export function PreviousFeedback({ feedback, className }: PreviousFeedbackProps) {
  if (feedback.length === 0) return null

  const latestFeedback = feedback[0]

  return (
    <Card className={cn('border-amber-500/50 bg-amber-500/5', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            Previous Submission Feedback
          </CardTitle>
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
            Attempt {latestFeedback.attempt}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Latest Feedback Summary */}
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {latestFeedback.reviewer}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {latestFeedback.timestamp}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-background border border-amber-500/30">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">{latestFeedback.summary}</p>
            </div>
          </div>

          {latestFeedback.issues.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Issues to Address</p>
              <ul className="space-y-1.5">
                {latestFeedback.issues.map((issue, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{index + 1}</span>
                    </span>
                    <span className="text-muted-foreground">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Previous attempts accordion - if more than one */}
        {feedback.length > 1 && (
          <div className="pt-3 border-t border-amber-500/20">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                <span>View {feedback.length - 1} previous attempt{feedback.length > 2 ? 's' : ''}</span>
                <span className="group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-3 space-y-3">
                {feedback.slice(1).map((item) => (
                  <div key={item.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">Attempt {item.attempt}</Badge>
                      <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.summary}</p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
