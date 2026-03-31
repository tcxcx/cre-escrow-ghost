'use client'

import { useState, useMemo } from 'react'
import { Button } from '@bu/ui/button'
import { Badge } from '@bu/ui/badge'
import { Input } from '@bu/ui/input'
import { ScrollArea } from '@bu/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@bu/ui/select'
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  X,
  Plus,
} from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { CommentThread } from './comment-thread'
import type { ContractComment, CommentStatus } from '@/types/collaboration'

interface CommentSidebarProps {
  comments: ContractComment[]
  isOpen: boolean
  onClose: () => void
  onResolve?: (commentId: string) => void
  onAcceptSuggestion?: (commentId: string) => void
  onRejectSuggestion?: (commentId: string) => void
  onReply?: (commentId: string, content: string) => void
  onDelete?: (commentId: string) => void
  onViewInContext?: (sectionId: string) => void
  onAddComment?: () => void
  currentUserId?: string
}

type FilterOption = 'all' | 'open' | 'resolved' | 'suggestions'

export function CommentSidebar({
  comments,
  isOpen,
  onClose,
  onResolve,
  onAcceptSuggestion,
  onRejectSuggestion,
  onReply,
  onDelete,
  onViewInContext,
  onAddComment,
  currentUserId,
}: CommentSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterOption>('all')
  const [authorFilter, setAuthorFilter] = useState<string>('all')

  // Get unique authors
  const authors = useMemo(() => {
    const uniqueAuthors = new Map<string, { id: string; name: string }>()
    comments.forEach((c) => {
      if (!uniqueAuthors.has(c.authorId)) {
        uniqueAuthors.set(c.authorId, { id: c.authorId, name: c.authorName })
      }
    })
    return Array.from(uniqueAuthors.values())
  }, [comments])

  // Filter comments
  const filteredComments = useMemo(() => {
    return comments.filter((comment) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesContent = comment.content.toLowerCase().includes(query)
        const matchesAuthor = comment.authorName.toLowerCase().includes(query)
        const matchesHighlight = comment.highlightedText?.toLowerCase().includes(query)
        if (!matchesContent && !matchesAuthor && !matchesHighlight) return false
      }

      // Status filter
      if (filter === 'open' && (comment.status === 'resolved' || comment.status === 'accepted' || comment.status === 'rejected')) {
        return false
      }
      if (filter === 'resolved' && comment.status === 'open') {
        return false
      }
      if (filter === 'suggestions' && comment.type !== 'suggestion') {
        return false
      }

      // Author filter
      if (authorFilter !== 'all' && comment.authorId !== authorFilter) {
        return false
      }

      return true
    })
  }, [comments, searchQuery, filter, authorFilter])

  // Stats
  const openCount = comments.filter((c) => c.status === 'open').length
  const resolvedCount = comments.filter((c) => c.status !== 'open').length
  const suggestionCount = comments.filter((c) => c.type === 'suggestion' && c.status === 'open').length

  if (!isOpen) return null

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Comments</span>
          {openCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {openCount} open
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 bg-transparent" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-muted/30 text-xs">
        <div className="flex items-center gap-1.5">
          <Circle className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span className="text-muted-foreground">{openCount} Open</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span className="text-muted-foreground">{resolvedCount} Resolved</span>
        </div>
        {suggestionCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
            <span className="text-muted-foreground">{suggestionCount} Suggestions</span>
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="p-3 space-y-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search comments..."
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterOption)}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Comments</SelectItem>
              <SelectItem value="open">Open Only</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="suggestions">Suggestions</SelectItem>
            </SelectContent>
          </Select>
          <Select value={authorFilter} onValueChange={setAuthorFilter}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="By author" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Authors</SelectItem>
              {authors.map((author) => (
                <SelectItem key={author.id} value={author.id}>
                  {author.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comments List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {filteredComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {comments.length === 0
                  ? 'No comments yet'
                  : 'No comments match your filters'}
              </p>
              {onAddComment && comments.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 bg-transparent"
                  onClick={onAddComment}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Comment
                </Button>
              )}
            </div>
          ) : (
            filteredComments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                onResolve={onResolve}
                onAcceptSuggestion={onAcceptSuggestion}
                onRejectSuggestion={onRejectSuggestion}
                onReply={onReply}
                onDelete={onDelete}
                onViewInContext={onViewInContext}
                currentUserId={currentUserId}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Add Comment Button */}
      {onAddComment && (
        <div className="p-3 border-t border-border">
          <Button className="w-full" onClick={onAddComment}>
            <Plus className="w-4 h-4 mr-2" />
            Add Comment
          </Button>
        </div>
      )}
    </div>
  )
}
