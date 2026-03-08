/**
 * A2UIProvider - Combined provider for all A2UI 0.9 contexts.
 *
 * This component wraps all the necessary context providers for A2UI rendering.
 * It should be placed at the top level of any component tree that uses A2UI.
 *
 * Vendored from @a2ui-sdk/react v0.9
 *
 * @example
 * ```tsx
 * import { A2UIProvider, A2UIRenderer } from '@bu/agentic-ui'
 * import type { A2UIMessage, A2UIAction } from '@bu/agentic-ui'
 *
 * function App() {
 *   const messages: A2UIMessage[] = [...]
 *   const handleAction = (action: A2UIAction) => {
 *     console.log('Action:', action)
 *   }
 *   return (
 *     <A2UIProvider messages={messages}>
 *       <A2UIRenderer onAction={handleAction} />
 *     </A2UIProvider>
 *   )
 * }
 *
 * // With extended catalog (add custom components on top of Bu catalog)
 * function AppWithExtendedCatalog() {
 *   const extendedCatalog = {
 *     ...buCatalog,
 *     components: {
 *       ...buCatalog.components,
 *       CustomChart: MyChartComponent,
 *     },
 *   }
 *   return (
 *     <A2UIProvider messages={messages} catalog={extendedCatalog}>
 *       <A2UIRenderer onAction={handleAction} />
 *     </A2UIProvider>
 *   )
 * }
 *
 * // With completely custom catalog (override everything)
 * function AppWithCustomCatalog() {
 *   const customCatalog = {
 *     components: { Text: MyTextComponent },
 *     functions: {},
 *   }
 *   return (
 *     <A2UIProvider messages={messages} catalog={customCatalog}>
 *       <A2UIRenderer onAction={handleAction} />
 *     </A2UIProvider>
 *   )
 * }
 * ```
 */

import { useEffect, type ReactNode } from 'react'
import { SurfaceProvider } from './contexts/surface-context'
import { ComponentsMapProvider } from './contexts/components-map-context'
import type { A2UIMessage } from '../types'
import { useA2UIMessageHandler } from './hooks/use-a2ui-message-handler'
import { buCatalog, type Catalog } from '../catalog'

/**
 * Props for A2UIProvider.
 */
export interface A2UIProviderProps {
  /**
   * Array of A2UI messages to render.
   * When this prop changes, all state is cleared and messages are reprocessed.
   * For incremental updates, use useA2UIMessageHandler hook inside the provider.
   */
  messages?: A2UIMessage[]
  /**
   * Catalog containing components and functions.
   * Uses `buCatalog` from '@bu/agentic-ui' as the default.
   *
   * @example
   * ```tsx
   * // Extend Bu catalog
   * const catalog = {
   *   ...buCatalog,
   *   components: { ...buCatalog.components, Custom: MyComponent },
   * }
   * ```
   */
  catalog?: Catalog
  children: ReactNode
}

/**
 * Internal component that handles message processing.
 */
function A2UIMessageProcessor({
  messages,
  children,
}: {
  messages?: A2UIMessage[]
  children: ReactNode
}) {
  const { processMessages, clear } = useA2UIMessageHandler()

  // Process messages when they change
  useEffect(() => {
    if (messages !== undefined) {
      // Clear existing state and process new messages
      clear()
      if (messages && messages.length > 0) {
        processMessages(messages)
      }
    }
  }, [messages, clear, processMessages])

  return <>{children}</>
}

/**
 * Combined provider for all A2UI 0.9 contexts.
 *
 * Provides:
 * - SurfaceContext: Multi-surface state management
 * - ComponentsMapContext: Custom component overrides
 *
 * @param props - Component props
 * @param props.messages - Array of A2UI messages to render
 * @param props.catalog - Catalog containing components and functions
 * @param props.children - Child components (typically A2UIRenderer)
 *
 * @example
 * ```tsx
 * import { buCatalog } from '@bu/agentic-ui'
 *
 * // Basic usage (uses Bu catalog by default)
 * <A2UIProvider messages={messages}>
 *   <A2UIRenderer onAction={handleAction} />
 * </A2UIProvider>
 *
 * // With extended catalog
 * const extendedCatalog = {
 *   ...buCatalog,
 *   components: {
 *     ...buCatalog.components,
 *     CustomChart: MyChartComponent,
 *   },
 * }
 * <A2UIProvider messages={messages} catalog={extendedCatalog}>
 *   <A2UIRenderer onAction={handleAction} />
 * </A2UIProvider>
 *
 * // Render specific surfaces
 * <A2UIProvider messages={messages}>
 *   <A2UIRenderer surfaceId="sidebar" onAction={handleAction} />
 *   <A2UIRenderer surfaceId="main" onAction={handleAction} />
 * </A2UIProvider>
 * ```
 */
export function A2UIProvider({
  messages,
  catalog,
  children,
}: A2UIProviderProps) {
  // Determine the components to use:
  // 1. If catalog is provided, use catalog.components directly
  // 2. Otherwise, use Bu catalog
  const effectiveCatalog = catalog ?? buCatalog

  return (
    <SurfaceProvider>
      <ComponentsMapProvider components={effectiveCatalog.components}>
        <A2UIMessageProcessor messages={messages}>
          {children}
        </A2UIMessageProcessor>
      </ComponentsMapProvider>
    </SurfaceProvider>
  )
}
