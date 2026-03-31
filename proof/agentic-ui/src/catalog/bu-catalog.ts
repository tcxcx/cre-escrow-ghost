/**
 * Bu Catalog — A2UI v0.9 Component Registry
 *
 * Maps A2UI type discriminator strings to React component implementations.
 * All 18 standard A2UI components rendered with @bu/ui primitives,
 * plus Bu financial extension components from @bu/intelligence-ui.
 *
 * Financial extensions (MetricCard, Approval, etc.) are registered
 * in Phase 2 once the rendering pipeline is proven with standard components.
 *
 * @example
 * ```tsx
 * import { buCatalog } from '@bu/agentic-ui'
 * import { A2UIProvider, A2UIRenderer } from '@bu/agentic-ui'
 *
 * // Use Bu catalog as-is
 * <A2UIProvider messages={messages} onAction={handleAction} catalog={buCatalog}>
 *   <A2UIRenderer />
 * </A2UIProvider>
 *
 * // Extend with custom components
 * const customCatalog = {
 *   ...buCatalog,
 *   components: {
 *     ...buCatalog.components,
 *     CustomChart: MyChartComponent,
 *   },
 * }
 * ```
 */

import type { ComponentType } from 'react'

// Display components
import {
  TextComponent,
  ImageComponent,
  IconComponent,
  VideoComponent,
  AudioPlayerComponent,
  DividerComponent,
} from '../renderer/components/display'

// Layout components
import {
  RowComponent,
  ColumnComponent,
  ListComponent,
  CardComponent,
  TabsComponent,
  ModalComponent,
} from '../renderer/components/layout'

// Interactive components
import {
  ButtonComponent,
  TextFieldComponent,
  CheckBoxComponent,
  ChoicePickerComponent,
  SliderComponent,
  DateTimeInputComponent,
} from '../renderer/components/interactive'

// Financial extension components
import { financialExtensions } from './financial-extensions'

// Analytics chart extension components
import { chartExtensions } from './chart-extensions'

/**
 * Type for a component in the catalog.
 * Components receive BaseComponentProps plus their specific props spread.
 * We use a loose type here since props are dynamically spread at runtime.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CatalogComponent = ComponentType<any>

/**
 * Type for the components registry in a catalog.
 */
export type CatalogComponents = Record<string, CatalogComponent>

/**
 * Type for functions in a catalog.
 * Standard functions include validation helpers (required, regex, length, numeric, email).
 */
export type CatalogFunctions = Record<string, unknown>

/**
 * Type for a catalog containing components and functions.
 */
export interface Catalog {
  /** Component registry mapping A2UI type discriminator strings to React components */
  components: CatalogComponents
  /** Function registry for validation and business logic */
  functions: CatalogFunctions
}

/**
 * Standard A2UI v0.9 components rendered with @bu/ui primitives.
 *
 * 18 components total:
 * - Display (6): Text, Image, Icon, Video, AudioPlayer, Divider
 * - Layout (6): Row, Column, List, Card, Tabs, Modal
 * - Interactive (6): Button, TextField, CheckBox, ChoicePicker, Slider, DateTimeInput
 */
export const buComponents: CatalogComponents = {
  // Display components (6)
  Text: TextComponent,
  Image: ImageComponent,
  Icon: IconComponent,
  Video: VideoComponent,
  AudioPlayer: AudioPlayerComponent,
  Divider: DividerComponent,

  // Layout components (6)
  Row: RowComponent,
  Column: ColumnComponent,
  List: ListComponent,
  Card: CardComponent,
  Tabs: TabsComponent,
  Modal: ModalComponent,

  // Interactive components (6)
  Button: ButtonComponent,
  TextField: TextFieldComponent,
  CheckBox: CheckBoxComponent,
  ChoicePicker: ChoicePickerComponent,
  Slider: SliderComponent,
  DateTimeInput: DateTimeInputComponent,

  // Financial extension components (5)
  ...financialExtensions,

  // Analytics chart extension components (10)
  ...chartExtensions,
}

/**
 * Standard A2UI v0.9 functions (reserved for future use).
 * Validation functions (required, regex, length, numeric, email) are handled
 * by the checks system in the renderer hooks, not registered here.
 */
export const buFunctions: CatalogFunctions = {}

/**
 * The Bu catalog — A2UI v0.9 standard components + Bu financial extensions.
 *
 * This is the default catalog used by the Bu platform's A2UI renderer.
 * It contains all 18 standard A2UI components rendered with @bu/ui primitives.
 *
 * Includes 5 financial extension components:
 * - MetricCard: financial KPI display with trend and confidence
 * - ApprovalCard: HITL approval flow for financial operations
 * - StepProgress: workflow step progress display
 * - DataResult: tool result card with title, summary, and items
 * - InsightList: AI-generated insight display
 *
 * Includes 10 analytics chart extension components:
 * - BurnRateChart, ForecastChart, ProfitChart, RevenueChart, RunwayChart
 * - SpendingChart, TransactionsTable, ContactsList, InvoicesList, PayrollView
 */
export const buCatalog: Catalog = {
  components: buComponents,
  functions: buFunctions,
}
