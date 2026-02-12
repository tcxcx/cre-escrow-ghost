'use client'

import React from "react"

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { MessageSquare, Lightbulb, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CommentType } from '@/types/collaboration'

interface TextSelectionPopoverProps {
  children: React.ReactNode
  sectionId: string
  onAddComment: (data: {
    sectionId: string
    type: CommentType
    content: string
    highlightedText: string
    suggestedText?: string
    startOffset?: number
    endOffset?: number
  }) => void
}

export function TextSelectionPopover({
  children,
  sectionId,
  onAddComment,
}: TextSelectionPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null)
  const [activeType, setActiveType] = useState<CommentType | null>(null)
  const [content, setContent] = useState('')
  const [suggestedText, setSuggestedText] = useState('')
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      return
    }

    const text = selection.toString().trim()
    if (!text) return

    // Get selection range
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()

    if (containerRect) {
      setPosition({
        top: rect.top - containerRect.top - 40,
        left: rect.left - containerRect.left + rect.width / 2,
      })
    }

    setSelectedText(text)
    setSelectionRange({
      start: range.startOffset,
      end: range.endOffset,
    })
    setIsOpen(true)
  }, [])

  const handleSelectType = (type: CommentType) => {
    setActiveType(type)
    if (type === 'suggestion') {
      setSuggestedText(selectedText) // Pre-fill with selected text
    }
  }

  const handleSubmit = () => {
    if (!activeType || !content.trim()) return

    onAddComment({
      sectionId,
      type: activeType,
      content: content.trim(),
      highlightedText: selectedText,
      suggestedText: activeType === 'suggestion' ? suggestedText : undefined,
      startOffset: selectionRange?.start,
      endOffset: selectionRange?.end,
    })

    // Reset
    setIsOpen(false)
    setActiveType(null)
    setContent('')
    setSuggestedText('')
    setSelectedText('')
    setSelectionRange(null)
    window.getSelection()?.removeAllRanges()
  }

  const handleClose = () => {
    setIsOpen(false)
    setActiveType(null)
    setContent('')
    setSuggestedText('')
  }

  useEffect(() => {
    // Close when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative" onMouseUp={handleMouseUp}>
      {children}

      {isOpen && (
        <div
          className="absolute z-50"
          style={{
            top: position.top,
            left: position.left,
            transform: 'translateX(-50%)',
          }}
        >
          {!activeType ? (
            // Type Selection
            <div className="flex items-center gap-1 p-1.5 rounded-lg bg-popover border border-border shadow-lg">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 bg-transparent"
                onClick={() => handleSelectType('comment')}
              >
                <MessageSquare className="w-4 h-4 mr-1.5" />
                Comment
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 bg-transparent"
                onClick={() => handleSelectType('suggestion')}
              >
                <Lightbulb className="w-4 h-4 mr-1.5" />
                Suggest
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-purple-500 hover:text-purple-600 hover:bg-purple-500/10 bg-transparent"
                onClick={() => handleSelectType('question')}
              >
                <HelpCircle className="w-4 h-4 mr-1.5" />
                Question
              </Button>
            </div>
          ) : (
            // Comment Form
            <div className="w-80 p-4 rounded-lg bg-popover border border-border shadow-lg space-y-3">
              <div className="flex items-center gap-2">
                {activeType === 'comment' && <MessageSquare className="w-4 h-4 text-blue-500" />}
                {activeType === 'suggestion' && <Lightbulb className="w-4 h-4 text-amber-500" />}
                {activeType === 'question' && <HelpCircle className="w-4 h-4 text-purple-500" />}
                <span className="text-sm font-medium text-foreground capitalize">
                  {activeType}
                </span>
              </div>

              <div className="px-3 py-2 rounded bg-muted/50 border-l-2 border-primary/50">
                <p className="text-xs text-muted-foreground italic">"{selectedText}"</p>
              </div>

              {activeType === 'suggestion' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Suggested replacement</Label>
                  <Textarea
                    value={suggestedText}
                    onChange={(e) => setSuggestedText(e.target.value)}
                    placeholder="Enter your suggested text..."
                    className="min-h-[60px] text-sm resize-none"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">
                  {activeType === 'question' ? 'Your question' : 'Your comment'}
                </Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    activeType === 'question'
                      ? 'What would you like to know?'
                      : 'Add your thoughts...'
                  }
                  className="min-h-[60px] text-sm resize-none"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleClose} className="bg-transparent">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={!content.trim()}>
                  Add {activeType}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
