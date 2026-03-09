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
        return { action: 'addNode' as const, ...args, nodeId: `${args.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }
      },
    }),

    updateNode: tool({
      description:
        'Update data on an existing node. Use this to change names, amounts, descriptions, etc. Reference nodes by their ID.',
      inputSchema: updateNodeSchema,
      execute: async (args) => {
        return { action: 'updateNode' as const, ...args }
      },
    }),

    removeNode: tool({
      description:
        'Remove a node from the canvas. All connected edges are also removed. Use when the user asks to delete something.',
      inputSchema: removeNodeSchema,
      execute: async (args) => {
        return { action: 'removeNode' as const, ...args }
      },
    }),

    connectNodes: tool({
      description:
        'Create an edge between two nodes. Use right→left for horizontal flow, bottom→top for vertical. Connects the contract flow logic.',
      inputSchema: connectNodesSchema,
      execute: async (args) => {
        return { action: 'connectNodes' as const, ...args }
      },
    }),

    clearCanvas: tool({
      description:
        'Remove ALL nodes and edges from the canvas. Only use when the user explicitly asks to start over or clear everything.',
      inputSchema: clearCanvasSchema,
      execute: async (args) => {
        return { action: 'clearCanvas' as const, ...args }
      },
    }),

    layoutNodes: tool({
      description:
        'Rearrange all nodes on the canvas. Use "flow" for left-to-right pipeline, "grid" for even spacing, "tree" for hierarchical.',
      inputSchema: layoutNodesSchema,
      execute: async (args) => {
        return { action: 'layoutNodes' as const, ...args }
      },
    }),
  }
}
