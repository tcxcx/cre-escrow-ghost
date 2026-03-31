'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@bu/ui/avatar'
import { Button } from '@bu/ui/button'
import { Badge } from '@bu/ui/badge'
import { Textarea } from '@bu/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@bu/ui/dropdown-menu'
import {
  MessageSquare,
  Lightbulb,
  HelpCircle,
  Check,
  X,
  MoreHorizontal,
  Reply,
  Trash2,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@bu/ui/cn'
import type { ContractComment } from '@/types/collaboration'

interface CommentThreadProps {
  comment: ContractComment
  onResolve?: (commentId: string) => void
  onAcceptSuggestion?: (commentId: string) => void
  onRejectSuggestion?: (commentId: string) => void
  onReply?: (commentId: string, content: string) => void
  onDelete?: (commentId: string) => void
  onViewInContext?: (sectionId: string) => void
  currentUserId?: string
}

const typeConfig = {
  comment: { icon: MessageSquare, label: 'Comment', color: 'text-blue-500' },
  suggestion: { icon: Lightbulb, label: 'Suggestion', color: 'text-amber-500' },
  question: { icon: HelpCircle, label: 'Question', color: 'text-purple-500' },
}

const roleConfig: Record<string, { label: string; color: string }> = {
  owner: { label: 'Owner', color: 'bg-primary/10 text-primary' },
  admin: { label: 'Admin', color: 'bg-blue-500/10 text-blue-500' },
  legal_reviewer: { label: 'Legal', color: 'bg-emerald-500/10 text-emerald-500' },
  counterparty: { label: 'Counterparty', color: 'bg-amber-500/10 text-amber-500' },
  viewer: { label: 'Viewer', color: 'bg-muted text-muted-foreground' },
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function CommentThread({
  comment,
  onResolve,
  onAcceptSuggestion,
  onRejectSuggestion,
  onReply,
  onDelete,
  onViewInContext,
  currentUserId,
}: CommentThreadProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')

  const TypeIcon = typeConfig[comment.type].icon
  const isResolved = comment.status === 'resolved' || comment.status === 'accepted' || comment.status === 'rejected'
  const isOwner = currentUserId === comment.authorId

  const handleSubmitReply = () => {
    if (replyContent.trim() && onReply) {
      onReply(comment.id, replyContent.trim())
      setReplyContent('')
      setIsReplying(false)
    }
  }

  return (
    <div
      className={cn(
        'group rounded-lg border transition-colors',
        isResolved
          ? 'border-border/50 bg-muted/30 opacity-70'
          : 'border-border bg-card hover:border-primary/30'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <Avatar className="w-7 h-7">
            <AvatarImage src={comment.authorAvatar || "/placeholder.svg"} />
            <AvatarFallback className="text-xs">
              {comment.authorName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {comment.authorName}
              </span>
              <Badge variant="secondary" className={cn('text-xs h-5', roleConfig[comment.authorRole]?.color)}>
                {roleConfig[comment.authorRole]?.label}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(comment.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs', typeConfig[comment.type].color, 'bg-current/10')}>
            <TypeIcon className="w-3 h-3" />
            <span>{typeConfig[comment.type].label}</span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 bg-transparent">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewInContext && (
                <DropdownMenuItem onClick={() => onViewInContext(comment.sectionId)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View in Context
                </DropdownMenuItem>
              )}
              {!isResolved && onResolve && (
                <DropdownMenuItem onClick={() => onResolve(comment.id)}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Resolve
                </DropdownMenuItem>
              )}
              {isOwner && onDelete && (
                <DropdownMenuItem onClick={() => onDelete(comment.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Highlighted Text */}
      {comment.highlightedText && (
        <div className="mx-3 px-3 py-2 rounded bg-muted/50 border-l-2 border-primary/50">
          <p className="text-sm text-muted-foreground italic">"{comment.highlightedText}"</p>
        </div>
      )}

      {/* Content */}
      <div className="px-3 py-2">
        <p className="text-sm text-foreground">{comment.content}</p>
      </div>

      {/* Suggestion Card */}
      {comment.type === 'suggestion' && comment.suggestedText && !isResolved && (
        <div className="mx-3 mb-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Suggested Change</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-red-500 font-mono text-xs mt-1">-</span>
              <p className="text-muted-foreground line-through">{comment.highlightedText}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-mono text-xs mt-1">+</span>
              <p className="text-foreground">{comment.suggestedText}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 bg-transparent"
              onClick={() => onAcceptSuggestion?.(comment.id)}
            >
              <Check className="w-3 h-3 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-red-600 border-red-500/30 hover:bg-red-500/10 bg-transparent"
              onClick={() => onRejectSuggestion?.(comment.id)}
            >
              <X className="w-3 h-3 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      )}

      {/* Status Badge */}
      {isResolved && (
        <div className="mx-3 mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>
            {comment.status === 'accepted' ? 'Suggestion accepted' : 
             comment.status === 'rejected' ? 'Suggestion rejected' : 'Resolved'}
            {comment.resolvedBy && ` by ${comment.resolvedBy}`}
          </span>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mx-3 mb-3 pl-4 border-l-2 border-border space-y-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="pt-2">
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={reply.authorAvatar || "/placeholder.svg"} />
                  <AvatarFallback className="text-[10px]">
                    {reply.authorName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-foreground">{reply.authorName}</span>
                <span className="text-xs text-muted-foreground">{formatTimeAgo(reply.createdAt)}</span>
              </div>
              <p className="text-sm text-foreground ml-7">{reply.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply Input */}
      {!isResolved && (
        <div className="px-3 pb-3">
          {isReplying ? (
            <div className="space-y-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[60px] text-sm resize-none"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 bg-transparent"
                  onClick={() => {
                    setIsReplying(false)
                    setReplyContent('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7"
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim()}
                >
                  Reply
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground bg-transparent"
              onClick={() => setIsReplying(true)}
            >
              <Reply className="w-3 h-3 mr-1" />
              Reply
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
