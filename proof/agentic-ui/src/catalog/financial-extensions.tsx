/**
 * Financial Extension Components for the A2UI Catalog.
 *
 * Thin, lightweight components that render financial data emitted by the LLM.
 * These are intentionally simple (HTML + Tailwind) to avoid heavy dependencies
 * on @bu/intelligence-ui. They use A2UI hooks (useStringBinding, useDataBinding)
 * to resolve dynamic values from the surface data model.
 *
 * Components:
 * - MetricCard: financial KPI display (label, value, trend, confidence)
 * - ApprovalCard: HITL approval UI (approve/reject actions)
 * - StepProgress: workflow step progress display
 * - DataResult: tool result card (title, summary, items)
 * - InsightList: list of AI insights
 */

import { memo, useCallback } from 'react'
import type {
  A2UIComponentProps,
  DynamicString,
  DynamicNumber,
  DynamicValue,
  Action,
} from '../types'
import { useStringBinding, useDataBinding } from '../renderer/hooks/use-data-binding'
import { useDispatchAction } from '../renderer/hooks/use-dispatch-action'
import type { CatalogComponents } from './bu-catalog'
import { cn } from '@bu/ui/utils'

// ─── MetricCard ──────────────────────────────────────────────────────

interface MetricCardProps {
  label: DynamicString
  value: DynamicString
  trend?: DynamicString
  confidence?: DynamicString
}

const confidenceStyles: Record<string, string> = {
  high: 'text-green-600 dark:text-green-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  low: 'text-red-600 dark:text-red-400',
}

/**
 * MetricCard — Displays a financial KPI with optional trend and confidence.
 */
export const MetricCardComponent = memo(function MetricCardComponent({
  surfaceId,
  label,
  value,
  trend,
  confidence,
  weight,
}: A2UIComponentProps<MetricCardProps>) {
  const labelText = useStringBinding(surfaceId, label, '')
  const valueText = useStringBinding(surfaceId, value, '')
  const trendText = useStringBinding(surfaceId, trend, '')
  const confidenceText = useStringBinding(surfaceId, confidence, '')

  const style = weight ? { flexGrow: weight } : undefined

  const trendIsPositive = trendText.startsWith('+') || trendText.toLowerCase().includes('up')
  const trendIsNegative = trendText.startsWith('-') || trendText.toLowerCase().includes('down')

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm" style={style}>
      <div className="text-sm text-muted-foreground">{labelText}</div>
      <div className="mt-1 text-2xl font-bold">{valueText}</div>
      {trendText && (
        <div
          className={cn(
            'mt-1 text-sm',
            trendIsPositive && 'text-green-600 dark:text-green-400',
            trendIsNegative && 'text-red-600 dark:text-red-400',
            !trendIsPositive && !trendIsNegative && 'text-muted-foreground'
          )}
        >
          {trendText}
        </div>
      )}
      {confidenceText && (
        <div
          className={cn(
            'mt-1 text-xs',
            confidenceStyles[confidenceText.toLowerCase()] ?? 'text-muted-foreground'
          )}
        >
          Confidence: {confidenceText}
        </div>
      )}
    </div>
  )
})

MetricCardComponent.displayName = 'A2UI.MetricCard'

// ─── ApprovalCard ────────────────────────────────────────────────────

interface ApprovalCardProps {
  title: DynamicString
  description: DynamicString
  approveLabel?: DynamicString
  rejectLabel?: DynamicString
  approveAction: Action
  rejectAction: Action
}

/**
 * ApprovalCard — HITL approval UI with approve/reject buttons.
 */
export const ApprovalCardComponent = memo(function ApprovalCardComponent({
  surfaceId,
  componentId,
  title,
  description,
  approveLabel,
  rejectLabel,
  approveAction,
  rejectAction,
  weight,
}: A2UIComponentProps<ApprovalCardProps>) {
  const titleText = useStringBinding(surfaceId, title, '')
  const descriptionText = useStringBinding(surfaceId, description, '')
  const approveLabelText = useStringBinding(surfaceId, approveLabel, 'Approve')
  const rejectLabelText = useStringBinding(surfaceId, rejectLabel, 'Reject')

  const dispatchAction = useDispatchAction()

  const handleApprove = useCallback(() => {
    if (approveAction) {
      dispatchAction(surfaceId, componentId, approveAction)
    }
  }, [dispatchAction, surfaceId, componentId, approveAction])

  const handleReject = useCallback(() => {
    if (rejectAction) {
      dispatchAction(surfaceId, componentId, rejectAction)
    }
  }, [dispatchAction, surfaceId, componentId, rejectAction])

  const style = weight ? { flexGrow: weight } : undefined

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm" style={style}>
      <div className="text-base font-semibold">{titleText}</div>
      <div className="mt-1 text-sm text-muted-foreground">{descriptionText}</div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleApprove}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {approveLabelText}
        </button>
        <button
          type="button"
          onClick={handleReject}
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          {rejectLabelText}
        </button>
      </div>
    </div>
  )
})

ApprovalCardComponent.displayName = 'A2UI.ApprovalCard'

// ─── StepProgress ────────────────────────────────────────────────────

interface StepProgressProps {
  title?: DynamicString
  steps: DynamicValue
  currentStep?: DynamicNumber
}

/**
 * StepProgress — Displays a workflow step progress indicator.
 */
export const StepProgressComponent = memo(function StepProgressComponent({
  surfaceId,
  title,
  steps,
  currentStep,
  weight,
}: A2UIComponentProps<StepProgressProps>) {
  const titleText = useStringBinding(surfaceId, title, '')
  const stepsData = useDataBinding<string[]>(surfaceId, steps, [])
  const current = useDataBinding<number>(surfaceId, currentStep, 0)

  const style = weight ? { flexGrow: weight } : undefined

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm" style={style}>
      {titleText && <div className="mb-3 text-base font-semibold">{titleText}</div>}
      <div className="flex flex-col gap-2">
        {stepsData.map((step, index) => {
          const isComplete = index < current
          const isCurrent = index === current
          return (
            <div key={index} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                  isComplete && 'bg-primary text-primary-foreground',
                  isCurrent && 'border-2 border-primary text-primary',
                  !isComplete && !isCurrent && 'border border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {isComplete ? '\u2713' : index + 1}
              </div>
              <span
                className={cn(
                  'text-sm',
                  isComplete && 'text-foreground',
                  isCurrent && 'font-medium text-foreground',
                  !isComplete && !isCurrent && 'text-muted-foreground'
                )}
              >
                {step}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
})

StepProgressComponent.displayName = 'A2UI.StepProgress'

// ─── DataResult ──────────────────────────────────────────────────────

interface DataResultProps {
  title: DynamicString
  summary?: DynamicString
  items?: DynamicValue
}

/**
 * DataResult — Displays a tool result card with title, summary, and data items.
 */
export const DataResultComponent = memo(function DataResultComponent({
  surfaceId,
  title,
  summary,
  items,
  weight,
}: A2UIComponentProps<DataResultProps>) {
  const titleText = useStringBinding(surfaceId, title, '')
  const summaryText = useStringBinding(surfaceId, summary, '')
  const itemsData = useDataBinding<string[]>(surfaceId, items, [])

  const style = weight ? { flexGrow: weight } : undefined

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm" style={style}>
      <div className="text-base font-semibold">{titleText}</div>
      {summaryText && (
        <div className="mt-1 text-sm text-muted-foreground">{summaryText}</div>
      )}
      {itemsData.length > 0 && (
        <ul className="mt-2 space-y-1">
          {itemsData.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})

DataResultComponent.displayName = 'A2UI.DataResult'

// ─── InsightList ─────────────────────────────────────────────────────

interface InsightListProps {
  title?: DynamicString
  insights: DynamicValue
}

/**
 * InsightList — Displays a list of AI-generated insights.
 */
export const InsightListComponent = memo(function InsightListComponent({
  surfaceId,
  title,
  insights,
  weight,
}: A2UIComponentProps<InsightListProps>) {
  const titleText = useStringBinding(surfaceId, title, '')
  const insightsData = useDataBinding<string[]>(surfaceId, insights, [])

  const style = weight ? { flexGrow: weight } : undefined

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm" style={style}>
      {titleText && <div className="mb-2 text-base font-semibold">{titleText}</div>}
      {insightsData.length > 0 ? (
        <ul className="space-y-2">
          {insightsData.map((insight, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 text-primary">&#x2728;</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-muted-foreground">No insights available.</div>
      )}
    </div>
  )
})

InsightListComponent.displayName = 'A2UI.InsightList'

// ─── Export ──────────────────────────────────────────────────────────

/**
 * Financial extension components for the Bu A2UI catalog.
 * Merge into buComponents to register them.
 */
export const financialExtensions: CatalogComponents = {
  MetricCard: MetricCardComponent,
  ApprovalCard: ApprovalCardComponent,
  StepProgress: StepProgressComponent,
  DataResult: DataResultComponent,
  InsightList: InsightListComponent,
}
