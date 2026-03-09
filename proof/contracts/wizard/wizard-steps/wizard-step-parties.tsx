'use client'

import { Input } from '@bu/ui/input'
import { Label } from '@bu/ui/label'
import { Button } from '@bu/ui/button'
import { Building2, User, Plus, Trash2 } from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { useContractStore } from '@/lib/contract-store'
import type { ContractNode } from '@bu/contracts/contract-flow'
import { v4 as uuid } from 'uuid'

export function WizardStepParties() {
  const nodes = useContractStore((s) => s.nodes)
  const addNode = useContractStore((s) => s.addNode)
  const updateNodeData = useContractStore((s) => s.updateNodeData)
  const removeNode = useContractStore((s) => s.removeNode)

  const payers = nodes.filter((n) => n.type === 'party-payer')
  const payees = nodes.filter((n) => n.type === 'party-payee')

  const addParty = (role: 'payer' | 'payee') => {
    const type = role === 'payer' ? 'party-payer' : 'party-payee'
    const node: ContractNode = {
      id: uuid(),
      type,
      position: { x: 0, y: 0 },
      data: {
        label: role === 'payer' ? 'Payer' : 'Payee',
        name: '',
        email: '',
        role,
      },
    }
    addNode(node)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-darkText dark:text-whiteDanis">
          Contract Parties
        </h2>
        <p className="mt-1 text-sm text-purpleDanis">
          Define who is paying and who is receiving payment in this contract.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Payer column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
              <Building2 className="h-4 w-4 text-purpleDanis" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-purpleDanis">
              Payer
            </h3>
          </div>

          {payers.map((node) => (
            <PartyCard
              key={node.id}
              node={node}
              isPayer
              onUpdate={updateNodeData}
              onRemove={removeNode}
            />
          ))}

          {payers.length === 0 && (
            <Button
              variant="glass"
              onClick={() => addParty('payer')}
              className="w-full border-dashed border-borderFine dark:border-darkBorder text-purpleDanis hover:text-purpleDanis hover:border-purpleDanis"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Payer
            </Button>
          )}
        </div>

        {/* Payee column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950">
              <User className="h-4 w-4 text-vverde" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-vverde">
              Payee
            </h3>
          </div>

          {payees.map((node) => (
            <PartyCard
              key={node.id}
              node={node}
              isPayer={false}
              onUpdate={updateNodeData}
              onRemove={removeNode}
            />
          ))}

          {payees.length === 0 && (
            <Button
              variant="glass"
              onClick={() => addParty('payee')}
              className="w-full border-dashed border-borderFine dark:border-darkBorder text-purpleDanis hover:text-vverde hover:border-vverde"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Payee
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function PartyCard({
  node,
  isPayer,
  onUpdate,
  onRemove,
}: {
  node: ContractNode
  isPayer: boolean
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onRemove: (id: string) => void
}) {
  const data = node.data as { name?: string; email?: string; walletAddress?: string }

  return (
    <div
      className={cn(
        'rounded-xl border-2 p-4 space-y-3',
        isPayer
          ? 'border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/30'
          : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30',
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            isPayer ? 'text-purpleDanis' : 'text-vverde',
          )}
        >
          {isPayer ? 'Payer Details' : 'Payee Details'}
        </span>
        <button
          type="button"
          onClick={() => onRemove(node.id)}
          className="text-purpleDanis hover:text-rojo transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-xs text-purpleDanis">Name</Label>
          <Input
            value={data.name ?? ''}
            onChange={(e) => onUpdate(node.id, { name: e.target.value })}
            placeholder="Full name or company"
            className="mt-1 border-borderFine dark:border-darkBorder"
          />
        </div>
        <div>
          <Label className="text-xs text-purpleDanis">Email</Label>
          <Input
            value={data.email ?? ''}
            onChange={(e) => onUpdate(node.id, { email: e.target.value })}
            placeholder="email@example.com"
            className="mt-1 border-borderFine dark:border-darkBorder"
          />
        </div>
        <div>
          <Label className="text-xs text-purpleDanis">Wallet Address (optional)</Label>
          <Input
            value={data.walletAddress ?? ''}
            onChange={(e) => onUpdate(node.id, { walletAddress: e.target.value })}
            placeholder="0x..."
            className="mt-1 border-borderFine dark:border-darkBorder font-mono text-xs"
          />
        </div>
      </div>
    </div>
  )
}
