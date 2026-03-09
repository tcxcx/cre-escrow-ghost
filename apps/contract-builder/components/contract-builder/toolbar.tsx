'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  FileText,
  Save,
  Download,
  Upload,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Settings2,
  ChevronDown,
  Sparkles,
  Eye,
  Play,
  LayoutTemplate,
  PanelRightClose,
  PanelRightOpen,
  Check,
  AlertCircle,
  Loader2,
  FolderOpen,
  Trash2,
} from 'lucide-react'
import { useQueryState, parseAsString } from 'nuqs'
import { cn } from '@/lib/utils'
import { useContractStore } from '@/lib/contract-store'
import { useReactFlow } from '@xyflow/react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useModifierKey } from '@/hooks/use-platform'
import { DeployModal } from './deploy-modal'

export function Toolbar() {
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false)
  const [, setPanel] = useQueryState('panel', parseAsString)
  const { 
    contractName, 
    setContractName, 
    setTemplateModalOpen, 
    isPropertiesPanelOpen, 
    setPropertiesPanelOpen,
    setPreviewOpen,
    setSettingsOpen,
    setAiAssistOpen,
    isContractValid,
    invalidNodeIds,
    structuralErrors,
    validationWarnings,
    saveContract,
    isSaving,
    savedContracts,
    loadSavedContract,
    deleteSavedContract,
    currentSavedContract,
    nodes,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useContractStore()
  
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const { mod, shift } = useModifierKey()
  const [isEditing, setIsEditing] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleNameSubmit = () => {
    setIsEditing(false)
  }

  const handleSave = () => {
    const saved = saveContract()
    if (saved) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    }
  }

  const handlePreview = () => {
    if (currentSavedContract || isContractValid) {
      setPreviewOpen(true)
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center justify-between h-14 px-2 sm:px-4 border-b border-border bg-card/50 backdrop-blur-sm">
        {/* Left Section - Logo & Contract Name */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground hidden sm:inline">BUFI</span>
          </div>

          <div className="h-6 w-px bg-border hidden sm:block" />

          {/* Contract Name */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            {isEditing ? (
              <Input
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                className="h-8 w-32 sm:w-48 text-sm bg-background"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors max-w-[120px] sm:max-w-[200px] truncate min-h-[44px] flex items-center"
              >
                {contractName}
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-transparent">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuItem onClick={() => setPanel('new')}>
                  <LayoutTemplate className="w-4 h-4 mr-2" />
                  New Contract
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                {/* Saved Contracts */}
                {savedContracts.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Recent Contracts
                    </div>
                    {savedContracts.slice(0, 5).map((contract) => (
                      <DropdownMenuItem
                        key={contract.id}
                        className="flex items-center justify-between"
                        onClick={() => loadSavedContract(contract.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderOpen className="w-4 h-4 shrink-0" />
                          <span className="truncate">{contract.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 bg-transparent opacity-50 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteSavedContract(contract.id)
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <DropdownMenuItem>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Contract
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  Export Contract
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Validation Status Badge */}
            {nodes.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant={isContractValid ? 'default' : 'destructive'}
                    className={cn(
                      'text-xs cursor-help',
                      isContractValid 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    )}
                  >
                    {isContractValid ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Valid
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {invalidNodeIds.length + structuralErrors.length} issues
                      </>
                    )}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm p-3">
                  {isContractValid ? (
                    <span className="text-emerald-400">Contract is valid and ready to save</span>
                  ) : (
                    <div className="space-y-3">
                      {structuralErrors.length > 0 && (
                        <div>
                          <span className="font-semibold text-red-400 text-xs uppercase tracking-wide">Structure Issues</span>
                          <ul className="text-xs mt-1.5 space-y-2">
                            {structuralErrors.map((err, i) => (
                              <li key={i} className="space-y-0.5">
                                <div className="flex items-start gap-1.5">
                                  <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                                  <span>{err.message}</span>
                                </div>
                                <div className="ml-4.5 text-muted-foreground pl-4 border-l border-border">
                                  <span className="text-[10px] uppercase tracking-wide text-primary">Tip:</span> {err.tip}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {invalidNodeIds.length > 0 && (
                        <div>
                          <span className="font-semibold text-red-400 text-xs uppercase tracking-wide">Node Issues</span>
                          <p className="text-xs mt-1">{invalidNodeIds.length} node(s) have missing required fields</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="text-primary">Tip:</span> Click on pulsing red nodes to edit their properties
                          </p>
                        </div>
                      )}
                      {validationWarnings.length > 0 && (
                        <div>
                          <span className="font-semibold text-yellow-400 text-xs uppercase tracking-wide">Warnings</span>
                          <ul className="text-xs mt-1.5 space-y-1.5">
                            {validationWarnings.map((warn, i) => (
                              <li key={i} className="space-y-0.5">
                                <span>{warn.message}</span>
                                <div className="text-muted-foreground">
                                  <span className="text-[10px] uppercase tracking-wide text-primary">Tip:</span> {warn.tip}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Center Section - View Controls (hidden on small mobile) */}
        <div className="hidden sm:flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-transparent" onClick={() => zoomOut()}>
                <ZoomOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-transparent" onClick={() => zoomIn()}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-transparent" onClick={() => fitView()}>
                <Maximize2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fit View</TooltipContent>
          </Tooltip>

          <div className="h-6 w-px bg-border mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 bg-transparent" 
                disabled={!canUndo}
                onClick={undo}
              >
                <Undo2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              <span>Undo</span>
              <KbdGroup>
                <Kbd>{mod}</Kbd>
                <Kbd>Z</Kbd>
              </KbdGroup>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 bg-transparent" 
                disabled={!canRedo}
                onClick={redo}
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              <span>Redo</span>
              <KbdGroup>
                <Kbd>{mod}</Kbd>
                <Kbd>{shift}</Kbd>
                <Kbd>Z</Kbd>
              </KbdGroup>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 min-h-[44px] gap-2 bg-transparent hidden sm:flex"
                onClick={handlePreview}
                disabled={nodes.length === 0}
              >
                <Eye className="w-4 h-4" />
                <span className="hidden md:inline">Preview</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              <span>Preview Contract</span>
              <KbdGroup>
                <Kbd>{mod}</Kbd>
                <Kbd>P</Kbd>
              </KbdGroup>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 min-h-[44px] gap-2 bg-transparent bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 hidden md:flex"
                onClick={() => setAiAssistOpen(true)}
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="hidden md:inline text-purple-300">AI Assist</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>AI Contract Assistant</TooltipContent>
          </Tooltip>

          <div className="h-6 w-px bg-border mx-1 hidden md:block" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 min-h-[44px] min-w-[44px] p-0 bg-transparent hidden md:flex"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Contract Settings</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 w-8 min-h-[44px] min-w-[44px] p-0 bg-transparent',
                  saveSuccess && 'text-emerald-400'
                )}
                onClick={handleSave}
                disabled={!isContractValid || isSaving || nodes.length === 0}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              <span>{isContractValid ? 'Save Contract' : 'Fix errors to save'}</span>
              <KbdGroup>
                <Kbd>{mod}</Kbd>
                <Kbd>S</Kbd>
              </KbdGroup>
            </TooltipContent>
          </Tooltip>

          <Button
            size="sm"
            className="h-8 min-h-[44px] gap-2"
            disabled={!isContractValid || nodes.length === 0}
            onClick={() => setIsDeployModalOpen(true)}
          >
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">Deploy</span>
          </Button>

          <DeployModal
            open={isDeployModalOpen}
            onOpenChange={setIsDeployModalOpen}
          />

          <div className="h-6 w-px bg-border mx-1 hidden lg:block" />

          <span className="hidden sm:inline-flex">
            <ThemeToggle />
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn('h-8 w-8 min-h-[44px] min-w-[44px] p-0 bg-transparent hidden lg:flex', isPropertiesPanelOpen && 'bg-muted')}
                onClick={() => setPropertiesPanelOpen(!isPropertiesPanelOpen)}
              >
                {isPropertiesPanelOpen ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <PanelRightOpen className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPropertiesPanelOpen ? 'Hide Panel' : 'Show Panel'}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
