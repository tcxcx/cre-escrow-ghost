/**
 * @package flow/utils
 * Factory functions and helpers for creating nodes, edges, and registries.
 * Extracted from lib/contract-templates.ts (createNode, createEdge) and
 * flow-canvas.tsx (nodeTypes registry, defaultEdgeOptions).
 */

import type { Edge, NodeTypes } from '@xyflow/react'
import type { ContractNode, ContractNodeData, NodeType } from './types'

// ──────────────────────────────────────────
// Factory Functions
// ──────────────────────────────────────────

/**
 * Create a contract node with proper typing.
 * Previously defined inline in lib/contract-templates.ts
 */
export function createNode(
  id: string,
  type: NodeType,
  position: { x: number; y: number },
  data: ContractNodeData & { label: string },
): ContractNode {
  return { id, type, position, data } as ContractNode
}

/**
 * Create an edge between two nodes.
 * Previously defined inline in lib/contract-templates.ts
 */
export function createEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string,
): Edge {
  return { id, source, target, sourceHandle, targetHandle, animated: true }
}

/**
 * Generate a unique node ID with type prefix.
 */
export function generateNodeId(type: NodeType): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

// ──────────────────────────────────────────
// Edge Options
// ──────────────────────────────────────────

export const defaultEdgeOptions = {
  style: { strokeWidth: 2, stroke: 'hsl(var(--border))' },
  type: 'smoothstep',
  animated: true,
}

export const proOptions = { hideAttribution: true }

// ──────────────────────────────────────────
// Node Palette Metadata
// ──────────────────────────────────────────

export interface NodePaletteItem {
  type: NodeType
  label: string
  description: string
  category: 'parties' | 'flow' | 'financial' | 'legal' | 'compliance'
  icon: string // Lucide icon name
  color: string // Tailwind border/accent class
  defaultData: ContractNodeData & { label: string }
}

export const nodePalette: NodePaletteItem[] = [
  {
    type: 'party-payer',
    label: 'Payer',
    description: 'The party who funds the escrow',
    category: 'parties',
    icon: 'UserCircle',
    color: 'border-blue-500',
    defaultData: { label: 'Payer', name: '', email: '', role: 'payer' },
  },
  {
    type: 'party-payee',
    label: 'Payee',
    description: 'The party who receives payment',
    category: 'parties',
    icon: 'UserCircle',
    color: 'border-emerald-500',
    defaultData: { label: 'Payee', name: '', email: '', role: 'payee' },
  },
  {
    type: 'milestone',
    label: 'Milestone',
    description: 'A deliverable with AI verification',
    category: 'flow',
    icon: 'Target',
    color: 'border-[#C4A1FF]',
    defaultData: {
      label: 'New Milestone',
      title: '',
      description: '',
      amount: 0,
      currency: 'USDC',
      verificationCriteria: '',
    },
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'Branching logic (if/else)',
    category: 'flow',
    icon: 'GitBranch',
    color: 'border-amber-500',
    defaultData: {
      label: 'Condition',
      type: 'if-else',
      condition: '',
      trueLabel: 'Yes',
      falseLabel: 'No',
    },
  },
  {
    type: 'payment',
    label: 'Payment',
    description: 'Escrow release trigger',
    category: 'financial',
    icon: 'DollarSign',
    color: 'border-emerald-500',
    defaultData: {
      label: 'Payment',
      amount: 0,
      currency: 'USDC',
      triggerType: 'milestone-completion',
    },
  },
  {
    type: 'signature',
    label: 'Signature',
    description: 'On-chain signature block',
    category: 'legal',
    icon: 'PenTool',
    color: 'border-cyan-500',
    defaultData: {
      label: 'Signature',
      required: true,
      signerId: '',
      signerRole: 'payer',
    },
  },
  {
    type: 'clause',
    label: 'Clause',
    description: 'Legal clause / custom terms',
    category: 'legal',
    icon: 'FileText',
    color: 'border-zinc-500',
    defaultData: {
      label: 'Clause',
      title: '',
      content: '',
      aiGenerated: false,
    },
  },
  {
    type: 'commission',
    label: 'Commission',
    description: 'Revenue split on payments',
    category: 'financial',
    icon: 'Percent',
    color: 'border-orange-500',
    defaultData: {
      label: 'Commission',
      recipientName: '',
      recipientAddress: '',
      percentage: 0,
    },
  },
  {
    type: 'identity-verification',
    label: 'KYC / KYB',
    description: 'Identity verification gate',
    category: 'compliance',
    icon: 'Shield',
    color: 'border-rose-500',
    defaultData: {
      label: 'Identity Verification',
      verificationType: 'kyc',
      requiredFor: 'both',
      triggerPoint: 'before_signing',
      requirements: {
        kyc: {
          governmentId: true,
          selfie: true,
          proofOfAddress: false,
        },
        blockSanctioned: true,
      },
      status: {},
    },
  },
]

/**
 * Get palette item by node type.
 */
export function getPaletteItem(type: NodeType): NodePaletteItem | undefined {
  return nodePalette.find((item) => item.type === type)
}
