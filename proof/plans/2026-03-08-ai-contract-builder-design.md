# AI Contract Builder — Full Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the contract builder's AI features end-to-end: toolbar flow legend, real AI-powered contract generation via `@bu/intelligence`, template-first "Build With AI" flow, live AI Assist chat, and token-based public preview pages.

**Architecture:** New `contract-builder.service.ts` in `@bu/intelligence` uses Claude via AI SDK v6 with structured output to match templates and generate node/edge graphs. A thin API route at `/api/contracts/ai-generate` bridges the frontend. The AI Assist panel streams real responses with canvas context. Preview uses the existing JWT token pattern from invoices (`@bu/invoice/token`) to generate public shareable URLs.

**Tech Stack:** AI SDK v6 (`generateText` + `Output.object`), Zod v4, Claude Sonnet via `@bu/intelligence`, Langfuse observability, JWT tokens via `jose`, Next.js App Router public pages.

---

## Task 1: Toolbar Flow Legend Strip

**Files:**
- Create: `apps/app/src/components/contract/contract-builder/flow-legend.tsx`
- Modify: `apps/app/src/components/contract/contract-builder/index.tsx`

### Step 1: Create the flow legend component

A thin `h-7` bar between the toolbar and the canvas showing the escrow flow visually:

```tsx
// flow-legend.tsx
'use client'

import { cn } from '@bu/ui/cn'
import {
  Building2, PenLine, Lock, Target, Sparkles, GitBranch, Banknote, User,
} from 'lucide-react'

const steps = [
  { icon: Building2, label: 'Payer', color: 'bg-violet-500' },
  { icon: PenLine, label: 'Sign', color: 'bg-violet-400' },
  { icon: Lock, label: 'Escrow', color: 'bg-emerald-500' },
  { icon: Target, label: 'Milestone', color: 'bg-violet-400' },
  { icon: Sparkles, label: 'AI Verify', color: 'bg-purple-500' },
  { icon: GitBranch, label: 'Condition', color: 'bg-amber-500' },
  { icon: Banknote, label: 'Payment', color: 'bg-emerald-400' },
  { icon: User, label: 'Payee', color: 'bg-emerald-500' },
]

export function FlowLegend() {
  return (
    <div className="flex items-center justify-center gap-1 h-7 px-4 border-b border-borderFine dark:border-darkBorder bg-lila/5 dark:bg-violet-950/30">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-0.5">
          {i > 0 && (
            <span className="text-[8px] text-purpleDanis/40 mx-0.5">→</span>
          )}
          <div className={cn('w-3 h-3 rounded-sm flex items-center justify-center', step.color)}>
            <step.icon className="w-2 h-2 text-white" />
          </div>
          <span className="text-[9px] text-violetDanis font-medium">{step.label}</span>
        </div>
      ))}
    </div>
  )
}
```

### Step 2: Add FlowLegend to ContractBuilder layout

In `index.tsx`, between `<Toolbar />` and the main content div:

```tsx
import { FlowLegend } from './flow-legend'

// Inside the return, after <Toolbar />:
<Toolbar />
<FlowLegend />
```

### Step 3: Commit

```
feat(contracts): add toolbar flow legend showing escrow lifecycle
```

---

## Task 2: Contract Builder Intelligence Service

**Files:**
- Create: `packages/intelligence/src/services/contract-builder.service.ts`
- Modify: `packages/intelligence/src/index.ts` (add export)

### Step 1: Create the service with two functions

```ts
// contract-builder.service.ts
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { aiTelemetryConfig } from '../observe'

// ── Schemas ──────────────────────────────────────────

const nodeDataSchema = z.object({
  label: z.string().describe('Display label for the node'),
  name: z.string().optional().describe('Party name (for party nodes)'),
  email: z.string().optional().describe('Party email (for party nodes)'),
  role: z.enum(['payer', 'payee']).optional().describe('Party role'),
  title: z.string().optional().describe('Milestone/clause title'),
  description: z.string().optional().describe('Milestone description'),
  amount: z.number().optional().describe('Payment/milestone amount'),
  currency: z.enum(['USDC', 'USDT', 'DAI', 'ETH']).optional(),
  verificationCriteria: z.string().optional().describe('AI verification criteria for milestone'),
  content: z.string().optional().describe('Clause legal text'),
  condition: z.string().optional().describe('Condition logic text'),
  trueLabel: z.string().optional(),
  falseLabel: z.string().optional(),
  triggerType: z.enum(['milestone-completion', 'manual', 'time-based']).optional(),
  required: z.boolean().optional(),
  signerRole: z.enum(['payer', 'payee', 'witness']).optional(),
  recipientName: z.string().optional(),
  recipientAddress: z.string().optional(),
  percentage: z.number().optional(),
  aiGenerated: z.boolean().optional(),
})

const generatedNodeSchema = z.object({
  id: z.string().describe('Unique node ID like "party-payer-1"'),
  type: z.enum([
    'party-payer', 'party-payee', 'milestone', 'condition',
    'payment', 'signature', 'clause', 'commission', 'identity-verification',
  ]).describe('Node type'),
  data: nodeDataSchema,
})

const generatedEdgeSchema = z.object({
  source: z.string().describe('Source node ID'),
  target: z.string().describe('Target node ID'),
})

const templateMatchSchema = z.object({
  matchedTemplateId: z.string().nullable().describe('ID of best matching template, or null if none fit'),
  confidence: z.number().min(0).max(1).describe('Match confidence 0-1'),
  reasoning: z.string().describe('Why this template was chosen or why none matched'),
  customizations: z.object({
    nodesToAdd: z.array(generatedNodeSchema).describe('Additional nodes to add to the template'),
    nodesToModify: z.array(z.object({
      nodeId: z.string(),
      updates: nodeDataSchema.partial(),
    })).describe('Modifications to existing template nodes'),
    nodesToRemove: z.array(z.string()).describe('Node IDs to remove from template'),
    edgesToAdd: z.array(generatedEdgeSchema).describe('Additional edges'),
    edgesToRemove: z.array(z.object({ source: z.string(), target: z.string() })),
  }),
  settings: z.object({
    totalAmount: z.number().optional(),
    currency: z.enum(['USDC', 'USDT', 'DAI', 'ETH']).optional(),
    chain: z.enum(['ethereum', 'polygon', 'arbitrum', 'base']).optional(),
  }).optional(),
})

const scratchContractSchema = z.object({
  nodes: z.array(generatedNodeSchema),
  edges: z.array(generatedEdgeSchema),
  contractName: z.string().describe('Suggested contract name'),
  summary: z.string().describe('1-2 sentence summary of the contract'),
  settings: z.object({
    totalAmount: z.number(),
    currency: z.enum(['USDC', 'USDT', 'DAI', 'ETH']),
    chain: z.enum(['ethereum', 'polygon', 'arbitrum', 'base']),
  }),
})

// ── Template catalog (injected as context) ───────────

interface TemplateSummary {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  nodeTypes: string[]
}

// ── Service Functions ────────────────────────────────

const SYSTEM_PROMPT = `You are BUFI, an AI escrow contract architect. You build node-based visual contracts for the Bu Finance platform.

ESCROW CONTRACT STRUCTURE:
- Contracts are directed graphs of nodes connected by edges
- Flow: Payer → Signatures → Milestones → Conditions → Payments → Payee
- Funds are locked in USDC escrow until AI-verified milestones are complete
- Each milestone has verificationCriteria that AI checks against submitted deliverables
- Conditions create if/else branches (approval gates, quality checks)
- Commission nodes are non-blocking side payments (max 10% total)
- Every party (payer/payee) needs a linked signature node

NODE TYPES:
- party-payer: The client/buyer who funds escrow (needs name, email, role=payer)
- party-payee: The provider/seller who receives payment (needs name, email, role=payee)
- milestone: Deliverable checkpoint (needs title, description, amount, currency, verificationCriteria)
- condition: If/else branching (needs condition text, trueLabel, falseLabel)
- payment: Fund release (needs amount, currency, triggerType)
- signature: eSignature capture (needs signerRole, required=true)
- clause: Legal text block (needs title, content, aiGenerated=true)
- commission: Third-party fee split (needs recipientName, percentage ≤ 10)
- identity-verification: KYC/KYB gate

RULES:
- Every contract MUST have at least 1 party-payer and 1 party-payee
- Every party MUST have a signature node
- Payment amounts should sum to total contract value
- Milestone amounts should correspond to payment amounts
- verificationCriteria must be specific and measurable
- Node IDs must be unique: use format "{type}-{index}" (e.g. "milestone-1")
- Edges flow left-to-right: source (earlier) → target (later)`

export async function matchTemplate(
  prompt: string,
  templates: TemplateSummary[],
): Promise<z.infer<typeof templateMatchSchema>> {
  const model = await getModel()

  const { output } = await generateText({
    model,
    system: `${SYSTEM_PROMPT}

TASK: Match the user's contract description to the best template from the catalog.
If confidence >= 0.5, return the template ID with customizations needed.
If confidence < 0.5, return matchedTemplateId: null.

AVAILABLE TEMPLATES:
${templates.map(t => `- ${t.id}: ${t.name} (${t.category}) — ${t.description} [nodes: ${t.nodeTypes.join(', ')}]`).join('\n')}`,
    output: Output.object({ schema: templateMatchSchema }),
    prompt: `User wants to build this contract:\n\n${prompt}`,
    temperature: 0.3,
    maxOutputTokens: 4000,
    experimental_telemetry: aiTelemetryConfig('contract-match-template'),
  })

  return output!
}

export async function generateFromScratch(
  prompt: string,
  clarifications?: Record<string, string>,
): Promise<z.infer<typeof scratchContractSchema>> {
  const model = await getModel()

  const clarificationContext = clarifications
    ? `\n\nADDITIONAL CONTEXT FROM USER:\n${Object.entries(clarifications).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n\n')}`
    : ''

  const { output } = await generateText({
    model,
    system: `${SYSTEM_PROMPT}

TASK: Generate a complete contract structure from scratch.
Create all necessary nodes and edges for a valid, deployable contract.
Include specific verificationCriteria for each milestone.
Generate legal clause content where appropriate.
Ensure payment amounts sum to totalAmount.`,
    output: Output.object({ schema: scratchContractSchema }),
    prompt: `Build this contract:\n\n${prompt}${clarificationContext}`,
    temperature: 0.4,
    maxOutputTokens: 8000,
    experimental_telemetry: aiTelemetryConfig('contract-generate-scratch'),
  })

  return output!
}

// AI Assist: contextual chat for editing existing canvas
const assistResponseSchema = z.object({
  message: z.string().describe('Conversational response to the user'),
  actions: z.array(z.object({
    type: z.enum(['add_node', 'modify_node', 'remove_node', 'add_edge', 'generate_clause']),
    nodeId: z.string().optional(),
    node: generatedNodeSchema.optional(),
    edge: generatedEdgeSchema.optional(),
    updates: nodeDataSchema.partial().optional(),
  })).describe('Suggested actions to apply to the canvas'),
})

export async function assistChat(
  userMessage: string,
  context: {
    contractName: string
    nodes: Array<{ id: string; type: string; data: Record<string, unknown> }>
    edges: Array<{ source: string; target: string }>
  },
): Promise<z.infer<typeof assistResponseSchema>> {
  const model = await getModel()

  const canvasContext = `CURRENT CONTRACT: "${context.contractName}"
NODES (${context.nodes.length}):
${context.nodes.map(n => `- ${n.id} (${n.type}): ${JSON.stringify(n.data)}`).join('\n')}
EDGES (${context.edges.length}):
${context.edges.map(e => `- ${e.source} → ${e.target}`).join('\n')}`

  const { output } = await generateText({
    model,
    system: `${SYSTEM_PROMPT}

TASK: You are an AI assistant helping the user edit their contract on the visual canvas.
Respond conversationally AND suggest concrete actions (add/modify/remove nodes, generate clauses).
Keep responses concise. Always explain what you're suggesting and why.

${canvasContext}`,
    output: Output.object({ schema: assistResponseSchema }),
    prompt: userMessage,
    temperature: 0.5,
    maxOutputTokens: 4000,
    experimental_telemetry: aiTelemetryConfig('contract-assist-chat'),
  })

  return output!
}

// ── Model helper ─────────────────────────────────────
async function getModel() {
  // Use Claude Sonnet for balanced quality/speed
  const { createAnthropic } = await import('@ai-sdk/anthropic')
  const anthropic = createAnthropic()
  return anthropic('claude-sonnet-4-20250514') as any
}
```

### Step 2: Export from intelligence index

Add to `packages/intelligence/src/index.ts`:

```ts
// Contract builder
export {
  matchTemplate,
  generateFromScratch,
  assistChat,
} from './services/contract-builder.service'
```

### Step 3: Build and verify

```bash
npx turbo run build --filter=@bu/intelligence --force
```

### Step 4: Commit

```
feat(intelligence): add contract-builder AI service with template matching, scratch generation, and assist chat
```

---

## Task 3: API Route for Contract AI Generation

**Files:**
- Create: `apps/app/src/app/api/contracts/ai-generate/route.ts`

### Step 1: Create the API route

```ts
// route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@bu/api-helpers'
import { requireRateLimit } from '@bu/api-helpers'
import { createLogger } from '@bu/logger'
import { matchTemplate, generateFromScratch, assistChat } from '@bu/intelligence'
import { getTemplateSummaries } from '@bu/contracts/templates'

const logger = createLogger({ prefix: 'api:contracts:ai-generate' })

const generateSchema = z.object({
  action: z.enum(['match-template', 'generate-scratch', 'assist-chat']),
  prompt: z.string().min(10),
  clarifications: z.record(z.string(), z.string()).optional(),
  context: z.object({
    contractName: z.string(),
    nodes: z.array(z.object({
      id: z.string(),
      type: z.string(),
      data: z.record(z.string(), z.unknown()),
    })),
    edges: z.array(z.object({ source: z.string(), target: z.string() })),
  }).optional(),
})

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    await requireRateLimit({ key: `ai-generate:${session.user.id}`, limiter: 'ai' })

    const body = await req.json()
    const parsed = generateSchema.parse(body)

    switch (parsed.action) {
      case 'match-template': {
        const templates = getTemplateSummaries()
        const result = await matchTemplate(parsed.prompt, templates)
        return NextResponse.json({ success: true, data: result })
      }

      case 'generate-scratch': {
        const result = await generateFromScratch(parsed.prompt, parsed.clarifications)
        return NextResponse.json({ success: true, data: result })
      }

      case 'assist-chat': {
        if (!parsed.context) {
          return NextResponse.json({ error: 'Context required for assist-chat' }, { status: 400 })
        }
        const result = await assistChat(parsed.prompt, parsed.context)
        return NextResponse.json({ success: true, data: result })
      }
    }
  } catch (error) {
    logger.error('AI contract generation failed', { error: (error as Error).message })
    return NextResponse.json(
      { error: 'AI generation failed', details: (error as Error).message },
      { status: 500 },
    )
  }
}
```

### Step 2: Add `getTemplateSummaries()` to contracts package

In `packages/contracts/src/templates/index.ts`, add:

```ts
export function getTemplateSummaries(): Array<{
  id: string; name: string; description: string; category: string; tags: string[]; nodeTypes: string[]
}> {
  return templates.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    tags: t.tags,
    nodeTypes: [...new Set(t.nodes.map(n => n.type))],
  }))
}
```

### Step 3: Commit

```
feat(api): add /api/contracts/ai-generate route for template matching, scratch gen, and assist chat
```

---

## Task 4: Wire AI Assist Panel to Real AI

**Files:**
- Modify: `apps/app/src/components/contract/contract-builder/ai-assist-panel.tsx`

### Step 1: Replace simulated responses with API calls

Replace the `handleSend()` function body. Keep the UI structure, but change the response generation:

```ts
const handleSend = async () => {
  if (!input.trim()) return

  const userMessage: Message = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: input.trim(),
    timestamp: new Date(),
  }
  setMessages(prev => [...prev, userMessage])
  const prompt = input.trim()
  setInput('')
  setIsLoading(true)

  try {
    const res = await fetch('/api/contracts/ai-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assist-chat',
        prompt,
        context: {
          contractName,
          nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data })),
          edges: edges.map(e => ({ source: e.source, target: e.target })),
        },
      }),
    })

    const json = await res.json()
    if (!json.success) throw new Error(json.error)

    const { message, actions } = json.data

    // Apply suggested actions to canvas
    for (const action of actions) {
      switch (action.type) {
        case 'add_node':
          if (action.node) {
            addNode({
              ...action.node,
              position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 100 },
            })
          }
          break
        case 'modify_node':
          if (action.nodeId && action.updates) {
            updateNodeData(action.nodeId, action.updates)
          }
          break
        case 'remove_node':
          if (action.nodeId) removeNode(action.nodeId)
          break
        case 'add_edge':
          if (action.edge) onConnect({ source: action.edge.source, target: action.edge.target, sourceHandle: null, targetHandle: null })
          break
        case 'generate_clause':
          if (action.node) {
            addNode({
              ...action.node,
              position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 100 },
            })
          }
          break
      }
    }

    const actionSummary = actions.length > 0
      ? `\n\n_Applied ${actions.length} action${actions.length > 1 ? 's' : ''} to canvas._`
      : ''

    setMessages(prev => [...prev, {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: message + actionSummary,
      timestamp: new Date(),
    }])
  } catch (error) {
    setMessages(prev => [...prev, {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: 'Sorry, I encountered an error. Please try again.',
      timestamp: new Date(),
    }])
  } finally {
    setIsLoading(false)
  }
}
```

Need to pull `edges`, `removeNode`, `onConnect` from the store:

```ts
const edges = useContractStore((s) => s.edges)
const removeNode = useContractStore((s) => s.removeNode)
const onConnect = useContractStore((s) => s.onConnect)
```

### Step 2: Commit

```
feat(contracts): wire AI assist panel to real Claude-powered backend
```

---

## Task 5: "Build With AI" — Template-First Flow

**Files:**
- Modify: `apps/app/src/components/contract/contract-builder/ai-contract-builder.tsx`
- Modify: `apps/app/src/components/contract/contract-builder/toolbar.tsx`

### Step 1: Update AI Contract Builder to use template matching

In the `handleAnalyze()` function, replace the local `analyzePromptCompleteness()` with an API call:

```ts
const handleAnalyze = async () => {
  setIsAnalyzing(true)
  try {
    // Step 1: Try template matching first
    const matchRes = await fetch('/api/contracts/ai-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'match-template', prompt }),
    })
    const matchJson = await matchRes.json()

    if (matchJson.success && matchJson.data.matchedTemplateId && matchJson.data.confidence >= 0.5) {
      // Template matched — apply with customizations
      setTemplateMatch(matchJson.data)
      setStep('preview')
    } else {
      // No template match — generate from scratch
      const scratchRes = await fetch('/api/contracts/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-scratch',
          prompt,
          clarifications: Object.fromEntries(
            clarificationAnswers.filter(([, v]) => v.trim())
          ),
        }),
      })
      const scratchJson = await scratchRes.json()
      if (scratchJson.success) {
        setScratchResult(scratchJson.data)
        setStep('preview')
      }
    }
  } catch (error) {
    // Fallback to local analysis
    const localAnalysis = analyzePromptCompleteness(prompt)
    setAnalysis(localAnalysis)
    setStep('analysis')
  } finally {
    setIsAnalyzing(false)
  }
}
```

### Step 2: Add "Build With AI" button to toolbar dropdown

In the toolbar's contract dropdown menu, add:

```tsx
<DropdownMenuItem onClick={() => {/* open AI contract builder modal */}}>
  <Sparkles className="w-4 h-4 mr-2" />
  Build With AI
</DropdownMenuItem>
```

Wire this to a new state: `isAiBuildOpen` in the contract store, or use the existing `ai-contract-builder` component as a modal.

### Step 3: Commit

```
feat(contracts): wire Build With AI to Claude template matching with scratch fallback
```

---

## Task 6: Contract Preview — Public Token Page

**Files:**
- Create: `apps/app/src/app/[locale]/(public)/contracts/[token]/page.tsx`
- Create: `apps/app/src/app/[locale]/(public)/contracts/[token]/layout.tsx`
- Modify: `apps/app/src/components/contract/contract-builder/toolbar.tsx` (Preview button)
- Modify: `apps/app/src/lib/contract-store.ts` (preview action)

### Step 1: Create public contract page layout

```tsx
// layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contract Preview | Bu Finance',
  robots: { index: false, follow: false },
}

export default function ContractPublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
```

### Step 2: Create public contract page (server component)

```tsx
// page.tsx
import { verify } from '@bu/invoice/token'
import { notFound } from 'next/navigation'
import { getAgreementByToken } from '@bu/supabase/queries'
import { createClient } from '@bu/supabase/server'
import { ContractPublicView } from '@/components/contract/contracts/public/contract-public-view'

interface Props {
  params: Promise<{ token: string; locale: string }>
}

export default async function ContractPublicPage({ params }: Props) {
  const { token } = await params

  let agreementId: string
  try {
    const payload = await verify(token)
    agreementId = payload.id
  } catch {
    return notFound()
  }

  const supabase = await createClient({ admin: true })
  const agreement = await getAgreementByToken(supabase, agreementId)
  if (!agreement) return notFound()

  return <ContractPublicView agreement={agreement} token={token} />
}
```

### Step 3: Add query helper

In `packages/supabase/src/queries/index.ts` (or contracts queries file):

```ts
export async function getAgreementByToken(supabase: Client, agreementId: string) {
  const { data } = await supabase
    .from('escrow_agreements_v3')
    .select('*')
    .eq('agreement_id', agreementId)
    .single()
  return data
}
```

### Step 4: Wire Preview button

The toolbar's Preview button (`handlePreview`) should:
1. Generate a token if none exists
2. Open the public URL in a new tab (or use existing ContractPreview modal for in-app preview)

```ts
const handlePreview = async () => {
  if (nodes.length === 0) return
  // For drafts not yet saved — use in-app modal preview
  setPreviewOpen(true)
  // For saved contracts — could open public URL:
  // window.open(`/contracts/${token}`, '_blank')
}
```

### Step 5: Commit

```
feat(contracts): add public token-based contract preview page
```

---

## Task 7: Wire Settings Panel + Verify All Toolbar Buttons

**Files:**
- Verify: `apps/app/src/components/contract/contract-builder/settings-panel.tsx`
- Verify: `apps/app/src/components/contract/contract-builder/ai-assist-panel.tsx`
- Modify: `apps/app/src/components/contract/contract-builder/index.tsx`

### Step 1: Verify all toolbar button → store → panel wiring

Check that each button in toolbar correctly triggers its panel:

| Button | Store Action | Panel Component | Status |
|--------|-------------|-----------------|--------|
| Templates | `setPanel('new')` | `TemplateSelector` | ✅ Works via `?panel=new` |
| Preview | `setPreviewOpen(true)` | `ContractPreview` | ✅ Already wired |
| AI Assist | `setAiAssistOpen(true)` | `AiAssistPanel` | ✅ Already wired |
| Settings | `setSettingsOpen(true)` | `SettingsPanel` | ✅ Already wired |
| Save | `saveContract()` | N/A | ✅ Already wired |
| Deploy | `setIsDeployModalOpen(true)` | `DeployModal` | ✅ Already wired |

### Step 2: Verify keyboard shortcuts work

In `index.tsx`, the keyboard shortcuts should match:

| Shortcut | Action | Status |
|----------|--------|--------|
| `Cmd+Z` | Undo | ✅ |
| `Cmd+Shift+Z` | Redo | ✅ |
| `Cmd+S` | Save | ✅ |
| `Cmd+P` | Preview | ✅ |

### Step 3: Ensure ContractPreview, SettingsPanel, AiAssistPanel are rendered

In `index.tsx`, verify these are present at the bottom of the component:

```tsx
<ContractPreview />
<SettingsPanel />
<AiAssistPanel />
```

### Step 4: Commit

```
fix(contracts): verify all toolbar buttons and keyboard shortcuts are wired
```

---

## Dependency Graph

```
Task 1 (Legend)       — independent, quick UI
Task 2 (Service)      — independent, backend
Task 3 (API Route)    — depends on Task 2
Task 4 (AI Assist)    — depends on Task 3
Task 5 (Build With AI) — depends on Task 3
Task 6 (Preview Page) — independent
Task 7 (Wiring Verify) — after all others
```

**Parallelizable:** Tasks 1, 2, and 6 can run simultaneously.
**Sequential:** 2 → 3 → (4 + 5 in parallel) → 7

---

## Testing Strategy

- **Task 2:** Unit test the Zod schemas with sample inputs; mock `generateText` to verify prompt construction
- **Task 3:** Integration test the API route with auth mocking
- **Task 4-5:** Manual testing — open builder, use AI assist, verify nodes appear on canvas
- **Task 6:** Manual testing — generate token, visit public URL, verify read-only view
- **Task 7:** Smoke test all toolbar buttons + keyboard shortcuts

---

## Notes

- **Fallback chain:** Template match (primary) → Scratch generation (fallback) → Local analysis (emergency fallback)
- **Rate limiting:** All AI endpoints use the `ai` rate limiter tier
- **Observability:** All `generateText` calls include `aiTelemetryConfig` for Langfuse tracing
- **Model:** Claude Sonnet for balanced speed/quality. Can upgrade to Opus for complex contracts.
- **Token system:** Reuses existing `@bu/invoice/token` JWT infrastructure — no new deps
