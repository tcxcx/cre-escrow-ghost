'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, FileText, Pencil, BarChart3, ChevronLeft, ChevronRight, Zap, CheckCircle2, Lock, PenLine, AlertTriangle } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { WidgetEmptyState } from '@/components/widgets/empty-state';
import { useContractParams } from '@/hooks/use-contract-params';
import { CardHeaderPlus } from '@bu/ui/card';
import { Icons } from '@bu/ui/icons';
import { cn } from '@bu/ui/utils';
import { useProjectContracts } from '@/hooks/use-project-contracts';
import type { ProjectContract, ContractStatus } from '@/hooks/use-project-contracts';
import { getContractStatsAction } from '@/actions/contracts/get-contract-stats';

// -- Status config ----------------------------------------------------------

const STATUS_CONFIG: Record<ContractStatus, { label: string; bg: string; text: string; bar: string }> = {
  active: {
    label: 'Active',
    bg: 'bg-emerald-100 dark:bg-emerald-950/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-400',
  },
  pending: {
    label: 'Pending',
    bg: 'bg-amber-100 dark:bg-amber-950/30',
    text: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-400',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-purple-100 dark:bg-purple-950/30',
    text: 'text-purpleDanis dark:text-purple-400',
    bar: 'bg-purpleDanis',
  },
  draft: {
    label: 'Draft',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-500 dark:text-gray-400',
    bar: 'bg-gray-400',
  },
};

const STATUS_ICON: Record<ContractStatus, typeof FileText> = {
  active: FileText,
  pending: Pencil,
  completed: BarChart3,
  draft: FileText,
};

function formatBudget(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// -- Stats cards ------------------------------------------------------------

type ContractStats = {
  total: number
  active: number
  pendingSignature: number
  disputed: number
  completed: number
  totalValueLocked: number
}

const MINI_STATS = [
  { key: 'active' as const, label: 'Active', icon: Zap, color: 'text-purpleDanis', bg: 'bg-purpleDanis/10' },
  { key: 'pendingSignature' as const, label: 'Pending', icon: PenLine, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { key: 'disputed' as const, label: 'Disputes', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  { key: 'completed' as const, label: 'Done', icon: CheckCircle2, color: 'text-vverde', bg: 'bg-vverde/10' },
]

function formatTvl(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}m`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toLocaleString()}`
}

function StatsCards() {
  const [stats, setStats] = useState<ContractStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getContractStatsAction({}).then((result) => {
      if (cancelled) return
      if (result?.data) setStats(result.data)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-1.5 px-3 pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card/60 px-2 py-2 space-y-1">
            <div className="h-3 w-3 bg-muted animate-pulse rounded" />
            <div className="h-5 w-6 bg-muted animate-pulse rounded" />
            <div className="h-2.5 w-10 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (!stats || stats.total === 0) return null

  return (
    <div className="px-3 pb-2 space-y-1.5">
      {/* Mini stat pills */}
      <div className="grid grid-cols-4 gap-1.5">
        {MINI_STATS.map((s) => {
          const Icon = s.icon
          const value = stats[s.key]
          return (
            <div
              key={s.key}
              className="rounded-lg border border-border bg-card/60 px-2 py-2 space-y-0.5"
            >
              <div className={cn('inline-flex items-center justify-center w-5 h-5 rounded-md', s.bg)}>
                <Icon className={cn('w-3 h-3', s.color)} />
              </div>
              <p className="text-sm font-semibold tabular-nums text-foreground leading-tight">{value}</p>
              <p className="text-[9px] text-muted-foreground leading-tight">{s.label}</p>
            </div>
          )
        })}
      </div>

      {/* TVL banner */}
      {stats.totalValueLocked > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-2.5 py-1.5">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-amarillo" />
            <span className="text-[10px] text-muted-foreground">Total Value Locked</span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-foreground">{formatTvl(stats.totalValueLocked)}</span>
        </div>
      )}
    </div>
  )
}

// -- Contract row -----------------------------------------------------------

function ContractRow({ contract, onClick }: { contract: ProjectContract; onClick: () => void }) {
  const config = STATUS_CONFIG[contract.status];
  const Icon = STATUS_ICON[contract.status];

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center w-full rounded-lg border border-[#dad4f4] bg-white dark:bg-secondaryBlack dark:border-purple-900/30 px-2.5 py-2 transition-colors hover:bg-purple-50/50 dark:hover:bg-purple-950/20 gap-2"
    >
      {/* Icon */}
      <div className="flex items-center justify-center size-8 rounded-lg bg-purple-50 dark:bg-purple-950/20 shrink-0">
        <Icon className="size-4 text-purpleDanis" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-semibold text-foreground dark:text-white truncate leading-tight">
            {contract.name}
          </span>
          <span className={cn('text-[7px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 leading-tight', config.bg, config.text)}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <div className="flex items-center gap-1.5">
            {/* Team avatars placeholder */}
            <div className="flex -space-x-1">
              <div className="size-3 rounded-full bg-purple-300 border border-white dark:border-gray-800" />
              <div className="size-3 rounded-full bg-violet-400 border border-white dark:border-gray-800" />
            </div>
            <span className="text-[9px] text-muted-foreground truncate">{contract.teamName}</span>
            <span className="text-[9px] text-muted-foreground">
              <Icons.Currency className="inline size-2.5" />
            </span>
            <span className="text-[9px] font-medium text-muted-foreground tabular-nums">{formatBudget(contract.budget)}</span>
          </div>
          {/* Progress */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[8px] text-muted-foreground">Progress</span>
            <div className="w-12 h-[3px] rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', config.bar)}
                style={{ width: `${contract.progress}%` }}
              />
            </div>
            <span className="text-[8px] font-medium text-muted-foreground tabular-nums w-5 text-right">
              {contract.progress}%
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// -- Main widget ------------------------------------------------------------

export function ContractsWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const { contracts, isLoading, error } = useProjectContracts();
  const hasContracts = contracts.length > 0;

  const { openSheet } = useContractParams();

  const handleOpenSheet = () => openSheet();
  const handleCreateContract = () => {
    openSheet();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <CardHeaderPlus
          dashed={false}
          iconSrc="/assets/widgets/contract-widget-placeholder.png"
          iconAlt="Contracts"
          bg="yellow"
          title="Contracts"
          description="Your latest contract activity"
          largeIcon
          rightIcon={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleOpenSheet(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F6F0FF] hover:bg-violeta hover:text-white text-purpleDanis rounded-xl font-semibold text-sm transition-colors dark:fx-dark-plate dark:fx-glossy dark:hover:fx-dark-plate"
              >
                <Icons.ReceiptText className="size-4" />
                <span>View History</span>
              </button>
              <div
                className="cursor-pointer hover:bg-white p-2 dark:text-white rounded-xl bg-[#F4F4F4] dark:fx-dark-plate dark:fx-glossy dark:rounded-xl dark:hover:fx-dark-plate"
                onClick={(e) => { e.stopPropagation(); handleCreateContract(); }}
              >
                <Plus className="h-4 w-4 text-main dark:text-white" />
              </div>
            </div>
          }
          onClick={handleOpenSheet}
          className="cursor-pointer"
        />
      </div>

      {/* Stats cards — shown when contracts exist */}
      {!isLoading && !error && hasContracts && <StatsCards />}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 flex flex-col gap-1.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-purpleDanis/50" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center flex-1">
            <div className="size-16 rounded-2xl bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center">
              <FileText className="size-8 text-purpleDanis/60" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-purpleDanis">No contracts yet</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Create your first contract to track project progress and budgets.
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleCreateContract(); }}
              className="text-xs font-medium text-white bg-purpleDanis hover:bg-purpleDanis/90 px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              Create Contract
            </button>
          </div>
        ) : hasContracts ? (
          <>
            {/* Navigation hint — matching Figma arrows */}
            <div className="flex items-center justify-end gap-0.5 px-1 pb-0.5">
              <button type="button" className="size-4 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <ChevronLeft className="size-2.5 text-muted-foreground" />
              </button>
              <button type="button" className="size-4 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <ChevronRight className="size-2.5 text-muted-foreground" />
              </button>
            </div>

            {/* Contract rows */}
            {contracts.slice(0, 3).map((contract) => (
              <ContractRow
                key={contract.id}
                contract={contract}
                onClick={handleOpenSheet}
              />
            ))}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[120px]">
            <WidgetEmptyState type="contracts" onAction={handleCreateContract} />
          </div>
        )}

      </div>
    </div>
  );
}

export default ContractsWidget;
