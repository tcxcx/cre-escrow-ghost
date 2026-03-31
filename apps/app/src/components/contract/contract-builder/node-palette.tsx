'use client'

import React from "react"

import { type DragEvent } from 'react'
import {
  Building2,
  User,
  Target,
  GitBranch,
  Banknote,
  PenLine,
  FileText,
  Percent,
  GripVertical,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { useContractStore } from '@/lib/contract-store'
import type { NodeType } from '@bu/contracts/contract-flow'

interface NodePaletteItemProps {
  type: NodeType
  label: string
  description: string
  icon: React.ElementType
  colorClass: string
  isMissing?: boolean
}

const nodeItems: NodePaletteItemProps[] = [
  {
    type: 'party-payer',
    label: 'Payer',
    description: 'Client or buyer',
    icon: Building2,
    colorClass: 'bg-violet-100 dark:bg-violet-900 border-borderFine text-purpleDanis hover:bg-violet-200 dark:hover:bg-violet-800 hover:border-violeta',
  },
  {
    type: 'party-payee',
    label: 'Payee',
    description: 'Provider or seller',
    icon: User,
    colorClass: 'bg-emerald-100 dark:bg-emerald-900 border-borderFine text-vverde hover:bg-emerald-200 dark:hover:bg-emerald-800 hover:border-vverde',
  },
  {
    type: 'milestone',
    label: 'Milestone',
    description: 'Deliverable checkpoint',
    icon: Target,
    colorClass: 'bg-violet-100 dark:bg-violet-900 border-borderFine text-purpleDanis dark:text-violeta hover:bg-violet-200 dark:hover:bg-violet-800 hover:border-violeta',
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'If/else logic branch',
    icon: GitBranch,
    colorClass: 'bg-amber-100 dark:bg-amber-900 border-borderFine text-amarillo hover:bg-amber-200 dark:hover:bg-amber-800 hover:border-amarillo',
  },
  {
    type: 'payment',
    label: 'Payment',
    description: 'Release funds',
    icon: Banknote,
    colorClass: 'bg-emerald-100 dark:bg-emerald-900 border-borderFine text-vverde hover:bg-emerald-200 dark:hover:bg-emerald-800 hover:border-vverde',
  },
  {
    type: 'signature',
    label: 'Signature',
    description: 'eSignature capture',
    icon: PenLine,
    colorClass: 'bg-violet-100 dark:bg-violet-900 border-borderFine text-purpleDanis hover:bg-violet-200 dark:hover:bg-violet-800 hover:border-violeta',
  },
  {
    type: 'clause',
    label: 'Clause',
    description: 'Legal text block',
    icon: FileText,
    colorClass: 'bg-violet-50 dark:bg-violet-950 border-borderFine text-purpleDanis dark:text-lila hover:bg-violet-100 dark:hover:bg-violet-900 hover:border-lila',
  },
  {
    type: 'commission',
    label: 'Commission',
    description: 'Third-party split',
    icon: Percent,
    colorClass: 'bg-pink-100 dark:bg-pink-900 border-borderFine text-belanova hover:bg-pink-200 dark:hover:bg-pink-800 hover:border-belanova',
  },
  {
    type: 'identity-verification',
    label: 'KYC / KYB',
    description: 'Identity verification',
    icon: ShieldCheck,
    colorClass: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50',
  },
]

function NodePaletteItem({ type, label, description, icon: Icon, colorClass, isMissing }: NodePaletteItemProps) {
  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, type)}
      className={cn(
        'relative flex items-center gap-3 p-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all duration-200',
        colorClass,
        isMissing && 'ring-2 ring-red-500/50 animate-pulse'
      )}
    >
      {isMissing && (
        <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white">
          <AlertCircle className="w-3 h-3" />
        </div>
      )}
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-background/50">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground truncate">
          {isMissing ? <span className="text-red-400">Required - drag to canvas</span> : description}
        </p>
      </div>
      <GripVertical className="w-4 h-4 text-muted-foreground/50" />
    </div>
  )
}

export function NodePalette() {
  const { missingNodeTypes, nodes } = useContractStore()
  
  // Sort nodes to show missing ones first
  const sortedNodeItems = [...nodeItems].sort((a, b) => {
    const aMissing = missingNodeTypes?.includes(a.type)
    const bMissing = missingNodeTypes?.includes(b.type)
    if (aMissing && !bMissing) return -1
    if (!aMissing && bMissing) return 1
    return 0
  })
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Node Palette</h2>
        <p className="text-xs text-muted-foreground mt-1">Drag nodes onto the canvas</p>
        {missingNodeTypes?.length > 0 && nodes?.length > 0 && (
          <div className="mt-2 p-2 rounded-md bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400 font-medium">
              {missingNodeTypes?.length} required node(s) missing
            </p>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-2">
          {sortedNodeItems.map((item) => (
            <NodePaletteItem 
              key={item.type} 
              {...item} 
              isMissing={missingNodeTypes?.includes(item.type) && nodes?.length > 0}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
