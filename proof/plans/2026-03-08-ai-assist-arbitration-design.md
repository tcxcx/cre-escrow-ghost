# AI Assist Canvas Wiring + Arbitration Model Selection — Design

## 1. AI Assist Panel → Canvas (Tool-Calling Chat)

### Goal
Wire the AI Assist panel to manipulate the React Flow canvas in real-time via AI SDK v6 tool calling. The AI has full autonomy: add/remove/update nodes, create connections, clear canvas. User can always undo.

### Architecture

```
User types in AI Assist panel
  → POST /api/contracts/ai-assist (streaming)
    → @bu/intelligence contract-assist.service.ts
      → streamText() with canvas-manipulation tools
        → tool calls returned as stream parts
  → Frontend intercepts tool calls
    → Executes store actions (addNode, removeNode, updateNodeData, onConnect, clearCanvas)
    → Shows AI text response in chat
```

### Data Flow

1. **Frontend sends**: user message + current canvas context (nodes summary, edges, settings)
2. **API route**: authenticates, rate-limits, delegates to intelligence service
3. **Intelligence service**: `streamText()` with system prompt describing canvas state + available tools
4. **Tool definitions** (6 tools):
   - `addNode` — type, label, data, position (auto-layout if omitted)
   - `updateNode` — nodeId, partial data to merge
   - `removeNode` — nodeId
   - `connectNodes` — sourceId, targetId, sourceHandle?, targetHandle?
   - `clearCanvas` — no params, full reset
   - `layoutNodes` — rearrange all nodes in grid/tree pattern
5. **Stream response**: text chunks + tool call results interleaved
6. **Frontend**: `useChat()` hook processes stream, executes tool calls against Zustand store

### System Prompt Strategy

The system prompt includes:
- Role: "You are an AI contract building assistant for Bu Finance"
- Current canvas state: serialized node list with types, labels, IDs, and key data fields
- Contract settings: chain, currency, total amount
- Available node types and their required fields (from contract-flow types)
- Instructions: use tools to manipulate canvas, explain what you're doing in text

Canvas state is rebuilt on every message (not cached) to ensure consistency.

### Key Files

| File | Action | Purpose |
|------|--------|---------|
| `packages/intelligence/src/services/contract-assist.service.ts` | Create | AI service with tools + streaming |
| `packages/intelligence/src/tools/contract-canvas.ts` | Create | Tool definitions (6 tools) |
| `apps/app/src/app/api/contracts/ai-assist/route.ts` | Create | API route (POST, streaming) |
| `apps/app/src/components/contract/contract-builder/ai-assist-panel.tsx` | Modify | Replace simulated chat with real `useChat()` |
| `packages/intelligence/src/index.ts` | Modify | Export new service |

### Tool Schemas (Zod v4)

```typescript
// addNode tool
z.object({
  type: z.enum(['party-payer', 'party-payee', 'milestone', 'condition', 'payment', 'signature', 'clause', 'commission', 'identity-verification']),
  label: z.string().describe('Display label for the node'),
  data: z.record(z.string(), z.unknown()).describe('Node-specific data fields'),
  position: z.object({ x: z.number(), y: z.number() }).optional().describe('Canvas position, auto-layout if omitted'),
})

// updateNode tool
z.object({
  nodeId: z.string().describe('ID of the node to update'),
  data: z.record(z.string(), z.unknown()).describe('Partial data to merge'),
})

// removeNode tool
z.object({
  nodeId: z.string().describe('ID of the node to remove'),
})

// connectNodes tool
z.object({
  sourceId: z.string(),
  targetId: z.string(),
  sourceHandle: z.enum(['right', 'bottom']).optional().default('right'),
  targetHandle: z.enum(['left', 'top']).optional().default('left'),
})

// clearCanvas — no params
z.object({})

// layoutNodes — rearrange
z.object({
  pattern: z.enum(['grid', 'tree', 'flow']).default('flow'),
})
```

### Frontend Integration

Replace the simulated chat in `ai-assist-panel.tsx` with AI SDK's `useChat()`:

```typescript
const { messages, input, handleInputChange, handleSubmit } = useChat({
  api: '/api/contracts/ai-assist',
  body: {
    canvasContext: serializeCanvasState(nodes, edges, settings),
  },
  onToolCall: ({ toolCall }) => {
    // Execute against Zustand store
    switch (toolCall.toolName) {
      case 'addNode': return addNode(buildNodeFromToolCall(toolCall.args))
      case 'updateNode': return updateNodeData(toolCall.args.nodeId, toolCall.args.data)
      case 'removeNode': return removeNode(toolCall.args.nodeId)
      case 'connectNodes': return onConnect(buildConnection(toolCall.args))
      case 'clearCanvas': return clearCanvas()
      case 'layoutNodes': return autoLayout(toolCall.args.pattern)
    }
  },
})
```

### Error Handling

- If AI references a nodeId that doesn't exist: ignore the tool call, AI sees error in next turn
- If canvas is empty and AI tries to update/remove: tool returns error message
- Rate limit: 20 requests/minute per user (same tier as chat)
- Token budget: `maxOutputTokens: 4096` per response

---

## 2. Arbitration Model Selection (User "Lawyer" Picks)

### Goal
Let each contract party choose their preferred LLM model for the L2 Advocate layer. Tribunal (L3) and Supreme Court (L4) remain neutral with auto-selected models. PDF evidence pipeline uses hardcoded best-in-class model.

### Architecture

```
Contract Settings (per-agreement)
  └─ payerAdvocateModel: "anthropic/claude-sonnet-4-5"
  └─ payeeAdvocateModel: "openai/gpt-4o"

Dispute triggered →
  L1: Verifier (hardcoded: claude-sonnet-4-5)
  L2: Advocates
    ├─ Pro-Client Advocate → payerAdvocateModel
    └─ Pro-Provider Advocate → payeeAdvocateModel
  L3: Tribunal (3 neutral models, auto-selected, excludes L2 models)
  L4: Supreme Court (5 neutral models, excludes L3 models)
```

### Available Models (Curated List)

| Display Name | Gateway Model ID | Cost Tier | Personality |
|---|---|---|---|
| Claude Sonnet | `anthropic/claude-sonnet-4-5` | $$ | Precise, balanced reasoning |
| GPT-4o | `openai/gpt-4o` | $$ | Broad knowledge, persuasive |
| Gemini Flash | `google/gemini-2.0-flash` | $ | Fast, analytical |
| Grok | `xai/grok-4-fast` | $$ | Direct, unconventional |
| DeepSeek V3 | `fireworks/deepseek-v3` | $ | Strong logic chains |

### Model Pool for Neutral Layers

Full pool (L3 picks 3, L4 picks 5, no overlap with L2 or each other):

```typescript
const NEUTRAL_MODEL_POOL = [
  'anthropic/claude-sonnet-4-5',
  'anthropic/claude-opus-4-5',
  'openai/gpt-4o',
  'openai/gpt-5-mini',
  'google/gemini-2.0-flash',
  'xai/grok-4-fast',
  'fireworks/deepseek-v3',
  'fireworks/llama-v3p3-70b-instruct',
  'mistral/mistral-large-latest',
]
```

Selection algorithm:
1. Remove both L2 advocate models from pool
2. L3: pick 3 from remaining (round-robin by provider to ensure diversity)
3. Remove L3 models from pool
4. L4: pick 5 from remaining (if <5 available, allow same provider different model)

### Key Files

| File | Action | Purpose |
|------|--------|---------|
| `packages/contracts/src/contract-flow/types.ts` | Modify | Add `advocateModels` to `ContractSettings` |
| `packages/intelligence/src/arbitration/config.ts` | Modify | `buildArbitrationConfig(payerModel, payeeModel)` |
| `packages/intelligence/src/arbitration/models.ts` | Create | Model pool, selection algorithm, curated list |
| `packages/intelligence/src/arbitration/layer2-advocates.ts` | Modify | Read model from config (not hardcoded) |
| `packages/intelligence/src/arbitration/layer3-tribunal.ts` | Modify | Dynamic model selection excluding L2 |
| `packages/intelligence/src/arbitration/layer4-supreme-court.ts` | Modify | Dynamic model selection excluding L3 |
| `apps/app/src/components/contract/contract-builder/settings-panel.tsx` | Modify | Model picker UI for each party |

### ContractSettings Change

```typescript
export interface ContractSettings {
  yieldStrategy: YieldStrategy
  chain: 'ethereum' | 'polygon' | 'arbitrum' | 'base'
  totalAmount: number
  currency: string
  commissions: { recipient: string; percentage: number }[]
  // NEW
  advocateModels: {
    payer: string  // Gateway model ID, e.g. "anthropic/claude-sonnet-4-5"
    payee: string  // Gateway model ID
  }
}
```

Default: both `anthropic/claude-sonnet-4-5` (current behavior, zero breaking change).

### UI: Settings Panel Model Picker

In the contract builder Settings panel, add a "Dispute Resolution" section:
- "Payer's AI Advocate" — dropdown with model list + personality description
- "Payee's AI Advocate" — dropdown with model list + personality description
- Info text: "Tribunal judges are automatically selected for neutrality"
- Cost indicator per model ($ / $$ / $$$)

### PDF Evidence Pipeline

No changes needed. The existing `@bu/intelligence/documents` pipeline handles extraction. L1 Verifier receives extracted text as structured input. Model stays hardcoded as `claude-sonnet-4-5` (best document understanding).

---

## 3. Vercel AI Gateway Integration

### Current State
The gateway in `packages/intelligence/src/arbitration/gateway.ts` already uses the `provider/model` format. It calls `generateText()` with model strings like `"anthropic/claude-sonnet-4-5"`.

### What Changes
Add `providerOptions.gateway` for fallback routing:

```typescript
const { output } = await generateText({
  model: modelId,  // e.g. "anthropic/claude-sonnet-4-5"
  system: systemPrompt,
  prompt: userPrompt,
  output: Output.object({ schema }),
  providerOptions: {
    gateway: {
      // If primary provider fails, try alternatives
      models: getFallbackModels(modelId),
    },
  },
})
```

Fallback mapping per provider:
- `anthropic/*` → fallback to `bedrock/anthropic.*`
- `openai/*` → fallback to `azure/openai.*`
- `google/*` → fallback to `vertex/google.*`

This is transparent — same model, different provider routing.

### Environment

Already configured: `AI_GATEWAY_API_KEY` exists in `.env.local` (line 113).

---

## Non-Goals (YAGNI)

- Custom user prompts for advocates (too complex, legal liability)
- Real-time model cost tracking in UI (Langfuse handles this)
- A/B testing framework for prompts (future, not needed now)
- User selection of L3/L4 models (compromises neutrality)
- Custom model fine-tuning (out of scope)
