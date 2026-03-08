/**
 * Analytics Chart Extension Components for the A2UI Catalog.
 *
 * Thin, lightweight chart wrapper components that render analytics data emitted
 * by the LLM. These use A2UI hooks (useStringBinding, useDataBinding) to resolve
 * dynamic values from the surface data model.
 *
 * Each component is produced by a shared factory (`createAnalyticsComponent`) that
 * accepts a `title` (DynamicString) and `data` (DynamicValue) prop pair. The data
 * object is rendered as a grid of key/value metrics, with arrays rendered as lists.
 *
 * Components:
 * - BurnRateChart: monthly burn rate analytics
 * - ForecastChart: financial forecast projection
 * - ProfitChart: profit & loss breakdown
 * - RevenueChart: revenue analytics
 * - RunwayChart: cash runway estimation
 * - SpendingChart: spending breakdown
 * - TransactionsTable: transaction listing
 * - ContactsList: contacts directory
 * - InvoicesList: invoice listing
 * - PayrollView: payroll summary
 */

import { memo } from 'react'
import type { A2UIComponentProps, DynamicString, DynamicValue } from '../types'
import { useStringBinding, useDataBinding } from '../renderer/hooks/use-data-binding'
import type { CatalogComponents } from './bu-catalog'

// ─── Shared Props ───────────────────────────────────────────────────

interface AnalyticsChartProps {
  title: DynamicString
  data: DynamicValue
}

// ─── Metric Rendering Helpers ───────────────────────────────────────

/**
 * Renders a single metric value. Arrays become bulleted lists,
 * objects recurse into key/value grids, primitives render as text.
 */
function renderMetricValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">--</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground">No items</span>
    }
    return (
      <ul className="space-y-1">
        {value.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      return <span className="text-muted-foreground">No data</span>
    }
    return (
      <div className="grid grid-cols-2 gap-2">
        {entries.map(([key, val]) => (
          <div key={key} className="rounded-md bg-muted p-2">
            <div className="text-xs text-muted-foreground">{key}</div>
            <div className="text-sm font-medium">{renderMetricValue(val)}</div>
          </div>
        ))}
      </div>
    )
  }

  return <span>{String(value)}</span>
}

// ─── Factory ────────────────────────────────────────────────────────

/**
 * Creates an analytics chart component with the given default title.
 * The resulting component resolves `title` and `data` via A2UI hooks and
 * renders metrics as a grid of key/value pairs with array items as lists.
 */
function createAnalyticsComponent(defaultTitle: string) {
  const Component = memo(function AnalyticsChart({
    surfaceId,
    title,
    data,
    weight,
  }: A2UIComponentProps<AnalyticsChartProps>) {
    const titleText = useStringBinding(surfaceId, title, defaultTitle)
    const chartData = useDataBinding<unknown>(surfaceId, data, null)

    const style = weight ? { flexGrow: weight } : undefined

    return (
      <div className="rounded-lg border bg-card p-4 shadow-sm" style={style}>
        <div className="mb-3 text-base font-semibold">{titleText}</div>
        {chartData !== null && chartData !== undefined ? (
          <div className="space-y-2">{renderMetricValue(chartData)}</div>
        ) : (
          <div className="rounded-md bg-muted p-2 text-sm text-muted-foreground">
            No data available
          </div>
        )}
      </div>
    )
  })

  Component.displayName = `A2UI.${defaultTitle.replace(/\s+/g, '')}`
  return Component
}

// ─── Components ─────────────────────────────────────────────────────

export const BurnRateChartComponent = createAnalyticsComponent('Burn Rate')
export const ForecastChartComponent = createAnalyticsComponent('Forecast')
export const ProfitChartComponent = createAnalyticsComponent('Profit')
export const RevenueChartComponent = createAnalyticsComponent('Revenue')
export const RunwayChartComponent = createAnalyticsComponent('Runway')
export const SpendingChartComponent = createAnalyticsComponent('Spending')
export const TransactionsTableComponent = createAnalyticsComponent('Transactions')
export const ContactsListComponent = createAnalyticsComponent('Contacts')
export const InvoicesListComponent = createAnalyticsComponent('Invoices')
export const PayrollViewComponent = createAnalyticsComponent('Payroll')

// ─── Export ─────────────────────────────────────────────────────────

/**
 * Analytics chart extension components for the Bu A2UI catalog.
 * Merge into buComponents to register them.
 */
export const chartExtensions: CatalogComponents = {
  BurnRateChart: BurnRateChartComponent,
  ForecastChart: ForecastChartComponent,
  ProfitChart: ProfitChartComponent,
  RevenueChart: RevenueChartComponent,
  RunwayChart: RunwayChartComponent,
  SpendingChart: SpendingChartComponent,
  TransactionsTable: TransactionsTableComponent,
  ContactsList: ContactsListComponent,
  InvoicesList: InvoicesListComponent,
  PayrollView: PayrollViewComponent,
}
