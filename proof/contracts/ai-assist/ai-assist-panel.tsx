'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { useReactFlow } from '@xyflow/react'
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
    prompt:
      'Generate a standard NDA contract with two parties, confidentiality clause, and signature requirements',
  },
  {
    icon: Target,
    title: 'Add Milestones',
    prompt:
      'Add 3 milestones with clear deliverables and payment amounts for this contract',
  },
  {
    icon: Shield,
    title: 'Add KYC Gate',
    prompt:
      'Add an identity verification node requiring KYC for both parties before signing',
  },
  {
    icon: Scale,
    title: 'Dispute Clause',
    prompt: 'Add a dispute resolution clause with arbitration terms',
  },
  {
    icon: Zap,
    title: 'Payment Flow',
    prompt:
      'Create a payment node linked to milestone completion with the contract total',
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
  const col = existingNodes.length % 3
  const row = Math.floor(existingNodes.length / 3)
  return { x: 100 + col * 300, y: 100 + row * 200 }
}

// ── Layout Algorithms ───────────────────────────────────

const NODE_X_GAP = 300
const NODE_Y_GAP = 200

/** Priority order for flow layout — lower = higher on canvas */
const FLOW_TYPE_PRIORITY: Record<string, number> = {
  'party-payer': 0,
  'party-payee': 0,
  'identity-verification': 1,
  clause: 2,
  condition: 2,
  milestone: 3,
  commission: 4,
  payment: 5,
  signature: 6,
}

type LayoutableNode = { id: string; type?: string; position: { x: number; y: number }; data: Record<string, unknown> }
type LayoutableEdge = { source: string; target: string }

/**
 * Flow layout — topological BFS from root nodes.
 * Falls back to type-priority grouping when edges are sparse.
 */
function flowLayout(nodes: LayoutableNode[], edges: LayoutableEdge[]): LayoutableNode[] {
  if (nodes.length === 0) return nodes

  // Build adjacency + in-degree
  const inDegree = new Map<string, number>()
  const children = new Map<string, string[]>()
  for (const n of nodes) {
    inDegree.set(n.id, 0)
    children.set(n.id, [])
  }
  for (const e of edges) {
    if (inDegree.has(e.target)) {
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
    }
    children.get(e.source)?.push(e.target)
  }

  // BFS from roots (nodes with no incoming edges)
  const depth = new Map<string, number>()
  const roots = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0)

  // If no edges exist, group by type priority instead
  if (edges.length === 0 || roots.length === nodes.length) {
    return typeGroupLayout(nodes)
  }

  const queue = roots.map((n) => n.id)
  for (const id of queue) depth.set(id, 0)

  let head = 0
  while (head < queue.length) {
    const current = queue[head++]
    const currentDepth = depth.get(current) ?? 0
    for (const child of children.get(current) ?? []) {
      if (!depth.has(child) || (depth.get(child) ?? 0) < currentDepth + 1) {
        depth.set(child, currentDepth + 1)
        if (!queue.includes(child)) queue.push(child)
      }
    }
  }

  // Assign depth to orphan nodes (not reachable from any root)
  const maxDepth = Math.max(...Array.from(depth.values()), 0)
  for (const n of nodes) {
    if (!depth.has(n.id)) {
      depth.set(n.id, maxDepth + 1)
    }
  }

  // Group nodes by depth level
  const levels = new Map<number, LayoutableNode[]>()
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 0
    if (!levels.has(d)) levels.set(d, [])
    levels.get(d)!.push(n)
  }

  // Position each level horizontally centered
  return nodes.map((n) => {
    const d = depth.get(n.id) ?? 0
    const level = levels.get(d) ?? [n]
    const idx = level.indexOf(n)
    const totalWidth = (level.length - 1) * NODE_X_GAP
    const startX = -totalWidth / 2
    return {
      ...n,
      position: { x: startX + idx * NODE_X_GAP, y: d * NODE_Y_GAP },
    }
  })
}

/** Group nodes by type priority and lay them out top-to-bottom */
function typeGroupLayout(nodes: LayoutableNode[]): LayoutableNode[] {
  const sorted = [...nodes].sort((a, b) => {
    const pa = FLOW_TYPE_PRIORITY[a.type ?? ''] ?? 3
    const pb = FLOW_TYPE_PRIORITY[b.type ?? ''] ?? 3
    return pa - pb
  })

  // Group into rows by priority
  const groups = new Map<number, LayoutableNode[]>()
  for (const n of sorted) {
    const p = FLOW_TYPE_PRIORITY[n.type ?? ''] ?? 3
    if (!groups.has(p)) groups.set(p, [])
    groups.get(p)!.push(n)
  }

  let row = 0
  const positioned: LayoutableNode[] = []
  for (const [, group] of [...groups.entries()].sort(([a], [b]) => a - b)) {
    const totalWidth = (group.length - 1) * NODE_X_GAP
    const startX = -totalWidth / 2
    for (let i = 0; i < group.length; i++) {
      positioned.push({
        ...group[i],
        position: { x: startX + i * NODE_X_GAP, y: row * NODE_Y_GAP },
      })
    }
    row++
  }
  return positioned
}

/** Grid layout — nodes in a 3-column grid, sorted by type */
function gridLayout(nodes: LayoutableNode[]): LayoutableNode[] {
  const cols = 3
  const sorted = [...nodes].sort((a, b) => {
    const pa = FLOW_TYPE_PRIORITY[a.type ?? ''] ?? 3
    const pb = FLOW_TYPE_PRIORITY[b.type ?? ''] ?? 3
    return pa - pb
  })
  return sorted.map((n, i) => ({
    ...n,
    position: { x: (i % cols) * NODE_X_GAP, y: Math.floor(i / cols) * NODE_Y_GAP },
  }))
}

/** Tree layout — hierarchical BFS from roots */
function treeLayout(nodes: LayoutableNode[], edges: LayoutableEdge[]): LayoutableNode[] {
  if (nodes.length === 0) return nodes
  if (edges.length === 0) return gridLayout(nodes)

  // Build adjacency
  const inDegree = new Map<string, number>()
  const children = new Map<string, string[]>()
  for (const n of nodes) {
    inDegree.set(n.id, 0)
    children.set(n.id, [])
  }
  for (const e of edges) {
    if (inDegree.has(e.target)) {
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
    }
    children.get(e.source)?.push(e.target)
  }

  const roots = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0)
  if (roots.length === 0) return flowLayout(nodes, edges)

  // BFS assigning subtree widths for better horizontal spacing
  const depth = new Map<string, number>()
  const parent = new Map<string, string | null>()
  const visited = new Set<string>()

  const queue: string[] = []
  for (const r of roots) {
    queue.push(r.id)
    depth.set(r.id, 0)
    parent.set(r.id, null)
    visited.add(r.id)
  }

  let head = 0
  while (head < queue.length) {
    const current = queue[head++]
    const d = depth.get(current) ?? 0
    for (const child of children.get(current) ?? []) {
      if (!visited.has(child)) {
        visited.add(child)
        depth.set(child, d + 1)
        parent.set(child, current)
        queue.push(child)
      }
    }
  }

  // Handle orphans
  for (const n of nodes) {
    if (!visited.has(n.id)) {
      depth.set(n.id, (Math.max(...Array.from(depth.values()), 0)) + 1)
    }
  }

  // Group by depth, then position
  const levels = new Map<number, LayoutableNode[]>()
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 0
    if (!levels.has(d)) levels.set(d, [])
    levels.get(d)!.push(n)
  }

  return nodes.map((n) => {
    const d = depth.get(n.id) ?? 0
    const level = levels.get(d) ?? [n]
    const idx = level.indexOf(n)
    const totalWidth = (level.length - 1) * NODE_X_GAP
    const startX = -totalWidth / 2
    return {
      ...n,
      position: { x: startX + idx * NODE_X_GAP, y: d * NODE_Y_GAP },
    }
  })
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
  const { fitView } = useReactFlow()

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setInput,
  } = useChat({
    api: '/api/contracts/ai-assist',
    body: {
      canvasContext: serializeCanvasContext(
        nodes,
        edges,
        settings,
        contractName,
      ),
    },
    onToolCall: ({ toolCall }) => {
      const args = toolCall.args as Record<string, unknown>

      switch (toolCall.toolName) {
        case 'addNode': {
          const pos =
            (args.position as { x: number; y: number }) ??
            autoLayoutPosition(nodes)
          const nodeId =
            (args.nodeId as string) ?? `${args.type}-${Date.now()}`
          addNode({
            id: nodeId,
            type: args.type as string,
            position: pos,
            data: {
              label: args.label as string,
              ...((args.data as Record<string, unknown>) ?? {}),
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
          const layout = ((args.layout ?? args.pattern ?? 'flow') as string).toLowerCase()
          const currentNodes = useContractStore.getState().nodes
          const currentEdges = useContractStore.getState().edges

          if (currentNodes.length === 0) {
            return 'No nodes to layout'
          }

          let positioned: typeof currentNodes
          if (layout === 'grid') {
            positioned = gridLayout(currentNodes as LayoutableNode[]) as typeof currentNodes
          } else if (layout === 'tree') {
            positioned = treeLayout(currentNodes as LayoutableNode[], currentEdges) as typeof currentNodes
          } else {
            // Default: flow layout
            positioned = flowLayout(currentNodes as LayoutableNode[], currentEdges) as typeof currentNodes
          }

          useContractStore.getState().setNodes(positioned)
          // Allow React to flush the state update before fitting the view
          setTimeout(() => fitView({ padding: 0.5, maxZoom: 1, duration: 300 }), 50)
          return `Layout applied: ${layout} (${currentNodes.length} nodes repositioned)`
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

          {/* Suggestions — only shown before the user sends a message */}
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
              AI suggestions are for guidance only. Review all clauses before
              deploying.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
