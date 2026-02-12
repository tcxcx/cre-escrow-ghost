'use client'

import React, { useState } from 'react'
import { Send, Loader2, Sparkles, Users, CheckCircle2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useBatchStore } from '@/lib/batch-store'
import type { BatchRecipient } from '@/types/batch'
import { toast } from 'sonner'

const EXAMPLE_PROMPTS = [
  'Send $5,000 USDC to alice@example.com (Alice Johnson, grantee) and $3,000 to bob@example.com (Bob Smith, vendor) for Phase 1 delivery.',
  'Create contracts for our Q2 grant cohort: Jane Doe (jane@dao.org) $10,000, Marcus Lee (marcus@dev.io) $7,500, Sara Kim (sara@research.co) $12,000. All in USDC, milestone is "Research Completion".',
  'I need to send payments to three freelancers: a designer ($4,000), a developer ($6,000), and a project manager ($3,500). Their emails are design@studio.co, dev@code.io, pm@manage.co.',
]

export function AiChatInput() {
  const { setRecipients, setStep } = useBatchStore()
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedRecipients, setParsedRecipients] = useState<BatchRecipient[] | null>(null)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return

    const userText = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: userText }])
    setIsProcessing(true)

    try {
      const res = await fetch('/api/v1/batch/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userText }),
      })

      if (!res.ok) throw new Error('Failed to parse')

      const data = await res.json()
      const recipients: BatchRecipient[] = (data.recipients || []).map(
        (r: Record<string, unknown>, i: number) => ({
          id: `ai-${Date.now()}-${i}`,
          name: (r.name as string) || '',
          email: (r.email as string) || '',
          walletAddress: (r.walletAddress as string) || undefined,
          role: (r.role as string) || undefined,
          amount: (r.amount as number) || 0,
          currency: (r.currency as string) || 'USDC',
          milestoneTitle: (r.milestoneTitle as string) || undefined,
          milestoneDescription: (r.milestoneDescription as string) || undefined,
          notes: (r.notes as string) || undefined,
          status: 'pending' as const,
        })
      )

      setParsedRecipients(recipients)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `I found ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''} in your message. Here's what I extracted:`,
        },
      ])

      toast.success(`Extracted ${recipients.length} recipients`)
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Sorry, I had trouble parsing that. Could you try rephrasing with names, emails, and amounts?',
        },
      ])
      toast.error('Failed to parse recipients')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirm = () => {
    if (!parsedRecipients?.length) return
    setRecipients(parsedRecipients)
    setStep('review')
  }

  const handleReset = () => {
    setParsedRecipients(null)
    setMessages([])
    setInput('')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
        <Sparkles className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h3 className="font-medium text-foreground text-sm">AI Recipient Parser</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Describe your recipients in natural language. Include names, emails, amounts,
            and any roles or milestones. The AI will structure them for you.
          </p>
        </div>
      </div>

      {/* Chat messages */}
      {messages.length > 0 && (
        <div className="space-y-3 max-h-[240px] overflow-y-auto">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm',
                  msg.role === 'user'
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-foreground'
                )}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-xl px-3.5 py-2.5 text-sm flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Analyzing your message...
              </div>
            </div>
          )}
        </div>
      )}

      {/* Parsed recipients preview */}
      {parsedRecipients && parsedRecipients.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="w-4 h-4" />
              <span>Extracted Recipients ({parsedRecipients.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs bg-transparent"
                onClick={handleReset}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>
          </div>
          <div className="divide-y divide-border max-h-[200px] overflow-y-auto">
            {parsedRecipients.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="text-foreground font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {r.role && (
                    <Badge variant="outline" className="text-xs">{r.role}</Badge>
                  )}
                  <span className="text-foreground font-medium">
                    {r.amount.toLocaleString()} {r.currency}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <Button onClick={handleConfirm} className="w-full gap-2" size="sm">
              <CheckCircle2 className="w-4 h-4" />
              Confirm {parsedRecipients.length} Recipients & Continue
            </Button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="space-y-3">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Describe your recipients... e.g., Send $5,000 to alice@example.com (Alice Johnson, grantee)"
            className="w-full min-h-[100px] rounded-xl border border-border bg-card px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            disabled={isProcessing}
          />
          <Button
            size="sm"
            className="absolute bottom-3 right-3 gap-1.5"
            onClick={handleSubmit}
            disabled={!input.trim() || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Parse
          </Button>
        </div>

        {/* Example prompts */}
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Try an example:</p>
            <div className="flex flex-col gap-1.5">
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="text-left text-xs text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted/50 transition-colors line-clamp-2"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
