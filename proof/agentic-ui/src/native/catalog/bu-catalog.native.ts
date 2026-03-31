/**
 * Bu Native Catalog — A2UI components for React Native (Expo).
 *
 * MVP: 6 core + 5 financial = 11 components.
 * Unsupported A2UI types (Tabs, Modal, TextField, etc.) are not registered —
 * the renderer will skip unknown component types gracefully.
 */

import type { Catalog, CatalogComponents } from '../../catalog/bu-catalog'

import {
  NativeTextComponent,
  NativeRowComponent,
  NativeColumnComponent,
  NativeCardComponent,
  NativeListComponent,
  NativeButtonComponent,
  NativeMetricCardComponent,
  NativeApprovalCardComponent,
  NativeDataResultComponent,
  NativeInsightListComponent,
  NativeStepProgressComponent,
} from '../components'

/**
 * Native component registry — 6 core + 5 financial = 11 components for Expo A2UI.
 * Each entry maps an A2UI type discriminator to a React Native component.
 */
export const buNativeComponents: CatalogComponents = {
  // Core layout (6)
  Text: NativeTextComponent,
  Row: NativeRowComponent,
  Column: NativeColumnComponent,
  Card: NativeCardComponent,
  List: NativeListComponent,
  Button: NativeButtonComponent,

  // Financial extensions (5)
  MetricCard: NativeMetricCardComponent,
  ApprovalCard: NativeApprovalCardComponent,
  DataResult: NativeDataResultComponent,
  InsightList: NativeInsightListComponent,
  StepProgress: NativeStepProgressComponent,
}

export const buNativeCatalog: Catalog = {
  components: buNativeComponents,
  functions: {},
}
