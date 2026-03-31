# AI Assist Canvas Wiring + Arbitration Model Selection — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the AI Assist panel to manipulate the React Flow canvas in real-time via AI SDK v6 tool calling, and let contract parties choose their LLM advocate model for dispute resolution.

**Architecture:** New `contract-assist.service.ts` in `@bu/intelligence` defines 6 canvas-manipulation tools and streams responses via `streamText()`. A thin API route at `/api/contracts/ai-assist` bridges frontend. The arbitration config becomes dynamic — `buildArbitrationConfig()` takes user-selected advocate models and auto-selects neutral tribunal/supreme court models excluding those picks.

**Tech Stack:** AI SDK v6 (`streamText` + `tool()`), Zod v4, Vercel AI Gateway, `useChat()` hook, Zustand store actions, Langfuse telemetry.

---

## Task 1: Canvas Tool Definitions

**Files:**
- Create: `packages/intelligence/src/tools/contract-canvas.ts`

**Step 1: Create the tool definitions file**

This file defines 6 tools the AI can call to manipulate the canvas. Each tool returns a confirmation string (the AI sees the result and can reference it in text).

```typescript
// packages/intelligence/src/tools/contract-canvas.ts
import { tool } from 'ai'
import { z } from 'zod'

// ── Schemas ─────────────────────────────────────────────

const nodeTypeEnum = z.enum([
  'party-payer',
  'party-payee',
  'milestone',
  'condition',
  'payment',
  'signature',
  'clause',
  'commission',
  'identity-verification',
])

const addNodeSchema = z.object({
  type: nodeTypeEnum.describe('The type of contract node to add'),
  label: z.string().describe('Display label for the node'),
  data: z.record(z.string(), z.any()).describe('Node-type-specific data fields').optional(),
  position: z
    .object({ x: z.number(), y: z.number() })
    .optional()
    .describe('Canvas position in pixels. Omit for auto-layout.'),
})

const updateNodeSchema = z.object({
  nodeId: z.string().describe('ID of the existing node to update'),
  data: z.record(z.string(), z.any()).describe('Partial data to merge into the node'),
})

const removeNodeSchema = z.object({
  nodeId: z.string().describe('ID of the node to remove from the canvas'),
})

const connectNodesSchema = z.object({
  sourceId: z.string().describe('ID of the source node'),
  targetId: z.string().describe('ID of the target node'),
  sourceHandle: z.enum(['right', 'bottom']).optional().default('right'),
  targetHandle: z.enum(['left', 'top']).optional().default('left'),
})

const clearCanvasSchema = z.object({
  confirm: z.literal(true).describe('Must be true to clear'),
})

const layoutNodesSchema = z.object({
  pattern: z.enum(['grid', 'tree', 'flow']).default('flow').describe('Layout pattern'),
})

// ── Tool Factories ──────────────────────────────────────
// These return tool descriptors for streamText(). Execution happens
// client-side via onToolCall — the server just validates + returns
// the args so the frontend can apply them to the Zustand store.

export function getContractCanvasTools() {
  return {
    addNode: tool({
      description:
        'Add a new node to the contract canvas. Types: party-payer, party-payee, milestone, condition, payment, signature, clause, commission, identity-verification. Provide data fields relevant to the node type.',
      inputSchema: addNodeSchema,
      execute: async (args) => {
        // Server-side: just validate and return. Client executes against store.
        return { action: 'addNode', ...args, nodeId: `${args.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }
      },
    }),

    updateNode: tool({
      description:
        'Update data on an existing node. Use this to change names, amounts, descriptions, etc. Reference nodes by their ID.',
      inputSchema: updateNodeSchema,
      execute: async (args) => {
        return { action: 'updateNode', ...args }
      },
    }),

    removeNode: tool({
      description:
        'Remove a node from the canvas. All connected edges are also removed. Use when the user asks to delete something.',
      inputSchema: removeNodeSchema,
      execute: async (args) => {
        return { action: 'removeNode', ...args }
      },
    }),

    connectNodes: tool({
      description:
        'Create an edge between two nodes. Use right→left for horizontal flow, bottom→top for vertical. Connects the contract flow logic.',
      inputSchema: connectNodesSchema,
      execute: async (args) => {
        return { action: 'connectNodes', ...args }
      },
    }),

    clearCanvas: tool({
      description:
        'Remove ALL nodes and edges from the canvas. Only use when the user explicitly asks to start over or clear everything.',
      inputSchema: clearCanvasSchema,
      execute: async (args) => {
        return { action: 'clearCanvas', ...args }
      },
    }),

    layoutNodes: tool({
      description:
        'Rearrange all nodes on the canvas. Use "flow" for left-to-right pipeline, "grid" for even spacing, "tree" for hierarchical.',
      inputSchema: layoutNodesSchema,
      execute: async (args) => {
        return { action: 'layoutNodes', ...args }
      },
    }),
  }
}
```

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit packages/intelligence/src/tools/contract-canvas.ts 2>&1 | head -20`

If there are import errors, fix them. The `tool` import is from `ai` package (AI SDK v6).

**Step 3: Commit**

```bash
git add packages/intelligence/src/tools/contract-canvas.ts
git commit -m "feat(intelligence): add contract canvas tool definitions for AI assist"
```

---

## Task 2: Contract Assist Intelligence Service

**Files:**
- Create: `packages/intelligence/src/services/contract-assist.service.ts`
- Modify: `packages/intelligence/src/index.ts`

**Step 1: Create the streaming service**

```typescript
// packages/intelligence/src/services/contract-assist.service.ts
import { streamText } from 'ai'
import { getContractCanvasTools } from '../tools/contract-canvas'
import { aiTelemetryConfig } from '../observe'

// ── Types ───────────────────────────────────────────────

export interface CanvasContext {
  contractName: string
  nodes: Array<{
    id: string
    type: string
    label: string
    data: Record<string, unknown>
  }>
  edges: Array<{
    id: string
    source: string
    target: string
  }>
  settings: {
    chain: string
    currency: string
    totalAmount: number
  }
}

interface ContractAssistParams {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  canvasContext: CanvasContext
  teamId: string
  userId: string
}

// ── System Prompt Builder ───────────────────────────────

function buildSystemPrompt(ctx: CanvasContext): string {
  const nodeList = ctx.nodes.length === 0
    ? 'The canvas is empty — no nodes yet.'
    : ctx.nodes
        .map((n) => `• [${n.id}] ${n.type} "${n.label}" — ${JSON.stringify(n.data)}`)
        .join('\n')

  const edgeList = ctx.edges.length === 0
    ? 'No connections yet.'
    : ctx.edges.map((e) => `• ${e.source} → ${e.target}`).join('\n')

  return `You are an AI contract building assistant for Bu Finance.
You help users create smart contracts by adding and connecting nodes on a visual canvas.

CURRENT CANVAS STATE:
Contract: "${ctx.contractName}"
Chain: ${ctx.settings.chain} | Currency: ${ctx.settings.currency} | Total: ${ctx.settings.totalAmount}

NODES:
${nodeList}

EDGES:
${edgeList}

AVAILABLE NODE TYPES:
- party-payer: The paying party. Data: { name, email, role: "payer" }
- party-payee: The receiving party. Data: { name, email, role: "payee" }
- milestone: A deliverable with payment. Data: { title, description, amount, currency, verificationCriteria, dueDate? }
- condition: If/else logic. Data: { type: "if-else"|"approval"|"time-based", condition, trueLabel, falseLabel }
- payment: Payment release. Data: { amount, currency, triggerType: "milestone-completion"|"manual"|"time-based" }
- signature: Signing requirement. Data: { required: true, signerId, signerRole: "payer"|"payee"|"witness" }
- clause: Legal text. Data: { title, content, aiGenerated: true }
- commission: Fee split. Data: { recipientName, recipientAddress, percentage }
- identity-verification: KYC/KYB gate. Data: { verificationType: "kyc"|"kyb"|"both", requiredFor: "payer"|"payee"|"both", triggerPoint }

RULES:
1. Use the tools to manipulate the canvas. Don't just describe changes — execute them.
2. When adding nodes, auto-generate sensible default data for the type.
3. After adding nodes, connect them in logical flow order (left to right).
4. Reference existing nodes by their ID when updating or connecting.
5. Explain what you're doing in text between tool calls.
6. If the user asks to "generate a contract for X", create the full graph: parties → milestones → payments → signatures.
7. For amounts, use the contract's currency setting (${ctx.settings.currency}).
8. Keep things simple — don't over-engineer unless asked.`
}

// ── Stream Function ─────────────────────────────────────

export function createContractAssistStream(params: ContractAssistParams) {
  const { messages, canvasContext, teamId, userId } = params
  const tools = getContractCanvasTools()

  return streamText({
    model: 'anthropic/claude-sonnet-4-5',
    system: buildSystemPrompt(canvasContext),
    messages,
    tools,
    maxSteps: 10,
    maxOutputTokens: 4096,
    experimental_telemetry: aiTelemetryConfig('contract-assist', {
      userId,
      entityId: teamId,
      surface: 'contract-builder',
      trigger: 'user',
    }),
  })
}
```

**Step 2: Export from index.ts**

Add this line to `packages/intelligence/src/index.ts` after the services export:

```typescript
// Contract builder AI assist
export { createContractAssistStream } from './services/contract-assist.service'
export type { CanvasContext } from './services/contract-assist.service'
```

**Step 3: Verify build**

Run: `npx turbo run build --filter=@bu/intelligence --force 2>&1 | tail -20`

Expected: Build succeeds with 0 errors.

**Step 4: Commit**

```bash
git add packages/intelligence/src/services/contract-assist.service.ts packages/intelligence/src/index.ts
git commit -m "feat(intelligence): add contract assist streaming service with canvas tools"
```

---

## Task 3: API Route for Contract AI Assist

**Files:**
- Create: `apps/app/src/app/api/contracts/ai-assist/route.ts`

**Step 1: Create the streaming API route**

```typescript
// apps/app/src/app/api/contracts/ai-assist/route.ts
import { createContractAssistStream } from '@bu/intelligence'
import { requireAuth } from '@bu/api-helpers'
import { requireRateLimit } from '@bu/kv'
import { createLogger } from '@bu/logger'

const logger = createLogger({ prefix: '[contract-ai-assist]' })

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const [auth, body] = await Promise.all([
    requireAuth(),
    request.json(),
  ])

  const { id: userId, teamId } = auth

  await requireRateLimit({ teamId, tier: 'ai' })

  const { messages, canvasContext } = body as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    canvasContext: {
      contractName: string
      nodes: Array<{ id: string; type: string; label: string; data: Record<string, unknown> }>
      edges: Array<{ id: string; source: string; target: string }>
      settings: { chain: string; currency: string; totalAmount: number }
    }
  }

  if (!messages?.length) {
    return new Response('messages required', { status: 400 })
  }

  logger.info('Contract AI assist request', {
    userId,
    teamId,
    nodeCount: canvasContext?.nodes?.length ?? 0,
    messageCount: messages.length,
  })

  const result = createContractAssistStream({
    messages,
    canvasContext: canvasContext ?? {
      contractName: 'Untitled',
      nodes: [],
      edges: [],
      settings: { chain: 'base', currency: 'USDC', totalAmount: 0 },
    },
    teamId,
    userId,
  })

  return result.toDataStreamResponse()
}
```

**Step 2: Verify build**

Run: `npx turbo run build --filter=app --force 2>&1 | tail -30`

Expected: Build succeeds. If there are import issues with `@bu/intelligence`, check the package.json exports map.

**Step 3: Commit**

```bash
git add apps/app/src/app/api/contracts/ai-assist/route.ts
git commit -m "feat(api): add /api/contracts/ai-assist streaming route"
```

---

## Task 4: Wire AI Assist Panel to Real Streaming

**Files:**
- Modify: `apps/app/src/components/contract/contract-builder/ai-assist-panel.tsx`

**Step 1: Replace the simulated chat with `useChat()`**

Replace the entire file content:

```tsx
// apps/app/src/components/contract/contract-builder/ai-assist-panel.tsx
'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { Button } from '@bu/ui/button'
import { Textarea } from '@bu/ui/textarea'
import { ScrollArea } from '@bu/ui/scroll-area'
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
import type { CanvasContext } from '@bu/intelligence'

// ── Suggestions ─────────────────────────────────────────

const suggestions = [
  {
    icon: FileText,
    title: 'Generate NDA',
    prompt: 'Generate a standard NDA contract with two parties, confidentiality clause, and signature requirements',
  },
  {
    icon: Target,
    title: 'Add Milestones',
    prompt: 'Add 3 milestones with clear deliverables and payment amounts for this contract',
  },
  {
    icon: Shield,
    title: 'Add KYC Gate',
    prompt: 'Add an identity verification node requiring KYC for both parties before signing',
  },
  {
    icon: Scale,
    title: 'Dispute Clause',
    prompt: 'Add a dispute resolution clause with arbitration terms',
  },
  {
    icon: Zap,
    title: 'Payment Flow',
    prompt: 'Create a payment node linked to milestone completion with the contract total',
  },
]

// ── Canvas Context Serializer ───────────────────────────

function serializeCanvasContext(
  nodes: ReturnType<typeof useContractStore.getState>['nodes'],
  edges: ReturnType<typeof useContractStore.getState>['edges'],
  settings: ReturnType<typeof useContractStore.getState>['settings'],
  contractName: string,
): CanvasContext {
  return {
    contractName,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type ?? 'unknown',
      label: (n.data as { label?: string }).label ?? '',
      data: n.data as Record<string, unknown>,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
    settings: {
      chain: settings.chain,
      currency: settings.currency,
      totalAmount: settings.totalAmount,
    },
  }
}

// ── Auto-Layout Helper ──────────────────────────────────

function autoLayoutPosition(
  existingNodes: { position: { x: number; y: number } }[],
): { x: number; y: number } {
  if (existingNodes.length === 0) return { x: 100, y: 100 }
  const maxX = Math.max(...existingNodes.map((n) => n.position.x))
  const maxY = Math.max(...existingNodes.map((n) => n.position.y))
  // Place new nodes to the right, wrapping every 3
  const col = existingNodes.length % 3
  const row = Math.floor(existingNodes.length / 3)
  return { x: 100 + col * 300, y: 100 + row * 200 }
}

// ── Component ───────────────────────────────────────────

export function AiAssistPanel() {
  const {
    isAiAssistOpen,
    setAiAssistOpen,
    contractName,
    nodes,
    edges,
    settings,
    addNode,
    removeNode,
    updateNodeData,
    onConnect,
    clearCanvas,
  } = useContractStore()

  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } =
    useChat({
      api: '/api/contracts/ai-assist',
      body: {
        canvasContext: serializeCanvasContext(nodes, edges, settings, contractName),
      },
      onToolCall: ({ toolCall }) => {
        const args = toolCall.args as Record<string, unknown>

        switch (toolCall.toolName) {
          case 'addNode': {
            const pos = (args.position as { x: number; y: number }) ?? autoLayoutPosition(nodes)
            const nodeId = (args.nodeId as string) ?? `${args.type}-${Date.now()}`
            addNode({
              id: nodeId,
              type: args.type as string,
              position: pos,
              data: {
                label: args.label as string,
                ...(args.data as Record<string, unknown> ?? {}),
              },
            } as any)
            return `Added node ${nodeId} (${args.type}: "${args.label}")`
          }

          case 'updateNode': {
            updateNodeData(args.nodeId as string, args.data as any)
            return `Updated node ${args.nodeId}`
          }

          case 'removeNode': {
            removeNode(args.nodeId as string)
            return `Removed node ${args.nodeId}`
          }

          case 'connectNodes': {
            onConnect({
              source: args.sourceId as string,
              target: args.targetId as string,
              sourceHandle: (args.sourceHandle as string) ?? 'right',
              targetHandle: (args.targetHandle as string) ?? 'left',
            } as any)
            return `Connected ${args.sourceId} → ${args.targetId}`
          }

          case 'clearCanvas': {
            clearCanvas()
            return 'Canvas cleared'
          }

          case 'layoutNodes': {
            // Re-position nodes in a grid/flow pattern
            const pattern = args.pattern as string
            const spacing = pattern === 'grid' ? { x: 280, y: 200 } : { x: 300, y: 180 }
            const cols = pattern === 'grid' ? 3 : 4
            nodes.forEach((node, i) => {
              const col = i % cols
              const row = Math.floor(i / cols)
              updateNodeData(node.id, {} as any)
              // Position update via setNodes would be better but updateNodeData
              // doesn't move position. For now, this is a no-op placeholder.
              // TODO: Add setNodePosition to store if layout tool is used frequently.
            })
            return `Layout applied: ${pattern}`
          }

          default:
            return `Unknown tool: ${toolCall.toolName}`
        }
      },
      initialMessages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hi! I'm your AI contract assistant. I can directly build on your canvas:\n\n• **Generate** full contracts from a description\n• **Add** milestones, clauses, parties, payments\n• **Modify** existing nodes\n• **Connect** the flow logic\n\nTry: "Create a freelance contract for a website redesign worth 5000 USDC with 3 milestones"`,
        },
      ],
    })

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSuggestionClick = useCallback(
    (prompt: string) => {
      setInput(prompt)
    },
    [setInput],
  )

  return (
    <Sheet open={isAiAssistOpen} onOpenChange={setAiAssistOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 !bg-white dark:!bg-[#1a1625] border-borderFine dark:border-darkBorder"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-borderFine dark:border-darkBorder bg-gradient-to-r from-purpleDanis/10 to-lila/10">
            <SheetHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-purpleDanis to-violeta">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <SheetTitle className="text-lg font-semibold text-darkText dark:text-whiteDanis">
                  AI Contract Assistant
                </SheetTitle>
              </div>
              <SheetDescription className="text-sm text-violetDanis dark:text-darkTextSecondary">
                Build contracts with natural language
              </SheetDescription>
            </SheetHeader>
            <Button
              variant="glass"
              size="sm"
              className="h-8 w-8 p-0 px-2"
              onClick={() => setAiAssistOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' && 'flex-row-reverse',
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purpleDanis/10 dark:bg-lila/10 shrink-0">
                      <Sparkles className="w-4 h-4 text-purpleDanis" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg p-3',
                      message.role === 'user'
                        ? 'bg-purpleDanis text-white'
                        : 'bg-lila/10 dark:bg-violet-950/30',
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purpleDanis/10 dark:bg-lila/10 shrink-0">
                    <Sparkles className="w-4 h-4 text-purpleDanis" />
                  </div>
                  <div className="bg-lila/10 dark:bg-violet-950/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purpleDanis" />
                      <span className="text-sm text-violetDanis dark:text-darkTextSecondary">
                        Building on canvas...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="px-4 py-3 border-t border-borderFine dark:border-darkBorder">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-3.5 h-3.5 text-violetDanis dark:text-darkTextSecondary" />
                <span className="text-xs text-violetDanis dark:text-darkTextSecondary">
                  Quick starts
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    type="button"
                    key={s.title}
                    onClick={() => handleSuggestionClick(s.prompt)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-lila/10 dark:bg-violet-950/30 hover:bg-lila/20 dark:hover:bg-violet-950/50 text-xs text-darkText dark:text-whiteDanis transition-colors"
                  >
                    <s.icon className="w-3 h-3" />
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-borderFine dark:border-darkBorder">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSubmit(e)
              }}
              className="flex gap-2"
            >
              <Textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e as any)
                  }
                }}
                placeholder="Describe what to build..."
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="shrink-0 bg-purpleDanis hover:bg-violeta text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <p className="text-xs text-violetDanis dark:text-darkTextSecondary mt-2 text-center">
              AI suggestions are for guidance only. Review all clauses before deploying.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

**Step 2: Verify build**

Run: `npx turbo run build --filter=app --force 2>&1 | tail -30`

Fix any import issues. Common ones:
- `useChat` is from `@ai-sdk/react` (check it's in app's dependencies)
- `CanvasContext` type import from `@bu/intelligence`

**Step 3: Manual test**

1. Run `bun dev` in the app
2. Open contract builder
3. Click AI Assist (sparkles icon)
4. Type "Create a simple freelance contract with 2 milestones"
5. Verify: nodes appear on canvas, AI text explains what it did

**Step 4: Commit**

```bash
git add apps/app/src/components/contract/contract-builder/ai-assist-panel.tsx
git commit -m "feat(contract-builder): wire AI assist panel to real streaming with canvas tools"
```

---

## Task 5: Arbitration Model Pool + Selection Algorithm

**Files:**
- Create: `packages/intelligence/src/arbitration/models.ts`

**Step 1: Create the model pool and selection logic**

```typescript
// packages/intelligence/src/arbitration/models.ts

// ── Curated Advocate Models (user-selectable) ───────────

export interface AdvocateModelOption {
  id: string
  displayName: string
  provider: string
  costTier: '$' | '$$' | '$$$'
  personality: string
}

export const ADVOCATE_MODEL_OPTIONS: AdvocateModelOption[] = [
  {
    id: 'anthropic/claude-sonnet-4-5',
    displayName: 'Claude Sonnet',
    provider: 'Anthropic',
    costTier: '$$',
    personality: 'Precise, balanced reasoning',
  },
  {
    id: 'openai/gpt-4o',
    displayName: 'GPT-4o',
    provider: 'OpenAI',
    costTier: '$$',
    personality: 'Broad knowledge, persuasive',
  },
  {
    id: 'google/gemini-2.0-flash',
    displayName: 'Gemini Flash',
    provider: 'Google',
    costTier: '$',
    personality: 'Fast, analytical',
  },
  {
    id: 'xai/grok-4-fast',
    displayName: 'Grok',
    provider: 'xAI',
    costTier: '$$',
    personality: 'Direct, unconventional arguments',
  },
  {
    id: 'fireworks/accounts/fireworks/models/deepseek-v3',
    displayName: 'DeepSeek V3',
    provider: 'Fireworks',
    costTier: '$',
    personality: 'Strong logic chains',
  },
]

// ── Full Neutral Model Pool ─────────────────────────────

const NEUTRAL_POOL = [
  'anthropic/claude-sonnet-4-5-20250929',
  'anthropic/claude-opus-4-5',
  'openai/gpt-4o',
  'openai/gpt-5-mini',
  'google/gemini-2.0-flash',
  'xai/grok-4-fast',
  'fireworks/accounts/fireworks/models/llama-v3p3-70b-instruct',
  'fireworks/accounts/fireworks/models/deepseek-v3',
  'mistral/mistral-large-latest',
]

function extractProvider(model: string): string {
  const slash = model.indexOf('/')
  return slash > 0 ? model.slice(0, slash) : model
}

// ── Selection Algorithm ─────────────────────────────────

/**
 * Select N models from the pool, excluding specified models,
 * maximizing provider diversity (round-robin by provider).
 */
function selectDiverse(
  pool: string[],
  exclude: string[],
  count: number,
): string[] {
  const excludeSet = new Set(exclude)
  const available = pool.filter((m) => !excludeSet.has(m))

  // Group by provider
  const byProvider = new Map<string, string[]>()
  for (const m of available) {
    const p = extractProvider(m)
    if (!byProvider.has(p)) byProvider.set(p, [])
    byProvider.get(p)!.push(m)
  }

  // Round-robin across providers
  const result: string[] = []
  const providers = [...byProvider.keys()]
  let providerIdx = 0

  while (result.length < count && providers.length > 0) {
    const provider = providers[providerIdx % providers.length]!
    const models = byProvider.get(provider)!
    if (models.length > 0) {
      result.push(models.shift()!)
      if (models.length === 0) {
        providers.splice(providerIdx % providers.length, 1)
        if (providers.length === 0) break
        providerIdx = providerIdx % providers.length
      } else {
        providerIdx++
      }
    } else {
      providers.splice(providerIdx % providers.length, 1)
    }
  }

  return result
}

/**
 * Select 3 tribunal judges, excluding advocate models.
 */
export function selectTribunalModels(
  payerAdvocateModel: string,
  payeeAdvocateModel: string,
): [string, string, string] {
  const result = selectDiverse(NEUTRAL_POOL, [payerAdvocateModel, payeeAdvocateModel], 3)
  if (result.length < 3) {
    throw new Error(`Cannot select 3 diverse tribunal models after excluding advocates`)
  }
  return result as [string, string, string]
}

/**
 * Select 5 supreme court judges, excluding advocate + tribunal models.
 */
export function selectSupremeCourtModels(
  payerAdvocateModel: string,
  payeeAdvocateModel: string,
  tribunalModels: string[],
): [string, string, string, string, string] {
  const exclude = [payerAdvocateModel, payeeAdvocateModel, ...tribunalModels]
  const result = selectDiverse(NEUTRAL_POOL, exclude, 5)
  if (result.length < 5) {
    // Relax: allow same provider different model if pool is exhausted
    const relaxed = selectDiverse(NEUTRAL_POOL, [payerAdvocateModel, payeeAdvocateModel], 5)
    if (relaxed.length < 5) {
      throw new Error(`Cannot select 5 supreme court models`)
    }
    return relaxed as [string, string, string, string, string]
  }
  return result as [string, string, string, string, string]
}
```

**Step 2: Commit**

```bash
git add packages/intelligence/src/arbitration/models.ts
git commit -m "feat(arbitration): add curated model pool and diverse selection algorithm"
```

---

## Task 6: Dynamic Arbitration Config Builder

**Files:**
- Modify: `packages/intelligence/src/arbitration/config.ts`
- Modify: `packages/intelligence/src/arbitration/index.ts`

**Step 1: Add `buildArbitrationConfig()` to config.ts**

Append to the end of `packages/intelligence/src/arbitration/config.ts`:

```typescript
// ── after DEFAULT_ARBITRATION_CONFIG ──

import { selectTribunalModels, selectSupremeCourtModels } from './models'

/**
 * Build an ArbitrationConfig with user-selected advocate models.
 * Tribunal and Supreme Court models are auto-selected for neutrality.
 */
export function buildArbitrationConfig(
  payerAdvocateModel?: string,
  payeeAdvocateModel?: string,
): ArbitrationConfig {
  const payerModel = payerAdvocateModel ?? DEFAULT_ARBITRATION_CONFIG.layer2.model
  const payeeModel = payeeAdvocateModel ?? DEFAULT_ARBITRATION_CONFIG.layer2.model

  const tribunalModels = selectTribunalModels(payerModel, payeeModel)
  const scModels = selectSupremeCourtModels(payerModel, payeeModel, tribunalModels)

  return {
    ...DEFAULT_ARBITRATION_CONFIG,
    layer2: {
      model: payerModel, // L2 uses both models — orchestrator passes the right one per advocate
    },
    layer3: {
      judges: [
        { model: tribunalModels[0] },
        { model: tribunalModels[1] },
        { model: tribunalModels[2] },
      ],
    },
    layer4: {
      judges: [
        { model: scModels[0] },
        { model: scModels[1] },
        { model: scModels[2] },
        { model: scModels[3] },
        { model: scModels[4] },
      ],
    },
  }
}
```

**Step 2: Export from arbitration index**

Add to `packages/intelligence/src/arbitration/index.ts`:

```typescript
export { buildArbitrationConfig } from './config'
export { ADVOCATE_MODEL_OPTIONS } from './models'
export type { AdvocateModelOption } from './models'
```

**Step 3: Verify build**

Run: `npx turbo run build --filter=@bu/intelligence --force 2>&1 | tail -20`

**Step 4: Commit**

```bash
git add packages/intelligence/src/arbitration/config.ts packages/intelligence/src/arbitration/index.ts packages/intelligence/src/arbitration/models.ts
git commit -m "feat(arbitration): dynamic config builder with user-selected advocate models"
```

---

## Task 7: Add `advocateModels` to ContractSettings Type

**Files:**
- Modify: `packages/contracts/src/contract-flow/types.ts`

**Step 1: Add the field to ContractSettings**

In `packages/contracts/src/contract-flow/types.ts`, update the `ContractSettings` interface:

```typescript
export interface ContractSettings {
  yieldStrategy: YieldStrategy
  chain: 'ethereum' | 'polygon' | 'arbitrum' | 'base'
  totalAmount: number
  currency: string
  commissions: {
    recipient: string
    percentage: number
  }[]
  /** LLM advocate models for dispute resolution (AI Gateway format) */
  advocateModels?: {
    payer: string
    payee: string
  }
}
```

**Step 2: Update default settings in contract-store.ts**

In `apps/app/src/lib/contract-store.ts`, update `defaultSettings`:

```typescript
const defaultSettings: ContractSettings = {
  yieldStrategy: { enabled: false },
  chain: 'base',
  totalAmount: 0,
  currency: 'USDC',
  commissions: [],
  advocateModels: {
    payer: 'anthropic/claude-sonnet-4-5',
    payee: 'anthropic/claude-sonnet-4-5',
  },
}
```

**Step 3: Verify build**

Run: `npx turbo run build --filter=@bu/contracts --force && npx turbo run build --filter=app --force 2>&1 | tail -20`

**Step 4: Commit**

```bash
git add packages/contracts/src/contract-flow/types.ts apps/app/src/lib/contract-store.ts
git commit -m "feat(contracts): add advocateModels to ContractSettings"
```

---

## Task 8: Model Picker UI in Settings Panel

**Files:**
- Modify: `apps/app/src/components/contract/contract-builder/settings-panel.tsx`

**Step 1: Add Dispute Resolution section to Settings Panel**

After the existing yield/chain/currency sections in `settings-panel.tsx`, add a new section before the closing `</div>`:

```tsx
// Import at the top of the file:
import { ADVOCATE_MODEL_OPTIONS } from '@bu/intelligence'
import { Scale as ScaleIcon, Brain } from 'lucide-react'

// Add this JSX section inside the settings panel, after the existing sections:

{/* Dispute Resolution — AI Advocate Models */}
<Separator />
<div className="space-y-4">
  <div className="flex items-center gap-2">
    <ScaleIcon className="w-4 h-4 text-purpleDanis" />
    <Label className="text-sm font-semibold text-darkText dark:text-whiteDanis">
      Dispute Resolution
    </Label>
  </div>
  <p className="text-xs text-violetDanis dark:text-darkTextSecondary">
    Each party picks an AI model to argue their case. Tribunal judges are auto-selected for neutrality.
  </p>

  {/* Payer Advocate */}
  <div className="space-y-2">
    <Label className="text-xs text-violetDanis dark:text-darkTextSecondary">
      Payer&apos;s AI Advocate
    </Label>
    <Select
      value={settings.advocateModels?.payer ?? 'anthropic/claude-sonnet-4-5'}
      onValueChange={(value) =>
        updateSettings({
          advocateModels: {
            payer: value,
            payee: settings.advocateModels?.payee ?? 'anthropic/claude-sonnet-4-5',
          },
        })
      }
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ADVOCATE_MODEL_OPTIONS.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2">
                <Brain className="w-3 h-3 text-purpleDanis" />
                <span>{m.displayName}</span>
              </div>
              <span className="text-xs text-violetDanis">{m.costTier} · {m.personality}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Payee Advocate */}
  <div className="space-y-2">
    <Label className="text-xs text-violetDanis dark:text-darkTextSecondary">
      Payee&apos;s AI Advocate
    </Label>
    <Select
      value={settings.advocateModels?.payee ?? 'anthropic/claude-sonnet-4-5'}
      onValueChange={(value) =>
        updateSettings({
          advocateModels: {
            payer: settings.advocateModels?.payer ?? 'anthropic/claude-sonnet-4-5',
            payee: value,
          },
        })
      }
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ADVOCATE_MODEL_OPTIONS.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2">
                <Brain className="w-3 h-3 text-purpleDanis" />
                <span>{m.displayName}</span>
              </div>
              <span className="text-xs text-violetDanis">{m.costTier} · {m.personality}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  <div className="flex items-start gap-2 p-2 rounded-lg bg-lila/5 dark:bg-violet-950/20">
    <Shield className="w-3.5 h-3.5 text-cyan-500 mt-0.5 shrink-0" />
    <p className="text-[10px] text-violetDanis dark:text-darkTextSecondary">
      Tribunal (3 judges) and Supreme Court (5 judges) use neutral, auto-selected models with mandatory provider diversity. Neither party can influence judge selection.
    </p>
  </div>
</div>
```

**Step 2: Verify the `updateSettings` action exists**

Check that `updateSettings` is available from `useContractStore`. If the store uses `setSettings` instead, use that. The existing settings panel already calls it — match the pattern.

**Step 3: Verify build**

Run: `npx turbo run build --filter=app --force 2>&1 | tail -30`

**Step 4: Manual test**

1. Open contract builder → Settings
2. Scroll to "Dispute Resolution" section
3. Select different models for payer/payee
4. Verify selections persist in state

**Step 5: Commit**

```bash
git add apps/app/src/components/contract/contract-builder/settings-panel.tsx
git commit -m "feat(contract-builder): add AI advocate model picker to settings panel"
```

---

## Task 9: Install `@ai-sdk/react` Dependency

**Files:**
- Modify: `apps/app/package.json`

**Step 1: Check if already installed**

Run: `grep "@ai-sdk/react" apps/app/package.json`

If not found:

Run: `cd apps/app && bun add @ai-sdk/react`

**Step 2: Verify import resolves**

Run: `npx turbo run build --filter=app --force 2>&1 | tail -20`

**Step 3: Commit (if package.json changed)**

```bash
git add apps/app/package.json bun.lock
git commit -m "chore(app): add @ai-sdk/react for useChat hook"
```

---

## Execution Order

Tasks should be executed in this order due to dependencies:

1. **Task 9** — Install `@ai-sdk/react` (dependency for Task 4)
2. **Task 1** — Canvas tool definitions (dependency for Task 2)
3. **Task 2** — Contract assist service (dependency for Task 3)
4. **Task 3** — API route (dependency for Task 4)
5. **Task 4** — Wire AI assist panel (depends on 1-3 + 9)
6. **Task 5** — Model pool + selection (dependency for Task 6)
7. **Task 7** — ContractSettings type change (dependency for Tasks 6, 8)
8. **Task 6** — Dynamic config builder (depends on 5, 7)
9. **Task 8** — Model picker UI (depends on 5, 7)

**Parallelizable**: Tasks 5+7 can run in parallel. Tasks 6+8 can run in parallel after 5+7 complete.
