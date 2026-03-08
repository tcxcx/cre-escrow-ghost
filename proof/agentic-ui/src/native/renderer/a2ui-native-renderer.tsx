/**
 * A2UINativeRenderer — Wraps the shared A2UIProvider with the native catalog.
 *
 * The core A2UI state management (provider, message handler, surface context,
 * component renderer) is platform-agnostic pure React. Only the catalog
 * components differ between web and native — swapping the catalog is all
 * that's needed for React Native rendering.
 */

import { memo, useEffect, useRef } from 'react'
import { A2UIProvider, A2UIRenderer, useA2UIMessageHandler } from '../../renderer'
import type { A2UIMessage, ActionHandler } from '../../types'
import { buNativeCatalog } from '../catalog'

interface A2UINativeRendererProps {
  messages: A2UIMessage[]
  onAction?: ActionHandler
}

/**
 * Inner consumer — processes A2UI messages incrementally.
 * Uses lastLengthRef to only process new messages (same pattern as web).
 */
function NativeA2UIConsumer({
  messages,
  onAction,
}: {
  messages: A2UIMessage[]
  onAction?: ActionHandler
}) {
  const { processMessages, clear } = useA2UIMessageHandler()
  const lastLengthRef = useRef(0)

  useEffect(() => {
    if (messages.length > lastLengthRef.current) {
      processMessages(messages.slice(lastLengthRef.current))
      lastLengthRef.current = messages.length
    }
  }, [messages, processMessages])

  useEffect(() => clear, [clear])

  return <A2UIRenderer onAction={onAction} />
}

/**
 * A2UI Native Renderer — renders A2UI surfaces using React Native components.
 *
 * Drop-in replacement for the web A2UISurfaceRenderer, using the native catalog.
 * Pass A2UI messages from the chat data stream and an optional action handler.
 */
export const A2UINativeRenderer = memo(function A2UINativeRenderer({
  messages,
  onAction,
}: A2UINativeRendererProps) {
  if (!messages.length) return null

  return (
    <A2UIProvider catalog={buNativeCatalog}>
      <NativeA2UIConsumer messages={messages} onAction={onAction} />
    </A2UIProvider>
  )
})
