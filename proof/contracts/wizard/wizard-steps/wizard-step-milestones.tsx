'use client'

import { Input } from '@bu/ui/input'
import { Label } from '@bu/ui/label'
import { Button } from '@bu/ui/button'
import { Textarea } from '@bu/ui/textarea'
import { Target, Plus, Trash2, DollarSign } from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { useContractStore } from '@/lib/contract-store'
import type { ContractNode } from '@bu/contracts/contract-flow'
import { v4 as uuid } from 'uuid'

export function WizardStepMilestones() {
  const nodes = useContractStore((s) => s.nodes)
  const addNode = useContractStore((s) => s.addNode)
  const updateNodeData = useContractStore((s) => s.updateNodeData)
  const removeNode = useContractStore((s) => s.removeNode)
  const settings = useContractStore((s) => s.settings)

  const milestones = nodes.filter((n) => n.type === 'milestone')
  const totalAllocated = milestones.reduce((sum, n) => {
    const data = n.data as { amount?: number }
    return sum + (data.amount ?? 0)
  }, 0)

  const addMilestone = () => {
    const node: ContractNode = {
      id: uuid(),
      type: 'milestone',
      position: { x: 0, y: 0 },
      data: {
        label: `Milestone ${milestones.length + 1}`,
        title: '',
        description: '',
        amount: 0,
        currency: settings.currency || 'USDC',
        verificationCriteria: '',
      },
    }
    addNode(node)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-darkText dark:text-whiteDanis">
            Milestones
          </h2>
          <p className="mt-1 text-sm text-purpleDanis">
            Break the contract into deliverable milestones with amounts and verification criteria.
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-purpleDanis">Total Allocated</p>
          <p className="text-lg font-semibold text-purpleDanis">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
            }).format(totalAllocated)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {milestones.map((node, index) => (
          <MilestoneCard
            key={node.id}
            node={node}
            index={index}
            onUpdate={updateNodeData}
            onRemove={removeNode}
          />
        ))}

        <Button
          variant="glass"
          onClick={addMilestone}
          className="w-full border-dashed border-borderFine dark:border-darkBorder text-purpleDanis hover:text-purpleDanis hover:border-purpleDanis"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Milestone
        </Button>
      </div>
    </div>
  )
}

function MilestoneCard({
  node,
  index,
  onUpdate,
  onRemove,
}: {
  node: ContractNode
  index: number
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onRemove: (id: string) => void
}) {
  const data = node.data as {
    title?: string
    description?: string
    amount?: number
    verificationCriteria?: string
    dueDate?: string
  }

  return (
    <div className="rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900">
            <Target className="h-3.5 w-3.5 text-purpleDanis" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purpleDanis">
            Milestone {index + 1}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRemove(node.id)}
          className="text-purpleDanis hover:text-rojo transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs text-purpleDanis">Title</Label>
          <Input
            value={data.title ?? ''}
            onChange={(e) => onUpdate(node.id, { title: e.target.value })}
            placeholder="e.g. Design Mockups"
            className="mt-1 border-borderFine dark:border-darkBorder"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Label className="text-xs text-purpleDanis">Amount</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-purpleDanis" />
              <Input
                type="number"
                value={data.amount ?? 0}
                onChange={(e) => onUpdate(node.id, { amount: Number(e.target.value) || 0 })}
                className="pl-8 border-borderFine dark:border-darkBorder"
              />
            </div>
          </div>
          <div className="w-32">
            <Label className="text-xs text-purpleDanis">Due Date</Label>
            <Input
              type="date"
              value={data.dueDate ?? ''}
              onChange={(e) => onUpdate(node.id, { dueDate: e.target.value })}
              className="mt-1 border-borderFine dark:border-darkBorder"
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs text-purpleDanis">Description</Label>
        <Textarea
          value={data.description ?? ''}
          onChange={(e) => onUpdate(node.id, { description: e.target.value })}
          placeholder="What needs to be delivered..."
          rows={2}
          className="mt-1 border-borderFine dark:border-darkBorder resize-none"
        />
      </div>

      <div>
        <Label className="text-xs text-purpleDanis">Verification Criteria</Label>
        <Textarea
          value={data.verificationCriteria ?? ''}
          onChange={(e) => onUpdate(node.id, { verificationCriteria: e.target.value })}
          placeholder="How will this milestone be verified..."
          rows={2}
          className="mt-1 border-borderFine dark:border-darkBorder resize-none"
        />
      </div>
    </div>
  )
}
