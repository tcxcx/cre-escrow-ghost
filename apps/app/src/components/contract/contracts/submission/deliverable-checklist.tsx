'use client'

import React from 'react'
import { CheckCircle2, Circle, AlertCircle, FileText, ImageIcon, Code, File } from 'lucide-react'
import { cn } from '@bu/ui/cn'

export interface DeliverableItem {
  id: string
  label: string
  description?: string
  type: 'file' | 'image' | 'code' | 'document' | 'other'
  required: boolean
  completed: boolean
}

interface DeliverableChecklistProps {
  items: DeliverableItem[]
  onToggle?: (itemId: string) => void
  readOnly?: boolean
  className?: string
}

const typeIcons: Record<DeliverableItem['type'], React.ElementType> = {
  file: File,
  image: ImageIcon,
  code: Code,
  document: FileText,
  other: File,
}

export function DeliverableChecklist({
  items,
  onToggle,
  readOnly = false,
  className,
}: DeliverableChecklistProps) {
  const completedCount = items.filter(item => item.completed).length
  const requiredCount = items.filter(item => item.required).length
  const requiredCompleted = items.filter(item => item.required && item.completed).length
  const allRequiredComplete = requiredCompleted === requiredCount

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress Summary */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          {allRequiredComplete ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-500" />
          )}
          <span className="text-sm font-medium text-foreground">
            {allRequiredComplete ? 'All required items complete' : `${requiredCompleted}/${requiredCount} required items`}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{items.length} total
        </span>
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {items.map((item) => {
          const TypeIcon = typeIcons[item.type]
          return (
            <div
              key={item.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                item.completed ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-card border-border',
                !readOnly && 'cursor-pointer hover:bg-muted/50'
              )}
              onClick={() => !readOnly && onToggle?.(item.id)}
              onKeyDown={(e) => {
                if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
                  onToggle?.(item.id)
                }
              }}
              role={readOnly ? undefined : 'checkbox'}
              aria-checked={item.completed}
              tabIndex={readOnly ? undefined : 0}
            >
              <div className="pt-0.5">
                {item.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-medium',
                    item.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                  )}>
                    {item.label}
                  </span>
                  {item.required && (
                    <span className="text-xs text-destructive font-medium">Required</span>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                )}
              </div>

              <div className={cn(
                'p-1.5 rounded-md',
                item.completed ? 'bg-emerald-500/10' : 'bg-muted'
              )}>
                <TypeIcon className={cn(
                  'w-4 h-4',
                  item.completed ? 'text-emerald-500' : 'text-muted-foreground'
                )} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
