'use client'

import React from "react"

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  FileText,
  Plus,
  Search,
  Inbox,
  Target,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  children?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-6">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2 text-center">{title}</h3>
      <p className="text-muted-foreground text-center max-w-sm mb-6">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button onClick={action.onClick} className="gap-2">
              <Plus className="h-4 w-4" />
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

// Pre-built empty states for common scenarios

interface ContractsEmptyStateProps {
  onCreateContract: () => void
}

export function ContractsEmptyState({ onCreateContract }: ContractsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-muted mb-6">
        <FileText className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No contracts yet</h3>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Create your first AI-powered escrow contract with automatic milestone verification.
      </p>
      
      <Button onClick={onCreateContract} size="lg" className="gap-2 mb-8">
        <Plus className="h-5 w-5" />
        Create Your First Contract
      </Button>

      {/* Quick Start Guide */}
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-medium">Quick Start</h4>
          </div>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium shrink-0">1</span>
              Choose from 8 contract templates
            </li>
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium shrink-0">2</span>
              Define milestones with AI verification criteria
            </li>
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium shrink-0">3</span>
              Send to counterparty for signature
            </li>
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium shrink-0">4</span>
              Fund escrow and start work
            </li>
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium shrink-0">5</span>
              AI verifies deliverables, payments release automatically
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

interface SearchEmptyStateProps {
  searchQuery: string
  onClearSearch: () => void
}

export function SearchEmptyState({ searchQuery, onClearSearch }: SearchEmptyStateProps) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`We couldn't find any contracts matching "${searchQuery}". Try adjusting your search or filters.`}
      action={{
        label: 'Clear Search',
        onClick: onClearSearch,
      }}
    />
  )
}

interface MilestonesEmptyStateProps {
  onAddMilestone: () => void
}

export function MilestonesEmptyState({ onAddMilestone }: MilestonesEmptyStateProps) {
  return (
    <EmptyState
      icon={Target}
      title="No milestones yet"
      description="Add milestones to break down your project into verifiable deliverables with automatic payments."
      action={{
        label: 'Add Milestone',
        onClick: onAddMilestone,
      }}
    />
  )
}

interface InboxEmptyStateProps {
  type: 'received' | 'pending'
}

export function InboxEmptyState({ type }: InboxEmptyStateProps) {
  return (
    <EmptyState
      icon={Inbox}
      title={type === 'received' ? 'No contracts received' : 'No pending contracts'}
      description={
        type === 'received'
          ? "You haven't received any contract invitations yet."
          : "You don't have any contracts waiting for signatures."
      }
    />
  )
}

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({ 
  title = 'Something went wrong', 
  description = 'We encountered an error loading this content. Please try again.',
  onRetry 
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={onRetry ? {
        label: 'Try Again',
        onClick: onRetry,
      } : undefined}
    />
  )
}
