'use client'

import { useEffect, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { useQueryState, parseAsString } from 'nuqs'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  Blocks,
  Sparkles,
  Settings2,
} from 'lucide-react'
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
  const setAiAssistOpen = useContractStore((state) => state.setAiAssistOpen)
  const setSettingsOpen = useContractStore((state) => state.setSettingsOpen)
  const nodes = useContractStore((state) => state.nodes)
  const missingNodeTypes = useContractStore((state) => state.missingNodeTypes)

  // Mobile drawer state for node palette
  const [mobileNodePaletteOpen, setMobileNodePaletteOpen] = useState(false)

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

        {/* Main Content - pb on mobile for floating toolbar */}
        <div className="flex flex-1 overflow-hidden pb-14 md:pb-0">
          {/* Left Sidebar - Node Palette (desktop only) */}
          <aside className="w-64 border-r border-border bg-card/30 flex-shrink-0 hidden md:flex flex-col">
            <NodePalette />
          </aside>

          {/* Canvas - full width on mobile */}
          <main className="flex-1 relative">
            <FlowCanvas />
          </main>

          {/* Right Panel - Properties (desktop only, mobile uses sheet inside PropertiesPanel) */}
          <PropertiesPanel />
        </div>

        {/* Mobile floating toolbar - bottom of screen */}
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-card/95 backdrop-blur-sm safe-area-bottom">
          <div className="flex items-center justify-around px-2 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 flex flex-col items-center gap-1 h-auto py-2 min-h-[44px] bg-transparent relative"
              onClick={() => setMobileNodePaletteOpen(true)}
            >
              <Blocks className="w-5 h-5" />
              <span className="text-[10px] text-muted-foreground">Nodes</span>
              {missingNodeTypes.length > 0 && nodes.length > 0 && (
                <span className="absolute top-1 right-1/4 w-2 h-2 rounded-full bg-red-500" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 flex flex-col items-center gap-1 h-auto py-2 min-h-[44px] bg-transparent"
              onClick={() => setAiAssistOpen(true)}
            >
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-[10px] text-muted-foreground">AI Assist</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 flex flex-col items-center gap-1 h-auto py-2 min-h-[44px] bg-transparent"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="w-5 h-5" />
              <span className="text-[10px] text-muted-foreground">Settings</span>
            </Button>
          </div>
        </div>

        {/* Mobile Node Palette Sheet */}
        <Sheet open={mobileNodePaletteOpen} onOpenChange={setMobileNodePaletteOpen}>
          <SheetContent side="left" className="w-[300px] sm:w-[340px] p-0 bg-card border-border">
            <SheetHeader className="sr-only">
              <SheetTitle>Node Palette</SheetTitle>
            </SheetHeader>
            <NodePalette />
          </SheetContent>
        </Sheet>

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
