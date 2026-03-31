'use client'

import React, { useState, useMemo } from 'react'
import { Plus, Search, Lightbulb } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useContractStore } from '@/lib/contract-store'
import { contractTemplates, tagLabels, tagColors } from '@/lib/contract-templates'
import type { ContractTemplate, ContractCategory, ContractTag } from '@repo/contract-flow'
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
  Wand2,
  CheckCircle2,
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
  Zap,
  Upload,
  File,
  Trash2,
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

const categoryLabels: Record<ContractTemplate['category'], string> = {
  freelance: 'Freelance',
  trade: 'Trade',
  creator: 'Creator',
  business: 'Business',
  legal: 'Legal',
  fundraising: 'Fundraising',
  team: 'Team',
}

const categoryColors: Record<ContractTemplate['category'], string> = {
  freelance: 'bg-[#6854CF]/10 text-[#6854CF] dark:text-[#C4A1FF] border-[#6854CF]/20',
  trade: 'bg-[#82e664]/10 text-[#5cb346] dark:text-[#82e664] border-[#82e664]/20',
  creator: 'bg-[#FEADEC]/10 text-[#e07bc7] dark:text-[#FEADEC] border-[#FEADEC]/20',
  business: 'bg-[#FFE48C]/10 text-[#c9a93a] dark:text-[#FFE48C] border-[#FFE48C]/20',
  legal: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  fundraising: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  team: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
}

interface TemplateSelectorProps {
  // External control props (for widget usage)
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onTemplateSelect?: (templateId: string) => void
}

export function TemplateSelector({ open, onOpenChange, onTemplateSelect }: TemplateSelectorProps) {
  const { isTemplateModalOpen, setTemplateModalOpen, loadTemplate, nodes } = useContractStore()
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null)
  const [showAiBuilder, setShowAiBuilder] = useState(false)

  // Use external open state if provided, otherwise use store state
  const isOpen = open !== undefined ? open : isTemplateModalOpen
  const setIsOpen = onOpenChange || setTemplateModalOpen
  
  const handleSelectTemplate = (template: ContractTemplate) => {
    setSelectedTemplate(template)
  }
  
  const handleConfirmSelection = () => {
    if (selectedTemplate) {
      // If external callback provided, use it; otherwise load into store
      if (onTemplateSelect) {
        onTemplateSelect(selectedTemplate.id)
        setSelectedTemplate(null)
      } else {
        loadTemplate(selectedTemplate)
        setSelectedTemplate(null)
      }
    }
  }

  const handleStartWithAi = () => {
    setShowAiBuilder(true)
  }

  // Don't show if there are already nodes and modal is closed (only for store-driven mode)
  if (open === undefined && !isTemplateModalOpen && nodes.length > 0) {
  return null
  }

  // Show AI Builder when selected
  if (showAiBuilder) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <AiContractBuilder onBack={() => setShowAiBuilder(false)} />
      </div>
    )
  }

  // Determine close handler -- always closable
  const handleClose = () => setIsOpen(false)

  // If controlled externally, only show when open
  if (open !== undefined && !isOpen) return null

  // Store-driven: show on empty canvas OR when modal explicitly opened
  if (open === undefined && !isOpen && nodes.length > 0) return null
  if (open === undefined && !isOpen && nodes.length === 0) {
    // empty canvas -- still closable
  }

  const isFixed = open !== undefined || (isOpen && nodes.length > 0)

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-background/80 backdrop-blur-sm',
        isFixed ? 'fixed inset-0 z-50' : 'absolute inset-0 z-10'
      )}
      onClick={(e) => {
        // Click on backdrop (not the content) closes the modal
        if (e.target === e.currentTarget) handleClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') handleClose()
      }}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <TemplateSelectorContent
        selectedTemplate={selectedTemplate}
        hoveredTemplate={hoveredTemplate}
        setSelectedTemplate={handleSelectTemplate}
        setHoveredTemplate={setHoveredTemplate}
        onConfirm={handleConfirmSelection}
        onStartWithAi={handleStartWithAi}
        onClose={handleClose}
      />
    </div>
  )
}

interface TemplateSelectorContentProps {
  selectedTemplate: ContractTemplate | null
  hoveredTemplate: string | null
  setSelectedTemplate: (template: ContractTemplate) => void
  setHoveredTemplate: (id: string | null) => void
  onConfirm: () => void
  onStartWithAi: () => void
  onClose: () => void
}

function TemplateSelectorContent({
  selectedTemplate,
  hoveredTemplate,
  setSelectedTemplate,
  setHoveredTemplate,
  onConfirm,
  onStartWithAi,
  onClose,
}: TemplateSelectorContentProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ContractTemplate['category'] | 'all'>('all')
  const [showSuggestModal, setShowSuggestModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [suggestionName, setSuggestionName] = useState('')
  const [suggestionCategory, setSuggestionCategory] = useState<ContractTemplate['category']>('business')
  const [suggestionDescription, setSuggestionDescription] = useState('')
  const [suggestionFiles, setSuggestionFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    return contractTemplates.filter((template) => {
      const matchesSearch = searchQuery === '' || 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  // Get unique categories with counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: contractTemplates.length }
    for (const template of contractTemplates) {
      counts[template.category] = (counts[template.category] || 0) + 1
    }
    return counts
  }, [])

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    const validFiles = Array.from(files).filter(file => {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/png',
        'image/jpeg',
      ]
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type`)
        return false
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} exceeds the 10MB size limit`)
        return false
      }
      return true
    })
    setSuggestionFiles(prev => [...prev, ...validFiles].slice(0, 5)) // Max 5 files
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const removeFile = (index: number) => {
    setSuggestionFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSubmitSuggestion = async () => {
    if (!suggestionName.trim() || !suggestionDescription.trim()) {
      toast.error('Please fill in all required fields')
      return
    }
    
    setIsSubmitting(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast.success('Template suggestion submitted!', {
      description: `Our team will review your suggestion${suggestionFiles.length > 0 ? ` and ${suggestionFiles.length} example file(s)` : ''}.`,
    })
    
    // Reset form
    setSuggestionName('')
    setSuggestionCategory('business')
    setSuggestionDescription('')
    setSuggestionFiles([])
    setShowSuggestModal(false)
    setIsSubmitting(false)
  }

  return (
    <div className="w-full max-w-5xl max-h-[85vh] h-[85vh] mx-4 overflow-hidden flex flex-col bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Create New Contract</h2>
            <p className="text-sm text-muted-foreground">
              Choose a template to get started quickly
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 bg-transparent"
          onClick={onClose}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border/50 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
            )}
          >
            All ({categoryCounts.all})
          </button>
          {(Object.keys(categoryLabels) as Array<ContractTemplate['category']>).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
                selectedCategory === cat
                  ? categoryColors[cat]
                  : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              )}
            >
              {categoryLabels[cat]} ({categoryCounts[cat] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6">
          {/* Results Info */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-foreground">
                {filteredTemplates.length} Template{filteredTemplates.length !== 1 ? 's' : ''}
                {selectedCategory !== 'all' && ` in ${categoryLabels[selectedCategory]}`}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Pre-configured contracts with dual-party signatures and blockchain verification</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
              onClick={() => setShowSuggestModal(true)}
            >
              <Lightbulb className="w-4 h-4" />
              Suggest a Template
            </Button>
          </div>

          {/* Empty State */}
          {filteredTemplates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">No templates found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your search or filter criteria
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent"
                onClick={() => setShowSuggestModal(true)}
              >
                <Lightbulb className="w-4 h-4" />
                Suggest a Template
              </Button>
            </div>
          )}

          {/* Template Grid -- compact 3-col */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredTemplates.map((template) => {
              const Icon = iconMap[template.icon] || FileText
              const isSelected = selectedTemplate?.id === template.id

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template)}
                  onMouseEnter={() => setHoveredTemplate(template.id)}
                  onMouseLeave={() => setHoveredTemplate(null)}
                  className={cn(
                    'relative flex items-start gap-3 p-3 rounded-lg border text-left transition-all duration-150',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border/50 bg-card hover:border-border hover:bg-muted/30'
                  )}
                >
                  {/* Icon -- compact */}
                  <div
                    className={cn(
                      'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md transition-colors mt-0.5',
                      isSelected
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-medium text-foreground truncate">{template.name}</h3>
                      {template.hasAiEscrow && (
                        <span className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-px text-[10px] font-medium rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 leading-tight">
                          <Zap className="w-2.5 h-2.5" />
                          AI
                        </span>
                      )}
                      <span
                        className={cn(
                          'flex-shrink-0 px-1.5 py-px text-[10px] font-medium rounded-full border leading-tight',
                          categoryColors[template.category]
                        )}
                      >
                        {categoryLabels[template.category]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-muted-foreground/70">{template.nodes.length} nodes</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground/70">{template.edges.length} edges</span>
                    </div>
                  </div>

                  {/* Selection check */}
                  {isSelected && (
                    <div className="flex-shrink-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center mt-1">
                      <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or build custom</span>
            </div>
          </div>

          {/* Import Existing Contract Button */}
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="w-full group"
          >
            <div className="relative flex items-center justify-between p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 overflow-hidden">
              <div className="relative flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Upload className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-foreground">Import Existing Contract</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Upload a PDF and convert it to a BUFI template
                  </p>
                </div>
              </div>
              <Plus className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>

          {/* Build with AI Card - At Bottom */}
          <button
            type="button"
            onClick={onStartWithAi}
            className="w-full group"
          >
            <div className="relative flex items-center justify-between p-5 rounded-xl border-2 border-dashed border-[#6854CF]/30 bg-gradient-to-r from-[#6854CF]/5 via-[#C4A1FF]/5 to-[#E2D0FC]/5 hover:border-[#6854CF]/50 hover:from-[#6854CF]/10 hover:via-[#C4A1FF]/10 hover:to-[#E2D0FC]/10 transition-all duration-300 overflow-hidden">
              {/* Gradient Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#6854CF]/0 via-[#C4A1FF]/10 to-[#6854CF]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#6854CF] to-[#C4A1FF] shadow-lg shadow-[#6854CF]/25">
                  <Wand2 className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#6854CF] dark:text-[#C4A1FF]">
                      Custom with AI
                    </span>
                    <Lightbulb className="w-3 h-3 text-[#C4A1FF]" />
                  </div>
                  <h3 className="font-medium text-foreground">Build from Scratch with AI Assistance</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Describe your scenario and AI will generate the contract flow
                  </p>
                </div>
              </div>
              <div className="relative flex items-center gap-2 text-[#6854CF] dark:text-[#C4A1FF]">
                <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">Start</span>
                <Plus className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-t border-border/50">
        <p className="text-sm text-muted-foreground">
          {selectedTemplate ? (
            <>
              Selected: <span className="text-foreground font-medium">{selectedTemplate.name}</span>
            </>
          ) : (
            'Select a template or build custom with AI'
          )}
        </p>
        <div className="flex items-center gap-3">
          {onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-transparent"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={onConfirm}
            disabled={!selectedTemplate}
            className="gap-2"
          >
            Use Template
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Import Contract Modal */}
      <ImportContractModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImportComplete={(templateId) => {
          toast.success('Template imported successfully!')
          setShowImportModal(false)
        }}
      />

      {/* Suggest Template Modal */}
      <Dialog open={showSuggestModal} onOpenChange={setShowSuggestModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Suggest a Template
            </DialogTitle>
            <DialogDescription>
              Help us improve our template library by suggesting new contract types you'd like to see.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="suggestion-name">
                Template Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="suggestion-name"
                placeholder="e.g., Licensing Agreement"
                value={suggestionName}
                onChange={(e) => setSuggestionName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="suggestion-category">Category</Label>
              <Select
                value={suggestionCategory}
                onValueChange={(value) => setSuggestionCategory(value as ContractTemplate['category'])}
              >
                <SelectTrigger id="suggestion-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(categoryLabels) as Array<ContractTemplate['category']>).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryLabels[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="suggestion-description">
                Description <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="suggestion-description"
                placeholder="Describe the use case and what features this template should include..."
                value={suggestionDescription}
                onChange={(e) => setSuggestionDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* File Upload Section */}
            <div className="space-y-2">
              <Label>Example Files (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Upload example contracts, templates, or reference documents (PDF, DOC, DOCX, TXT, PNG, JPG - max 10MB each)
              </p>
              
              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                )}
                onClick={() => document.getElementById('file-upload-input')?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    document.getElementById('file-upload-input')?.click()
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Up to 5 files
                </p>
              </div>

              {/* File List */}
              {suggestionFiles.length > 0 && (
                <div className="space-y-2 mt-3">
                  {suggestionFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border"
                    >
                      <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 bg-transparent text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(index)
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSuggestModal(false)}
              className="bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitSuggestion}
              disabled={isSubmitting || !suggestionName.trim() || !suggestionDescription.trim()}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Submitting...
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4" />
                  Submit Suggestion
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
