import { streamText } from 'ai'
import { getContractCanvasTools } from '../tools/contract-canvas'
import { aiTelemetryConfig } from '../observe'

// ── Types ───────────────────────────────────────────────

export interface CanvasContext {
  contractName: string
  nodes: Array<{ id: string; type: string; label: string; data: Record<string, unknown> }>
  edges: Array<{ id: string; source: string; target: string }>
  settings: { chain: string; currency: string; totalAmount: number }
}

export interface ContractAssistParams {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  canvasContext: CanvasContext
  teamId: string
  userId: string
}

// ── Node type reference (for system prompt) ─────────────

const NODE_TYPE_REFERENCE = `
## Available Node Types

- **party-payer**: A paying party. Data: { name, email, walletAddress? }
- **party-payee**: A receiving party. Data: { name, email, walletAddress? }
- **milestone**: A deliverable checkpoint. Data: { title, description, amount?, dueDate? }
- **condition**: A conditional gate in the flow. Data: { condition, description }
- **payment**: A payment step. Data: { amount, currency, recipient?, schedule? }
- **signature**: A signature requirement. Data: { signer, role? }
- **clause**: A legal/custom clause. Data: { title, text }
- **commission**: A commission/fee split. Data: { recipient, percentage, description? }
- **identity-verification**: A KYC/identity check. Data: { verifier?, method? }
`.trim()

// ── System prompt builder ───────────────────────────────

function buildSystemPrompt(ctx: CanvasContext): string {
  const nodesSection =
    ctx.nodes.length > 0
      ? ctx.nodes
          .map(
            (n) =>
              `  - [${n.id}] type="${n.type}" label="${n.label}" data=${JSON.stringify(n.data)}`
          )
          .join('\n')
      : '  (empty canvas)'

  const edgesSection =
    ctx.edges.length > 0
      ? ctx.edges.map((e) => `  - ${e.source} → ${e.target}`).join('\n')
      : '  (no connections)'

  return `You are the AI contract builder assistant for Bu Finance. You help users create, modify, and refine smart contract agreements by manipulating nodes on a visual canvas.

## Current Canvas State

Contract: "${ctx.contractName || 'Untitled Contract'}"
Chain: ${ctx.settings.chain || 'Not set'}
Currency: ${ctx.settings.currency || 'USDC'}
Total Amount: ${ctx.settings.totalAmount || 0}

### Nodes
${nodesSection}

### Edges (flow connections)
${edgesSection}

${NODE_TYPE_REFERENCE}

## Rules

1. **Use tools to manipulate the canvas.** When the user asks to add, update, remove, or connect nodes, call the appropriate tool. Always explain what you're doing in your text response.
2. **Auto-generate sensible defaults.** When adding nodes, fill in reasonable default data based on context. For example, if the user says "add a milestone for design review worth $500", set title="Design Review", amount=500.
3. **Connect nodes in flow order.** After adding nodes, connect them logically — payer → milestone → condition → payment → signature → payee is a typical flow. Use connectNodes to wire them up.
4. **Be concise but helpful.** Explain what you changed and suggest next steps. Don't repeat the entire canvas state back to the user.
5. **Respect existing nodes.** When updating, reference nodes by their ID. Don't recreate nodes that already exist — update them instead.
6. **Ask for clarification** when the user's intent is ambiguous (e.g., "add a payment" without specifying amount or recipient).
7. **Layout after bulk changes.** If you add 3+ nodes at once, call layoutNodes with pattern "flow" to keep the canvas tidy.`
}

// ── Streaming service ───────────────────────────────────

/** @internal Return type is opaque — consumers call `.toDataStreamResponse()` */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createContractAssistStream(params: ContractAssistParams): any {
  const { messages, canvasContext, teamId, userId } = params

  return streamText({
    model: 'anthropic/claude-sonnet-4-5' as any,
    system: buildSystemPrompt(canvasContext),
    messages: messages as any,
    tools: getContractCanvasTools(),
    maxOutputTokens: 4096,
    experimental_telemetry: aiTelemetryConfig('contract-assist', {
      userId,
      entityId: teamId,
      surface: 'app-api',
      trigger: 'user',
    }),
  })
}
