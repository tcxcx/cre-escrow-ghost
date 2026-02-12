'use client'

import React, { useState, useCallback, useEffect } from 'react'
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowLeft,
  ArrowRight,
  Shield,
  Lightbulb,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  File,
  Briefcase,
  Users,
  Target,
  Rocket,
  Receipt,
  Database,
  Zap,
  Building2,
  User,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react'
import { FileDropzone, type UploadedFile } from '@/components/shared/file-dropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type {
  ContractExtraction,
  ExtractedMilestone,
  ExtractedClause,
  ProcessingStep,
  ClauseType,
} from '@/types/import'
import {
  CONTRACT_TYPE_OPTIONS,
  CLAUSE_LABELS,
  CLAUSE_NODE_MAPPING,
  TEMPLATE_ICONS,
} from '@/types/import'

interface ImportContractModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: (templateId: string) => void
}

type Step = 'upload' | 'processing' | 'review' | 'save' | 'success'

const iconMap: Record<string, React.ElementType> = {
  Briefcase,
  Users,
  FileText,
  Target,
  Rocket,
  Shield,
  Receipt,
  Database,
}

// Mock AI extraction result
const mockExtraction: ContractExtraction = {
  contractType: {
    detected: 'Agency/Consulting Agreement',
    confidence: 0.92,
    suggestedTemplate: 'agency',
  },
  parties: [
    {
      role: 'payer',
      type: 'company',
      nameField: 'Client Company',
      additionalFields: ['Contact Person', 'Email', 'Address'],
    },
    {
      role: 'payee',
      type: 'company',
      nameField: 'Agency/Provider',
      additionalFields: ['Contact Person', 'Email', 'Address'],
    },
  ],
  paymentStructure: {
    type: 'milestone',
    totalValue: 50000,
    currency: 'USD',
    milestones: [
      {
        id: 'm1',
        name: 'Discovery & Research',
        description: 'Initial research and requirements gathering phase',
        percentage: 20,
        deliverables: ['Research report', 'User personas', 'Competitive analysis'],
        acceptanceCriteria: ['Complete research documentation with findings'],
        enableAiVerification: true,
      },
      {
        id: 'm2',
        name: 'Design Phase',
        description: 'UI/UX design and prototyping',
        percentage: 30,
        deliverables: ['Wireframes', 'High-fidelity mockups', 'Interactive prototype'],
        acceptanceCriteria: ['Figma designs with mobile + desktop views'],
        enableAiVerification: true,
      },
      {
        id: 'm3',
        name: 'Development',
        description: 'Full application development',
        percentage: 35,
        deliverables: ['Working application', 'Source code', 'API documentation'],
        acceptanceCriteria: ['Deployed staging environment with all features'],
        enableAiVerification: true,
      },
      {
        id: 'm4',
        name: 'Launch & Handoff',
        description: 'Production deployment and documentation',
        percentage: 15,
        deliverables: ['Production deployment', 'Technical documentation', 'Training materials'],
        acceptanceCriteria: ['Live production site with documentation'],
        enableAiVerification: true,
      },
    ],
  },
  clauses: [
    { id: 'c1', type: 'nda', detected: true, confidence: 0.95, mappedNode: 'NDA Node', enabled: true },
    { id: 'c2', type: 'ip_assignment', detected: true, confidence: 0.88, mappedNode: 'IP Assignment Node', enabled: true },
    { id: 'c3', type: 'termination', detected: true, confidence: 0.91, mappedNode: 'Termination Clause Node', enabled: true },
    { id: 'c4', type: 'liability', detected: true, confidence: 0.85, mappedNode: 'Liability Clause Node', enabled: true },
    { id: 'c5', type: 'non_compete', detected: false, confidence: 0, mappedNode: 'Non-Compete Node', enabled: false },
    { id: 'c6', type: 'non_solicitation', detected: false, confidence: 0, mappedNode: 'Non-Solicitation Node', enabled: false },
  ],
  timeline: {
    effectiveDate: 'Upon signing',
    termLength: '6 months',
  },
  sections: [],
  confidence: {
    overall: 0.89,
    parties: 0.94,
    payments: 0.87,
    clauses: 0.91,
  },
}

export function ImportContractModal({ open, onOpenChange, onImportComplete }: ImportContractModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('parse')
  const [processingProgress, setProcessingProgress] = useState(0)
  const [findings, setFindings] = useState<string[]>([])
  const [extraction, setExtraction] = useState<ContractExtraction | null>(null)
  const [isDragging, setIsDragging] = useState(false) // Declare setIsDragging
  
  // Review state
  const [contractType, setContractType] = useState('agency')
  const [milestones, setMilestones] = useState<ExtractedMilestone[]>([])
  const [clauses, setClauses] = useState<ExtractedClause[]>([])
  const [requireKyc, setRequireKyc] = useState(true)
  const [requireKyb, setRequireKyb] = useState(false)
  const [enableYield, setEnableYield] = useState(true)
  const [yieldStrategy, setYieldStrategy] = useState('aave')
  const [totalValue, setTotalValue] = useState<number>(0)
  
  // Save state
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateCategory, setTemplateCategory] = useState('business')
  const [templateIcon, setTemplateIcon] = useState('Briefcase')
  const [templateTags, setTemplateTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saveOption, setSaveOption] = useState<'create' | 'save'>('create')
  const [isSaving, setIsSaving] = useState(false)
  
  // Expanded sections
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('upload')
      setFile(null)
      setExtraction(null)
      setProcessingProgress(0)
      setFindings([])
    }
  }, [open])

  // Simulate AI processing
  const simulateProcessing = useCallback(async () => {
    const steps: ProcessingStep[] = ['parse', 'extract', 'identify', 'map']
    const stepMessages = {
      parse: 'Parsing PDF document...',
      extract: 'Extracting clauses and terms...',
      identify: 'Identifying payment milestones...',
      map: 'Mapping to BUFI nodes...',
    }
    const stepFindings = {
      parse: ['Document parsed successfully', '12 pages analyzed'],
      extract: ['2 parties identified', '4 payment milestones detected'],
      identify: ['Confidentiality clause found', 'IP assignment clause found'],
      map: ['Template structure created', '10 nodes mapped'],
    }
    
    for (let i = 0; i < steps.length; i++) {
      const currentStep = steps[i]
      setProcessingStep(currentStep)
      
      // Simulate progress within each step
      for (let j = 0; j <= 100; j += 10) {
        const overallProgress = ((i * 100) + j) / steps.length
        setProcessingProgress(overallProgress)
        await new Promise(r => setTimeout(r, 100))
      }
      
      // Add findings for this step
      setFindings(prev => [...prev, ...stepFindings[currentStep]])
      await new Promise(r => setTimeout(r, 300))
    }
    
    // Set extraction results
    setExtraction(mockExtraction)
    setMilestones(mockExtraction.paymentStructure.milestones)
    setClauses(mockExtraction.clauses)
    setTotalValue(mockExtraction.paymentStructure.totalValue || 0)
    setTemplateName(file?.name.replace('.pdf', '') || 'Imported Contract')
    
    // Move to review step
    setStep('review')
  }, [file])

  // Handle file selection
  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      toast.error('Please upload a PDF file')
      return
    }
    if (selectedFile.size > 25 * 1024 * 1024) {
      toast.error('File size must be less than 25MB')
      return
    }
    setFile(selectedFile)
  }

  // Drag handlers are now managed by the shared FileDropzone component

  const handleUpload = () => {
    if (!file) return
    setStep('processing')
    simulateProcessing()
  }

  // Milestone management
  const toggleMilestoneExpanded = (id: string) => {
    setExpandedMilestones(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const updateMilestone = (id: string, updates: Partial<ExtractedMilestone>) => {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  const removeMilestone = (id: string) => {
    setMilestones(prev => prev.filter(m => m.id !== id))
  }

  const addMilestone = () => {
    const newMilestone: ExtractedMilestone = {
      id: `m${Date.now()}`,
      name: 'New Milestone',
      description: '',
      percentage: 0,
      deliverables: [],
      acceptanceCriteria: [],
      enableAiVerification: true,
    }
    setMilestones(prev => [...prev, newMilestone])
    setExpandedMilestones(prev => new Set([...prev, newMilestone.id]))
  }

  // Clause management
  const toggleClause = (id: string) => {
    setClauses(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c))
  }

  // Tag management
  const addTag = () => {
    if (tagInput.trim() && !templateTags.includes(tagInput.trim())) {
      setTemplateTags(prev => [...prev, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setTemplateTags(prev => prev.filter(t => t !== tag))
  }

  // Save template
  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name')
      return
    }
    
    setIsSaving(true)
    await new Promise(r => setTimeout(r, 1500))
    setIsSaving(false)
    setStep('success')
    
    toast.success('Template saved successfully!')
  }

  const handleComplete = () => {
    if (saveOption === 'create') {
      onImportComplete?.('imported-template-1')
    }
    onOpenChange(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[90vh] max-h-[900px] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Import Contract
              {step === 'review' && <Badge variant="outline" className="ml-2">Step 2 of 3</Badge>}
              {step === 'save' && <Badge variant="outline" className="ml-2">Step 3 of 3</Badge>}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-6">
            {/* Step 1: Upload */}
            {step === 'upload' && (
              <>
                {/* Header Info */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                  <div className="flex items-start gap-3">
                    <Upload className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-medium text-foreground">Import Existing Contract</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload a PDF contract and our AI will automatically extract the structure, 
                        identify key terms, and create a reusable BUFI template.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Drop Zone -- uses shared FileDropzone */}
                <FileDropzone
                  accept={['.pdf']}
                  onFileAccepted={({ file: f }: UploadedFile) => handleFileSelect(f)}
                  currentFile={file}
                  onClear={() => setFile(null)}
                />

                {/* Security Note */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Your documents are processed securely.</span>{' '}
                    We only extract structure, not store the original file.
                  </div>
                </div>

                {/* Works Best With */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    Works best with:
                  </div>
                  <ul className="grid grid-cols-2 gap-1.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                      Service agreements & SOWs
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                      Freelance contracts
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                      NDAs and confidentiality
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                      Consulting agreements
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                      Agency contracts
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                      Milestone payments
                    </li>
                  </ul>
                </div>
              </>
            )}

            {/* Step 2: Processing */}
            {step === 'processing' && (
              <>
                {/* File Info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <FileText className="w-5 h-5 text-emerald-500" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{file?.name}</p>
                    <p className="text-sm text-muted-foreground">{file && formatFileSize(file.size)}</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Uploaded
                  </Badge>
                </div>

                {/* Processing Status */}
                <div className="rounded-lg border border-border p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="font-medium text-foreground">Analyzing contract with AI...</span>
                  </div>

                  {/* Step Indicators */}
                  <div className="flex items-center justify-between text-xs">
                    {(['parse', 'extract', 'identify', 'map'] as ProcessingStep[]).map((s, i) => {
                      const stepIndex = ['parse', 'extract', 'identify', 'map'].indexOf(processingStep)
                      const isComplete = i < stepIndex
                      const isCurrent = s === processingStep
                      return (
                        <div key={s} className="flex items-center gap-1.5">
                          <div className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-xs',
                            isComplete ? 'bg-primary text-primary-foreground' :
                            isCurrent ? 'bg-primary/20 text-primary border border-primary' :
                            'bg-muted text-muted-foreground'
                          )}>
                            {isComplete ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                          </div>
                          <span className={cn(
                            isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                          )}>
                            {s === 'parse' && 'Parse'}
                            {s === 'extract' && 'Extract'}
                            {s === 'identify' && 'Identify'}
                            {s === 'map' && 'Map'}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Progress Bar */}
                  <Progress value={processingProgress} className="h-2" />

                  <p className="text-sm text-muted-foreground">
                    Currently: {processingStep === 'parse' && 'Parsing PDF document...'}
                    {processingStep === 'extract' && 'Extracting clauses and terms...'}
                    {processingStep === 'identify' && 'Identifying payment milestones...'}
                    {processingStep === 'map' && 'Mapping to BUFI nodes...'}
                  </p>
                </div>

                {/* Findings */}
                {findings.length > 0 && (
                  <div className="rounded-lg border border-border p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Found so far:
                    </p>
                    <ul className="space-y-1">
                      {findings.map((finding, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* Step 3: Review */}
            {step === 'review' && extraction && (
              <>
                {/* Analysis Complete */}
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-foreground">Analysis Complete</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        We identified the following structure from your contract. Review and adjust before creating your template.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contract Type */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <Label className="text-sm font-medium">Contract Type</Label>
                  <Select value={contractType} onValueChange={setContractType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Lightbulb className="w-3 h-3 mt-0.5 text-primary" />
                    This looks like a milestone-based agency contract with deliverable payments and IP assignment.
                  </div>
                </div>

                {/* Parties */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Parties
                    </Label>
                    <Button variant="ghost" size="sm" className="h-7 text-xs bg-transparent">Edit</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {extraction.parties.map((party, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-2">
                        <div className="flex items-center gap-2">
                          {party.type === 'company' ? (
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-xs font-medium uppercase text-muted-foreground">
                            {party.role === 'payer' ? 'Client (Payer)' : 'Provider (Payee)'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{party.nameField} field</p>
                        <p className="text-xs text-muted-foreground">
                          + {party.additionalFields.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Structure */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Receipt className="w-4 h-4" />
                      Payment Structure
                    </Label>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Total Value</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          type="number"
                          value={totalValue}
                          onChange={(e) => setTotalValue(Number(e.target.value))}
                          className="h-9"
                        />
                        <span className="text-muted-foreground text-sm">USDC</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Payment Type</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          Milestone-based
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Milestones */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Milestones ({milestones.length} detected)
                    </Label>
                  </div>
                  <div className="space-y-2">
                    {milestones.map((milestone, i) => (
                      <div key={milestone.id} className="rounded-lg border border-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleMilestoneExpanded(milestone.id)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{milestone.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {milestone.percentage}% | {milestone.deliverables.length} deliverables
                            </p>
                          </div>
                          {milestone.enableAiVerification && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                              <Zap className="w-3 h-3 mr-1" />
                              AI
                            </Badge>
                          )}
                          {expandedMilestones.has(milestone.id) ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        {expandedMilestones.has(milestone.id) && (
                          <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border bg-muted/30">
                            <div className="pt-3 grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">Name</Label>
                                <Input
                                  value={milestone.name}
                                  onChange={(e) => updateMilestone(milestone.id, { name: e.target.value })}
                                  className="h-8 mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Percentage</Label>
                                <Input
                                  type="number"
                                  value={milestone.percentage}
                                  onChange={(e) => updateMilestone(milestone.id, { percentage: Number(e.target.value) })}
                                  className="h-8 mt-1"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Deliverables</Label>
                              <p className="text-sm mt-1">{milestone.deliverables.join(', ')}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Acceptance Criteria</Label>
                              <p className="text-sm mt-1 italic text-muted-foreground">
                                "{milestone.acceptanceCriteria[0]}"
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`ai-${milestone.id}`}
                                  checked={milestone.enableAiVerification}
                                  onCheckedChange={(checked) => updateMilestone(milestone.id, { enableAiVerification: !!checked })}
                                />
                                <Label htmlFor={`ai-${milestone.id}`} className="text-sm cursor-pointer">
                                  Enable AI verification
                                </Label>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-destructive hover:text-destructive bg-transparent"
                                onClick={() => removeMilestone(milestone.id)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 bg-transparent"
                    onClick={addMilestone}
                  >
                    <Plus className="w-4 h-4" />
                    Add Milestone
                  </Button>
                </div>

                {/* Clauses */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Additional Clauses Detected
                    </Label>
                  </div>
                  <div className="space-y-2">
                    {clauses.map((clause) => (
                      <div
                        key={clause.id}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg transition-colors',
                          clause.detected ? 'bg-muted/50' : 'bg-transparent'
                        )}
                      >
                        <Checkbox
                          id={clause.id}
                          checked={clause.enabled}
                          onCheckedChange={() => toggleClause(clause.id)}
                          disabled={!clause.detected}
                        />
                        <div className="flex-1">
                          <Label htmlFor={clause.id} className={cn(
                            'text-sm cursor-pointer',
                            !clause.detected && 'text-muted-foreground'
                          )}>
                            {CLAUSE_LABELS[clause.type]}
                            {!clause.detected && ' (not detected)'}
                          </Label>
                          {clause.detected && clause.enabled && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Map to: {CLAUSE_NODE_MAPPING[clause.type]}
                            </p>
                          )}
                        </div>
                        {clause.detected && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(clause.confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Plus className="w-4 h-4" />
                    Add Clause
                  </Button>
                </div>

                {/* Compliance */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Compliance Options
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="kyc" checked={requireKyc} onCheckedChange={(c) => setRequireKyc(!!c)} />
                      <Label htmlFor="kyc" className="text-sm cursor-pointer">Require KYC verification for parties</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="kyb" checked={requireKyb} onCheckedChange={(c) => setRequireKyb(!!c)} />
                      <Label htmlFor="kyb" className="text-sm cursor-pointer">Require KYB (business) verification</Label>
                    </div>
                  </div>
                </div>

                {/* Yield */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Yield Configuration
                  </Label>
                  <div className="flex items-center gap-2">
                    <Checkbox id="yield" checked={enableYield} onCheckedChange={(c) => setEnableYield(!!c)} />
                    <Label htmlFor="yield" className="text-sm cursor-pointer">Enable yield on escrow</Label>
                  </div>
                  {enableYield && (
                    <Select value={yieldStrategy} onValueChange={setYieldStrategy}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aave">AAVE v3</SelectItem>
                        <SelectItem value="compound">Compound</SelectItem>
                        <SelectItem value="morpho">Morpho</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </>
            )}

            {/* Step 4: Save */}
            {step === 'save' && (
              <>
                {/* Header */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-medium text-foreground">Save as Template</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Save this structure as a reusable template for future contracts.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Template Details */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name *</Label>
                    <Input
                      id="template-name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., Agency Master Agreement"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-desc">Description</Label>
                    <Textarea
                      id="template-desc"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Describe what this template is for..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={templateCategory} onValueChange={setTemplateCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="freelance">Freelance</SelectItem>
                          <SelectItem value="legal">Legal</SelectItem>
                          <SelectItem value="trade">Trade</SelectItem>
                          <SelectItem value="creator">Creator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <div className="flex gap-1 flex-wrap">
                        {TEMPLATE_ICONS.map(({ icon }) => {
                          const Icon = iconMap[icon]
                          return (
                            <button
                              key={icon}
                              type="button"
                              onClick={() => setTemplateIcon(icon)}
                              className={cn(
                                'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                                templateIcon === icon
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted hover:bg-muted/80'
                              )}
                            >
                              {Icon && <Icon className="w-4 h-4" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex gap-2 flex-wrap">
                      {templateTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)}>
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                      <div className="flex gap-1">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                          placeholder="Add tag"
                          className="h-7 w-24"
                        />
                        <Button variant="ghost" size="sm" className="h-7 px-2 bg-transparent" onClick={addTag}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <Label className="text-sm font-medium">Template Preview</Label>
                  <div className="h-32 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground text-sm">
                    Mini React Flow preview placeholder
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Nodes: {4 + milestones.length + clauses.filter(c => c.enabled).length}</span>
                    <span>Milestones: {milestones.length}</span>
                    <span>Clauses: {clauses.filter(c => c.enabled).length}</span>
                    {requireKyc && <span>KYC Required</span>}
                  </div>
                </div>

                {/* Save Options */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">What would you like to do next?</Label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setSaveOption('create')}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                        saveOption === 'create'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                        saveOption === 'create' ? 'border-primary' : 'border-muted-foreground'
                      )}>
                        {saveOption === 'create' && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <span className="text-sm">Save template and create contract now</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaveOption('save')}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                        saveOption === 'save'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                        saveOption === 'save' ? 'border-primary' : 'border-muted-foreground'
                      )}>
                        {saveOption === 'save' && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <span className="text-sm">Save template only (create contract later)</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step 5: Success */}
            {step === 'success' && (
              <div className="py-8 text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Template Created Successfully!</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your template is now available in "My Templates" and can be used to create new contracts anytime.
                  </p>
                </div>

                {/* Template Card Preview */}
                <div className="inline-flex flex-col items-center p-4 rounded-lg border border-border bg-card max-w-xs mx-auto">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    {(() => {
                      const Icon = iconMap[templateIcon]
                      return Icon ? <Icon className="w-6 h-6 text-primary" /> : null
                    })()}
                  </div>
                  <p className="font-medium text-foreground">{templateName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {milestones.length} milestones | {clauses.filter(c => c.enabled).length} clauses
                    {requireKyc && ' | KYC Required'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer - Always visible at bottom */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-border/50 flex items-center justify-between bg-background">
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!file} className="gap-2">
                Start Import
                <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {step === 'processing' && (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="ml-auto bg-transparent">
              Cancel
            </Button>
          )}

          {step === 'review' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')} className="gap-2 bg-transparent">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button onClick={() => setStep('save')} className="gap-2">
                Continue to Save
                <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {step === 'save' && (
            <>
              <Button variant="outline" onClick={() => setStep('review')} className="gap-2 bg-transparent">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Save Template
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'success' && (
            <div className="flex gap-3 ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
                View Templates
              </Button>
              <Button onClick={handleComplete} className="gap-2">
                {saveOption === 'create' ? 'Create Contract' : 'Done'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
