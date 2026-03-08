'use client'

import { useState, useCallback } from 'react'
import { Button } from '@bu/ui/button'
import { Textarea } from '@bu/ui/textarea'
import { ScrollArea } from '@bu/ui/scroll-area'
import { Separator } from '@bu/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@bu/ui/sheet'
import {
  X,
  Sparkles,
  Loader2,
  Send,
  Lightbulb,
  FileText,
  Target,
  Shield,
  Scale,
  Zap,
} from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { useContractStore } from '@/lib/contract-store'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const suggestions = [
  {
    icon: FileText,
    title: 'Generate NDA Clause',
    prompt: 'Generate a standard non-disclosure agreement clause for this contract',
  },
  {
    icon: Target,
    title: 'Define Milestones',
    prompt: 'Help me define clear milestones with measurable deliverables',
  },
  {
    icon: Shield,
    title: 'Add Protection Clause',
    prompt: 'Add a liability limitation and indemnification clause',
  },
  {
    icon: Scale,
    title: 'Dispute Resolution',
    prompt: 'Generate a dispute resolution and arbitration clause',
  },
  {
    icon: Zap,
    title: 'Payment Terms',
    prompt: 'Create clear payment terms with late payment penalties',
  },
]

export function AiAssistPanel() {
  const {
    isAiAssistOpen,
    setAiAssistOpen,
    contractName,
    nodes,
    updateNodeData,
    addNode,
  } = useContractStore()
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm your AI contract assistant. I can help you:\n\n• Generate legal clauses in plain English\n• Define verification criteria for milestones\n• Suggest contract improvements\n• Create dispute resolution terms\n\nHow can I help with your contract today?`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate AI response - in production this would call an API
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Generate contextual response based on input
    let response = ''
    const lowerInput = input.toLowerCase()

    if (lowerInput.includes('nda') || lowerInput.includes('confidential')) {
      response = `Here's a standard NDA clause for your contract:\n\n**CONFIDENTIALITY**\n\nBoth parties agree to maintain strict confidentiality regarding all proprietary information, trade secrets, and business processes disclosed during the course of this agreement.\n\n• Confidential information shall not be disclosed to third parties without written consent\n• This obligation survives termination of the contract for a period of 2 years\n• Exceptions include information that becomes publicly available through no fault of the receiving party\n\nWould you like me to add this as a clause to your contract?`
    } else if (lowerInput.includes('milestone') || lowerInput.includes('deliverable')) {
      response = `Based on your contract structure, here are suggested milestone improvements:\n\n**Milestone Best Practices:**\n\n1. **Clear Deliverables**: Each milestone should have specific, measurable outputs\n2. **Verification Criteria**: Define exactly how completion is verified\n3. **Timeframes**: Include reasonable deadlines with buffer time\n4. **Payment Triggers**: Link payments to verified milestone completion\n\n**Suggested Verification Criteria:**\n• Written approval via email from designated reviewer\n• Checklist of deliverables signed off\n• Automated testing passing (for technical deliverables)\n\nShall I update your existing milestones with better verification criteria?`
    } else if (lowerInput.includes('payment') || lowerInput.includes('late')) {
      response = `Here's a payment terms clause with late payment provisions:\n\n**PAYMENT TERMS**\n\nAll payments shall be released within 7 business days of milestone verification.\n\n**Late Payment:**\n• Payments not released within 14 days incur 1.5% monthly interest\n• After 30 days, the payee may suspend work until payment is received\n• Chronic late payments (3+ instances) constitute breach of contract\n\n**Early Payment Incentive:**\n• 2% discount for payments released within 48 hours of verification\n\nWant me to add these terms to your contract?`
    } else if (lowerInput.includes('dispute') || lowerInput.includes('arbitration')) {
      response = `Here's a dispute resolution clause:\n\n**DISPUTE RESOLUTION**\n\n1. **Good Faith Negotiation**: Parties shall first attempt to resolve disputes through direct negotiation within 14 days\n\n2. **Mediation**: If negotiation fails, disputes shall be submitted to a mutually agreed mediator\n\n3. **Arbitration**: Binding arbitration through JAMS under their Streamlined Rules\n   • Arbitration held in [Location]\n   • Decision binding and enforceable in court\n   • Each party bears own legal costs unless otherwise determined\n\n4. **Escrow Freeze**: Disputed funds remain in escrow until resolution\n\nShould I add this to your contract?`
    } else {
      response = `I understand you're working on "${contractName}". Here's what I can help with:\n\n**Contract Analysis:**\nYour contract currently has ${nodes.length} nodes including ${nodes.filter(n => n.type === 'milestone').length} milestones and ${nodes.filter(n => n.type === 'clause').length} clauses.\n\n**Recommendations:**\n• ${nodes.filter(n => n.type === 'clause').length === 0 ? 'Consider adding standard clauses (NDA, liability, termination)' : 'Your clauses look good!'}\n• ${nodes.filter(n => n.type === 'signature').length < 2 ? 'Both parties should have signature nodes' : 'Signature requirements are set'}\n\nWhat specific aspect would you like help with?`
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, assistantMessage])
    setIsLoading(false)
  }, [input, isLoading, contractName, nodes])

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt)
  }

  return (
    <Sheet open={isAiAssistOpen} onOpenChange={setAiAssistOpen}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 bg-card border-border">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-purple-500/10 to-blue-500/10">
            <SheetHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <SheetTitle className="text-lg font-semibold">AI Contract Assistant</SheetTitle>
              </div>
              <SheetDescription className="text-sm text-muted-foreground">
                Generate clauses and get contract guidance
              </SheetDescription>
            </SheetHeader>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 bg-transparent"
              onClick={() => setAiAssistOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' && 'flex-row-reverse'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 shrink-0">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg p-3',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/50'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    <p className="text-xs opacity-50 mt-2">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 shrink-0">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggestions */}
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Suggestions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 3).map((suggestion) => (
                <button
                  type="button"
                  key={suggestion.title}
                  onClick={() => handleSuggestionClick(suggestion.prompt)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary text-xs text-foreground transition-colors"
                >
                  <suggestion.icon className="w-3 h-3" />
                  {suggestion.title}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Ask anything about your contract..."
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              AI suggestions are for guidance only. Review all clauses before deploying.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
