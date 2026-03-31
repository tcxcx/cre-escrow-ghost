'use client'

import React from "react"

import { useCallback, useRef, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  type OnNodeDrag,
  type OnSelectionChangeParams,
  useReactFlow,
  ConnectionMode,
  ConnectionLineType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useContractStore } from '@/lib/contract-store'
import type { NodeType, ContractNode } from '@repo/contract-flow'
import { defaultEdgeOptions, proOptions } from '@repo/contract-flow'
import { PartyNode } from './nodes/party-node'
import { MilestoneNode } from './nodes/milestone-node'
import { ConditionNode } from './nodes/condition-node'
import { PaymentNode } from './nodes/payment-node'
import { SignatureNode } from './nodes/signature-node'
import { ClauseNode } from './nodes/clause-node'
import { CommissionNode } from './nodes/commission-node'
import { IdentityVerificationNode } from './nodes/identity-verification-node'

const nodeTypes: NodeTypes = {
  'party-payer': PartyNode,
  'party-payee': PartyNode,
  milestone: MilestoneNode,
  condition: ConditionNode,
  payment: PaymentNode,
  signature: SignatureNode,
  clause: ClauseNode,
  commission: CommissionNode,
  'identity-verification': IdentityVerificationNode,
}

export function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedNodeId,
    setDraggingNode,
    isTemplateModalOpen,
  } = useContractStore()

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      if (selectedNodes.length === 1) {
        setSelectedNodeId(selectedNodes[0].id)
      } else if (selectedNodes.length === 0) {
        setSelectedNodeId(null)
      }
    },
    [setSelectedNodeId]
  )

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: ContractNode) => {
      setSelectedNodeId(node.id)
    },
    [setSelectedNodeId]
  )

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [setSelectedNodeId])

  const handleNodeDragStart: OnNodeDrag = useCallback(() => {
    setDraggingNode(true)
  }, [setDraggingNode])

  const handleNodeDragStop: OnNodeDrag = useCallback(() => {
    setDraggingNode(false)
  }, [setDraggingNode])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      if (!reactFlowWrapper.current) return

      const type = event.dataTransfer.getData('application/reactflow') as NodeType
      if (!type) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const nodeDefaults = getNodeDefaults(type)
      const newNode: ContractNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: nodeDefaults,
      }

      addNode(newNode)
    },
    [addNode, screenToFlowPosition]
  )

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const nodeClassName = useCallback((node: ContractNode) => {
    const baseClasses = 'transition-shadow duration-200'
    const typeClasses: Record<NodeType, string> = {
      'party-payer': 'shadow-blue-500/20',
      'party-payee': 'shadow-emerald-500/20',
      milestone: 'shadow-purple-500/20',
      condition: 'shadow-amber-500/20',
      payment: 'shadow-emerald-500/20',
      signature: 'shadow-blue-500/20',
      clause: 'shadow-zinc-500/20',
      commission: 'shadow-yellow-500/20',
    }
    return `${baseClasses} ${typeClasses[node.type as NodeType] || ''}`
  }, [])

  const miniMapNodeColor = useCallback((node: ContractNode) => {
    const colors: Record<NodeType, string> = {
      'party-payer': '#3b82f6',
      'party-payee': '#22c55e',
      milestone: '#8b5cf6',
      condition: '#f59e0b',
      payment: '#22c55e',
      signature: '#3b82f6',
      clause: '#71717a',
      commission: '#eab308',
    }
    return colors[node.type as NodeType] || '#71717a'
  }, [])

  // If template modal is open or no nodes, show empty state
  const showEmptyState = nodes.length === 0 && !isTemplateModalOpen

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={handleSelectionChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={proOptions}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        className="bg-background"
        getNodeClassName={nodeClassName}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ strokeWidth: 2, stroke: 'hsl(var(--primary))' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="hsl(var(--muted-foreground) / 0.15)"
        />
        <Controls 
          className="!bg-card !border-border !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted"
        />
        <MiniMap
          className="!bg-card !border-border !shadow-lg"
          nodeColor={miniMapNodeColor}
          maskColor="hsl(var(--background) / 0.8)"
        />
      </ReactFlow>

      {/* Connection hint overlay - positioned higher on mobile to avoid floating toolbar */}
      {nodes.length > 0 && edges.length === 0 && (
        <div className="absolute bottom-28 md:bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-card/90 border border-border shadow-lg max-w-[90vw]">
          <p className="text-sm text-muted-foreground text-center">
            <span className="text-foreground font-medium">Tip:</span> Drag from a node handle to another to create connections
          </p>
        </div>
      )}
    </div>
  )
}

function getNodeDefaults(type: NodeType): ContractNode['data'] {
  const defaults: Record<NodeType, ContractNode['data']> = {
    'party-payer': {
      label: 'Client / Payer',
      name: '',
      email: '',
      role: 'payer',
    },
    'party-payee': {
      label: 'Provider / Payee',
      name: '',
      email: '',
      role: 'payee',
    },
    milestone: {
      label: 'New Milestone',
      title: '',
      description: '',
      amount: 0,
      currency: 'USDC',
      verificationCriteria: '',
    },
    condition: {
      label: 'Condition',
      type: 'if-else',
      condition: '',
      trueLabel: 'Yes',
      falseLabel: 'No',
    },
    payment: {
      label: 'Payment Release',
      amount: 0,
      currency: 'USDC',
      triggerType: 'milestone-completion',
    },
    signature: {
      label: 'Signature Required',
      required: true,
      signerId: '',
      signerRole: 'payer',
    },
    clause: {
      label: 'Contract Clause',
      title: '',
      content: '',
      aiGenerated: false,
    },
    commission: {
      label: 'Commission Split',
      recipientName: '',
      recipientAddress: '',
      percentage: 5,
    },
  }

  return defaults[type]
}
