'use client'

import React, { useState, useMemo } from 'react'
import { Plus, Search, CheckCircle2, Sparkles, X, Upload } from 'lucide-react'

import { Button } from '@bu/ui/button'
import { ScrollArea } from '@bu/ui/scroll-area'
import { Input } from '@bu/ui/input'
import { cn } from '@bu/ui/cn'
import { useContractStore } from '@/lib/contract-store'
import {
  contractTemplates,
  tagLabels,
  tagColors,
  categoryLabels,
  categoryColors,
} from '@bu/contracts/templates'
import type { ContractTemplate, ContractCategory, ContractTag } from '@bu/contracts/contract-flow'
import { AiContractBuilder } from './ai-contract-builder'
import { ImportContractModal } from './import-contract-modal'
import { toast } from 'sonner'
import {
  Briefcase,
  Target,
  RefreshCw,
  Users,
  Video,
  Ship,
  MessageSquare,
  FileText,
  Shield,
  Lock,
  ClipboardList,
  FileStack,
  Database,
  Rocket,
  Receipt,
  UserCheck,
  GraduationCap,
  Mail,
} from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  Briefcase,
  Target,
  RefreshCw,
  Users,
  Video,
  Ship,
  MessageSquare,
  FileText,
  Plus,
  Shield,
  Lock,
  ClipboardList,
  FileStack,
  Database,
  Rocket,
  Receipt,
  UserCheck,
  GraduationCap,
  Mail,
}

interface TemplateSelectorProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onTemplateSelect?: (templateId: string) => void
  mode?: 'modal' | 'sheet'
  onCreateFromTemplate?: (template: ContractTemplate) => void | Promise<void>
  onCustomizeTemplate?: (templateId: string) => void
  onBuildFromScratch?: () => void
}

export function TemplateSelector({
  open,
  onOpenChange,
  onTemplateSelect,
  mode = 'modal',
  onCreateFromTemplate,
  onCustomizeTemplate,
  onBuildFromScratch,
}: TemplateSelectorProps) {
  const { isTemplateModalOpen, setTemplateModalOpen, loadTemplate, nodes } = useContractStore()
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)
  const [showAiBuilder, setShowAiBuilder] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const isOpen = open !== undefined ? open : isTemplateModalOpen
  const setIsOpen = onOpenChange || setTemplateModalOpen
  const isSheetMode = mode === 'sheet'

  const handleSelectTemplate = (template: ContractTemplate) => {
    setSelectedTemplate(template)
  }

  const handleConfirmSelection = async () => {
    if (!selectedTemplate) return
    if (onCreateFromTemplate) {
      setIsCreating(true)
      try {
        await onCreateFromTemplate(selectedTemplate)
        setSelectedTemplate(null)
      } finally {
        setIsCreating(false)
      }
    } else if (onTemplateSelect) {
      onTemplateSelect(selectedTemplate.id)
      setSelectedTemplate(null)
    } else {
      loadTemplate(selectedTemplate)
      setSelectedTemplate(null)
    }
  }

  const handleCustomizeTemplate = () => {
    if (selectedTemplate && onCustomizeTemplate) {
      onCustomizeTemplate(selectedTemplate.id)
      setSelectedTemplate(null)
    }
  }

  const handleStartWithAi = () => {
    if (onBuildFromScratch) {
      onBuildFromScratch()
    } else {
      setShowAiBuilder(true)
    }
  }

  if (!isSheetMode && open === undefined && !isTemplateModalOpen && nodes.length > 0) {
    return null
  }

  if (showAiBuilder && !onBuildFromScratch) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-darkBg backdrop-blur-sm">
        <AiContractBuilder onBack={() => setShowAiBuilder(false)} />
      </div>
    )
  }

  const handleClose = () => setIsOpen(false)

  if (!isSheetMode && open !== undefined && !isOpen) return null
  if (!isSheetMode && open === undefined && !isOpen && nodes.length > 0) return null

  const isFixed = !isSheetMode && (open !== undefined || (isOpen && nodes.length > 0))

  const content = (
    <TemplateSelectorContent
      selectedTemplate={selectedTemplate}
      setSelectedTemplate={handleSelectTemplate}
      onConfirm={handleConfirmSelection}
      onStartWithAi={handleStartWithAi}
      onClose={handleClose}
      onCustomize={onCustomizeTemplate ? handleCustomizeTemplate : undefined}
      isCreating={isCreating}
      showCustomizeButton={Boolean(onCustomizeTemplate && selectedTemplate)}
      embedded={isSheetMode}
    />
  )

  if (isSheetMode) {
    return (
      <div className="h-full min-h-0 overflow-hidden flex flex-col">
        {content}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-white/80 dark:bg-darkBg backdrop-blur-sm',
        isFixed ? 'fixed inset-0 z-50' : 'absolute inset-0 z-10'
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') handleClose()
      }}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      {content}
    </div>
  )
}

/* ─── Template card ─── */

function TemplateCard({
  template,
  isSelected,
  onSelect,
}: {
  template: ContractTemplate
  isSelected: boolean
  onSelect: (t: ContractTemplate) => void
}) {
  const Icon = iconMap[template.icon] || FileText
  const hasAiEscrow = template.tags.includes('ai-escrow')

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={cn(
        'group relative flex flex-col p-4 rounded-xl border text-left transition-all duration-200',
        'hover:shadow-sm',
        isSelected
          ? 'bg-violet-50 dark:bg-violet-950 border-violeta shadow-sm'
          : 'bg-bw dark:bg-darkBg border-borderFine dark:border-darkBorder hover:border-violeta hover:bg-violet-50 dark:hover:bg-violet-950'
      )}
    >
      {/* Tags — top right */}
      <div className="flex items-center gap-1 absolute top-3 right-3">
        {hasAiEscrow && (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-50 dark:bg-emerald-950 text-vverde border border-mintDanis">
            AI + Escrow
          </span>
        )}
        <span
          className={cn(
            'px-2 py-0.5 text-[10px] font-medium rounded border',
            categoryColors[template.category]
          )}
        >
          {categoryLabels[template.category]}
        </span>
      </div>

      {/* Icon */}
      <div className="flex items-center justify-center w-[42px] h-[42px] rounded-lg bg-bw dark:bg-violet-950 shadow-sm mb-3">
        <Icon className={cn(
          'w-5 h-5 transition-colors',
          isSelected ? 'text-purpleDanis' : 'text-purpleDanis opacity-70'
        )} />
      </div>

      {/* Title */}
      <h3 className={cn(
        'text-sm font-bold leading-tight mb-1 transition-colors',
        isSelected ? 'text-purpleDanis' : 'text-text dark:text-darkText group-hover:text-purpleDanis'
      )}>
        {template.name}
      </h3>

      {/* Meta */}
      <div className="flex items-center gap-1.5 mt-auto pt-1">
        <span className="text-xs text-grayDanis">
          {template.nodes.length} nodes
        </span>
        <CheckCircle2 className="w-3 h-3 text-vverde" />
        <span className="text-xs text-grayDanis">
          Dual signatures
        </span>
      </div>
    </button>
  )
}

/* ─── Build with AI card ─── */

function BuildWithAiCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex flex-col p-4 rounded-xl text-left transition-all duration-200',
        'border-2 border-dashed border-borderFine dark:border-darkBorder',
        'hover:border-violeta hover:bg-violet-50 dark:hover:bg-violet-950'
      )}
    >
      <span className="text-[10px] font-medium text-grayDanis tracking-wide uppercase mb-2">
        Custom With AI
      </span>

      <h3 className="text-sm font-bold text-text dark:text-darkText flex items-center gap-1.5 mb-2">
        BUILD WITH AI
        <Sparkles className="w-4 h-4 text-violeta" />
      </h3>

      <p className="text-xs text-grayDanis leading-relaxed mb-3">
        Describe your case and AI will generate the workflow
      </p>

      <div className="mt-auto flex justify-end">
        <span className={cn(
          'inline-flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all',
          'bg-violet-100 dark:bg-violet-900 text-purpleDanis group-hover:bg-purpleDanis group-hover:text-bw'
        )}>
          Create
        </span>
      </div>
    </button>
  )
}

/* ─── Main content ─── */

interface TemplateSelectorContentProps {
  selectedTemplate: ContractTemplate | null
  setSelectedTemplate: (template: ContractTemplate) => void
  onConfirm: () => void
  onStartWithAi: () => void
  onClose: () => void
  onCustomize?: () => void
  isCreating?: boolean
  showCustomizeButton?: boolean
  embedded?: boolean
}

function TemplateSelectorContent({
  selectedTemplate,
  setSelectedTemplate,
  onConfirm,
  onStartWithAi,
  onClose,
  onCustomize,
  isCreating = false,
  showCustomizeButton = false,
  embedded = false,
}: TemplateSelectorContentProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ContractCategory | 'all'>('all')
  const [showImportModal, setShowImportModal] = useState(false)

  const filteredTemplates = useMemo(() => {
    return contractTemplates.filter((template) => {
      const matchesSearch =
        searchQuery === '' ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: contractTemplates.length }
    for (const template of contractTemplates) {
      counts[template.category] = (counts[template.category] || 0) + 1
    }
    return counts
  }, [])

  return (
    <div
      className={cn(
        'w-full overflow-hidden flex flex-col',
        embedded
          ? 'h-full min-h-0'
          : 'max-w-5xl max-h-[85vh] h-[85vh] mx-4 bg-whiteDanis dark:bg-darkBg border border-borderFine dark:border-darkBorder rounded-3xl shadow-xl'
      )}
    >
      {/* ── Header ── */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-between border-b border-borderFine dark:border-darkBorder',
          embedded ? 'px-5 py-4' : 'px-6 py-5'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-900">
            <FileText className="w-5 h-5 text-purpleDanis" />
          </div>
          <div>
            <h2 className={cn('font-bold text-text dark:text-darkText', embedded ? 'text-lg' : 'text-xl')}>
              New Contract
            </h2>
            <p className="text-sm text-grayDanis">
              Choose a template to get started quickly
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-grayDanis hover:text-text dark:hover:text-darkText hover:bg-violet-50 dark:hover:bg-violet-950 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Search + Filters ── */}
      <div
        className={cn(
          'flex-shrink-0 space-y-3 border-b border-borderFine dark:border-darkBorder',
          embedded ? 'px-5 py-3' : 'px-6 py-4'
        )}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grayDanis opacity-60" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 border-borderFine dark:border-darkBorder focus:border-violeta"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-full border transition-all duration-150',
              selectedCategory === 'all'
                ? 'bg-purpleDanis text-bw border-purpleDanis'
                : 'bg-transparent text-grayDanis border-borderFine dark:border-darkBorder hover:border-violeta hover:text-text dark:hover:text-darkText'
            )}
          >
            All ({categoryCounts.all})
          </button>
          {(Object.keys(categoryLabels) as Array<ContractCategory>).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full border transition-all duration-150',
                selectedCategory === cat
                  ? categoryColors[cat]
                  : 'bg-transparent text-grayDanis border-borderFine dark:border-darkBorder hover:border-violeta hover:text-text dark:hover:text-darkText'
              )}
            >
              {categoryLabels[cat]} ({categoryCounts[cat] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* ── Template Grid ── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className={embedded ? 'p-5' : 'p-6'}>
          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-grayDanis">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
              {selectedCategory !== 'all' && ` in ${categoryLabels[selectedCategory]}`}
              {' \u2014 '}Pre-configured with dual-party signatures
            </p>
          </div>

          {/* Empty state */}
          {filteredTemplates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-violet-50 dark:bg-violet-950 flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-grayDanis" />
              </div>
              <h3 className="font-medium text-text dark:text-darkText mb-1">No templates found</h3>
              <p className="text-sm text-grayDanis">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}

          {/* Grid: 3 templates + AI card per row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredTemplates.slice(0, 3).map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplate?.id === template.id}
                onSelect={setSelectedTemplate}
              />
            ))}

            <BuildWithAiCard onClick={onStartWithAi} />

            {filteredTemplates.slice(3).map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplate?.id === template.id}
                onSelect={setSelectedTemplate}
              />
            ))}
          </div>

          {/* Import existing contract */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="w-full group"
            >
              <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-borderFine dark:border-darkBorder bg-bw dark:bg-darkBg hover:border-violeta hover:bg-violet-50 dark:hover:bg-violet-950 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950">
                    <Upload className="w-5 h-5 text-vverde" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-semibold text-text dark:text-darkText">Import Existing Contract</h4>
                    <p className="text-xs text-grayDanis">
                      Upload a PDF and convert it to a BUFI template
                    </p>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-grayDanis group-hover:text-purpleDanis transition-colors" />
              </div>
            </button>
          </div>
        </div>
      </ScrollArea>

      {/* ── Footer ── */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-between border-t border-borderFine dark:border-darkBorder',
          embedded ? 'px-5 py-3' : 'px-6 py-4'
        )}
      >
        <p className="text-sm text-grayDanis">
          {selectedTemplate ? (
            <>
              Selected: <span className="text-purpleDanis font-semibold">{selectedTemplate.name}</span>
            </>
          ) : (
            'Select a template or build custom with AI'
          )}
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="neutral"
            onClick={onClose}
          >
            Cancel
          </Button>
          {showCustomizeButton && onCustomize && (
            <Button
              variant="neutral"
              onClick={onCustomize}
              disabled={isCreating}
              className="gap-2 border-borderFine text-purpleDanis hover:border-violeta"
            >
              Customize Template
            </Button>
          )}
          <Button
            onClick={onConfirm}
            disabled={!selectedTemplate || isCreating}
            className={cn(
              'gap-2',
              selectedTemplate
                ? 'bg-purpleDanis hover:bg-purpura text-bw border-purpleDanis'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-borderFine'
            )}
          >
            {isCreating ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                Creating...
              </>
            ) : (
              <>
                Use Template
                <Plus className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Import Contract Modal */}
      <ImportContractModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImportComplete={() => {
          toast.success('Template imported successfully!')
          setShowImportModal(false)
        }}
      />
    </div>
  )
}
