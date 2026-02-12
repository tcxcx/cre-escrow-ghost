'use client'

import { useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { useQueryState, parseAsString } from 'nuqs'
import { FlowCanvas } from './flow-canvas'
import { Toolbar } from './toolbar'
import { NodePalette } from './node-palette'
import { PropertiesPanel } from './properties-panel'
import { TemplateSelector } from './template-selector'
import { ContractPreview } from './contract-preview'
import { SettingsPanel } from './settings-panel'
import { AiAssistPanel } from './ai-assist-panel'
import { HelpButton } from './help-panel'
import { ImportContractModal } from './import-contract-modal'
import { useContractStore } from '@/lib/contract-store'

export function ContractBuilder() {
  const validateAllNodes = useContractStore((state) => state.validateAllNodes)
  const undo = useContractStore((state) => state.undo)
  const redo = useContractStore((state) => state.redo)
  const canUndo = useContractStore((state) => state.canUndo)
  const canRedo = useContractStore((state) => state.canRedo)
  const saveContract = useContractStore((state) => state.saveContract)
  const isContractValid = useContractStore((state) => state.isContractValid)
  const setPreviewOpen = useContractStore((state) => state.setPreviewOpen)
  const nodes = useContractStore((state) => state.nodes)

  // nuqs panel state
  const [panel, setPanel] = useQueryState('panel', parseAsString)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        if (canRedo) redo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        if (canRedo) redo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (isContractValid && nodes.length > 0) {
          saveContract()
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        if (nodes.length > 0) {
          setPreviewOpen(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, canUndo, canRedo, saveContract, isContractValid, setPreviewOpen, nodes])

  // Suppress ResizeObserver loop error
  useEffect(() => {
    const resizeObserverError = (e: Event) => {
      const error = e as ErrorEvent
      if (
        error.message?.includes?.('ResizeObserver') ||
        (typeof error.message === 'string' && error.message.includes('ResizeObserver'))
      ) {
        e.stopImmediatePropagation()
        e.preventDefault()
        return true
      }
    }

    const originalOnError = window.onerror
    window.onerror = (message, ...args) => {
      if (typeof message === 'string' && message.includes('ResizeObserver')) {
        return true
      }
      return originalOnError ? originalOnError(message, ...args) : false
    }

    window.addEventListener('error', resizeObserverError, true)
    return () => {
      window.removeEventListener('error', resizeObserverError, true)
      window.onerror = originalOnError
    }
  }, [])

  // Initial validation on mount
  useEffect(() => {
    validateAllNodes()
  }, [validateAllNodes])

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-full bg-background">
        {/* Toolbar */}
        <Toolbar />

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Node Palette */}
          <aside className="w-64 border-r border-border bg-card/30 flex-shrink-0 hidden md:flex flex-col">
            <NodePalette />
          </aside>

          {/* Canvas */}
          <main className="flex-1 relative">
            <FlowCanvas />
          </main>

          {/* Right Panel - Properties */}
          <PropertiesPanel />
        </div>

        {/* Template selector -- driven by ?panel=new */}
        {panel === 'new' && (
          <TemplateSelector
            open={true}
            onOpenChange={(v) => { if (!v) setPanel(null) }}
            onTemplateSelect={() => setPanel(null)}
          />
        )}

        {/* Import -- driven by ?panel=import */}
        <ImportContractModal
          open={panel === 'import'}
          onOpenChange={(open) => setPanel(open ? 'import' : null)}
          onImportComplete={() => setPanel(null)}
        />

        {/* Other modals */}
        <ContractPreview />
        <SettingsPanel />
        <AiAssistPanel />
        <HelpButton />
      </div>
    </ReactFlowProvider>
  )
}
