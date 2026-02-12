'use client'

import React from "react"

import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  X,
  Trash2,
  Sparkles,
  Loader2,
  Building2,
  User,
  Target,
  GitBranch,
  Banknote,
  PenLine,
  FileText,
  Percent,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useContractStore } from '@/lib/contract-store'
import type { NodeType } from '@repo/contract-flow'

const nodeConfig: Record<NodeType, { icon: React.ElementType; label: string; color: string }> = {
  'party-payer': { icon: Building2, label: 'Payer Party', color: 'text-blue-400' },
  'party-payee': { icon: User, label: 'Payee Party', color: 'text-emerald-400' },
  milestone: { icon: Target, label: 'Milestone', color: 'text-purple-400' },
  condition: { icon: GitBranch, label: 'Condition', color: 'text-amber-400' },
  payment: { icon: Banknote, label: 'Payment', color: 'text-emerald-400' },
  signature: { icon: PenLine, label: 'Signature', color: 'text-blue-400' },
  clause: { icon: FileText, label: 'Clause', color: 'text-zinc-400' },
  commission: { icon: Percent, label: 'Commission', color: 'text-yellow-400' },
  'identity-verification': { icon: ShieldCheck, label: 'KYC / KYB', color: 'text-cyan-400' },
}

export function PropertiesPanel() {
  const { 
    nodes, 
    selectedNodeId, 
    updateNodeData, 
    deleteNode, 
    setSelectedNodeId, 
    isPropertiesPanelOpen,
    validationErrors,
    invalidNodeIds,
  } = useContractStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')

  const selectedNode = useMemo(() => 
    nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  )

  const nodeValidation = useMemo(() => 
    selectedNodeId ? validationErrors[selectedNodeId] : null,
    [validationErrors, selectedNodeId]
  )

  const isNodeValid = useMemo(() =>
    selectedNodeId ? !invalidNodeIds.includes(selectedNodeId) : true,
    [invalidNodeIds, selectedNodeId]
  )

  // Navigation between invalid nodes
  const currentInvalidIndex = useMemo(() => {
    if (!selectedNodeId || invalidNodeIds.length === 0) return -1
    return invalidNodeIds.indexOf(selectedNodeId)
  }, [selectedNodeId, invalidNodeIds])

  const canNavigatePrev = useMemo(() => {
    if (invalidNodeIds.length === 0) return false
    if (currentInvalidIndex === -1) return invalidNodeIds.length > 0
    return currentInvalidIndex > 0
  }, [invalidNodeIds, currentInvalidIndex])

  const canNavigateNext = useMemo(() => {
    if (invalidNodeIds.length === 0) return false
    if (currentInvalidIndex === -1) return invalidNodeIds.length > 0
    return currentInvalidIndex < invalidNodeIds.length - 1
  }, [invalidNodeIds, currentInvalidIndex])

  const handleNavigatePrev = useCallback(() => {
    if (invalidNodeIds.length === 0) return
    if (currentInvalidIndex === -1) {
      // Not on an invalid node, go to the last invalid node
      setSelectedNodeId(invalidNodeIds[invalidNodeIds.length - 1])
    } else if (currentInvalidIndex > 0) {
      setSelectedNodeId(invalidNodeIds[currentInvalidIndex - 1])
    }
  }, [invalidNodeIds, currentInvalidIndex, setSelectedNodeId])

  const handleNavigateNext = useCallback(() => {
    if (invalidNodeIds.length === 0) return
    if (currentInvalidIndex === -1) {
      // Not on an invalid node, go to the first invalid node
      setSelectedNodeId(invalidNodeIds[0])
    } else if (currentInvalidIndex < invalidNodeIds.length - 1) {
      setSelectedNodeId(invalidNodeIds[currentInvalidIndex + 1])
    }
  }, [invalidNodeIds, currentInvalidIndex, setSelectedNodeId])

  const handleUpdateField = useCallback((field: string, value: unknown) => {
    if (selectedNodeId) {
      updateNodeData(selectedNodeId, { [field]: value })
    }
  }, [selectedNodeId, updateNodeData])

  const handleDelete = useCallback(() => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId)
    }
  }, [selectedNodeId, deleteNode])

  const handleGenerateClause = useCallback(async () => {
    if (!aiPrompt.trim() || !selectedNodeId) return

    setIsGenerating(true)
    
    // Simulate AI generation - in production, this would call an API
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    const generatedContent = `Based on your requirements: "${aiPrompt}"\n\nThe parties hereby agree to the following terms and conditions. This clause shall be binding upon both parties and their respective successors, assigns, and legal representatives. Any breach of this clause shall be subject to the remedies specified in this agreement.`
    
    updateNodeData(selectedNodeId, {
      content: generatedContent,
      aiGenerated: true,
      aiPrompt: aiPrompt,
    })
    
    setAiPrompt('')
    setIsGenerating(false)
  }, [aiPrompt, selectedNodeId, updateNodeData])

  if (!isPropertiesPanelOpen || !selectedNode) {
    return null
  }

  const config = nodeConfig[selectedNode.type as NodeType]
  const Icon = config.icon

  return (
    <TooltipProvider>
      <div className="w-80 border-l border-border bg-card/50 backdrop-blur-sm flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon className={cn('w-4 h-4', config.color)} />
            <span className="text-sm font-semibold text-foreground">{config.label}</span>
            {!isNodeValid ? (
              <Badge variant="destructive" className="text-xs bg-red-500/10 text-red-400 border-red-500/20">
                <AlertCircle className="w-3 h-3 mr-1" />
                Incomplete
              </Badge>
            ) : (
              <Badge className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <Check className="w-3 h-3 mr-1" />
                Valid
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 bg-transparent"
              onClick={() => setSelectedNodeId(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Issue Navigation */}
        {invalidNodeIds.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-red-500/5 border-b border-red-500/20">
            <div className="flex items-center gap-2 text-xs">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-400 font-medium">
                {invalidNodeIds.length} issue{invalidNodeIds.length !== 1 ? 's' : ''} found
              </span>
              {currentInvalidIndex >= 0 && (
                <span className="text-muted-foreground">
                  ({currentInvalidIndex + 1} of {invalidNodeIds.length})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 bg-transparent"
                onClick={handleNavigatePrev}
                disabled={!canNavigatePrev}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 bg-transparent"
                onClick={handleNavigateNext}
                disabled={!canNavigateNext}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Common Fields */}
            <div className="space-y-2">
              <Label htmlFor="label" className="text-xs text-muted-foreground">Display Label</Label>
              <Input
                id="label"
                value={selectedNode.data.label || ''}
                onChange={(e) => handleUpdateField('label', e.target.value)}
                className="h-9"
              />
            </div>

            <Separator />

            {/* Node-specific Fields */}
            {(selectedNode.type === 'party-payer' || selectedNode.type === 'party-payee') && (
              <PartyFields 
                data={selectedNode.data} 
                onUpdate={handleUpdateField} 
                errors={nodeValidation?.errors || {}}
              />
            )}

            {selectedNode.type === 'milestone' && (
              <MilestoneFields 
                data={selectedNode.data} 
                onUpdate={handleUpdateField}
                errors={nodeValidation?.errors || {}}
              />
            )}

            {selectedNode.type === 'condition' && (
              <ConditionFields 
                data={selectedNode.data} 
                onUpdate={handleUpdateField}
                errors={nodeValidation?.errors || {}}
              />
            )}

            {selectedNode.type === 'payment' && (
              <PaymentFields data={selectedNode.data} onUpdate={handleUpdateField} />
            )}

            {selectedNode.type === 'signature' && (
              <SignatureFields data={selectedNode.data} onUpdate={handleUpdateField} />
            )}

            {selectedNode.type === 'clause' && (
              <ClauseFields 
                data={selectedNode.data} 
                onUpdate={handleUpdateField}
                aiPrompt={aiPrompt}
                setAiPrompt={setAiPrompt}
                isGenerating={isGenerating}
                onGenerate={handleGenerateClause}
                errors={nodeValidation?.errors || {}}
              />
            )}

            {selectedNode.type === 'commission' && (
              <CommissionFields 
                data={selectedNode.data} 
                onUpdate={handleUpdateField}
                errors={nodeValidation?.errors || {}}
              />
            )}

            {selectedNode.type === 'identity-verification' && (
              <IdentityVerificationFields 
                data={selectedNode.data} 
                onUpdate={handleUpdateField}
                errors={nodeValidation?.errors || {}}
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}

interface FieldProps {
  data: Record<string, unknown>
  onUpdate: (field: string, value: unknown) => void
  errors?: Record<string, string[]>
}

function FieldError({ errors, field }: { errors?: Record<string, string[]>; field: string }) {
  const fieldErrors = errors?.[field]
  if (!fieldErrors?.length) return null
  return (
    <p className="text-xs text-red-400 mt-1">{fieldErrors[0]}</p>
  )
}

function PartyFields({ data, onUpdate, errors }: FieldProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name" className="text-xs text-muted-foreground">
          Full Name <span className="text-red-400">*</span>
        </Label>
        <Input
          id="name"
          value={(data.name as string) || ''}
          onChange={(e) => onUpdate('name', e.target.value)}
          placeholder="John Doe"
          className={cn('h-9', errors?.name && 'border-red-500/50 focus-visible:ring-red-500')}
        />
        <FieldError errors={errors} field="name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-xs text-muted-foreground">
          Email Address <span className="text-red-400">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          value={(data.email as string) || ''}
          onChange={(e) => onUpdate('email', e.target.value)}
          placeholder="john@example.com"
          className={cn('h-9', errors?.email && 'border-red-500/50 focus-visible:ring-red-500')}
        />
        <FieldError errors={errors} field="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wallet" className="text-xs text-muted-foreground">Wallet Address</Label>
        <Input
          id="wallet"
          value={(data.walletAddress as string) || ''}
          onChange={(e) => onUpdate('walletAddress', e.target.value)}
          placeholder="0x..."
          className="h-9 font-mono text-xs"
        />
      </div>
    </>
  )
}

function MilestoneFields({ data, onUpdate, errors }: FieldProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="title" className="text-xs text-muted-foreground">
          Title <span className="text-red-400">*</span>
        </Label>
        <Input
          id="title"
          value={(data.title as string) || ''}
          onChange={(e) => onUpdate('title', e.target.value)}
          className={cn('h-9', errors?.title && 'border-red-500/50 focus-visible:ring-red-500')}
        />
        <FieldError errors={errors} field="title" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description" className="text-xs text-muted-foreground">
          Description <span className="text-red-400">*</span>
        </Label>
        <Textarea
          id="description"
          value={(data.description as string) || ''}
          onChange={(e) => onUpdate('description', e.target.value)}
          rows={3}
          className={cn('resize-none', errors?.description && 'border-red-500/50 focus-visible:ring-red-500')}
        />
        <FieldError errors={errors} field="description" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-xs text-muted-foreground">Amount</Label>
          <Input
            id="amount"
            type="number"
            value={(data.amount as number) || 0}
            onChange={(e) => onUpdate('amount', parseFloat(e.target.value) || 0)}
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency" className="text-xs text-muted-foreground">Currency</Label>
          <Select
            value={(data.currency as string) || 'USDC'}
            onValueChange={(value) => onUpdate('currency', value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USDC">USDC</SelectItem>
              <SelectItem value="USDT">USDT</SelectItem>
              <SelectItem value="ETH">ETH</SelectItem>
              <SelectItem value="DAI">DAI</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="verification" className="text-xs text-muted-foreground">
          Verification Criteria <span className="text-red-400">*</span>
          <span className="ml-1 text-purple-400">(AI-verified)</span>
        </Label>
        <Textarea
          id="verification"
          value={(data.verificationCriteria as string) || ''}
          onChange={(e) => onUpdate('verificationCriteria', e.target.value)}
          placeholder="Describe how completion is verified..."
          rows={3}
          className={cn('resize-none', errors?.verificationCriteria && 'border-red-500/50 focus-visible:ring-red-500')}
        />
        <FieldError errors={errors} field="verificationCriteria" />
      </div>
    </>
  )
}

function ConditionFields({ data, onUpdate, errors }: FieldProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="conditionType" className="text-xs text-muted-foreground">Condition Type</Label>
        <Select
          value={(data.type as string) || 'if-else'}
          onValueChange={(value) => onUpdate('type', value)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="if-else">If/Else</SelectItem>
            <SelectItem value="approval">Approval</SelectItem>
            <SelectItem value="time-based">Time-Based</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="condition" className="text-xs text-muted-foreground">
          Condition Logic <span className="text-red-400">*</span>
        </Label>
        <Textarea
          id="condition"
          value={(data.condition as string) || ''}
          onChange={(e) => onUpdate('condition', e.target.value)}
          placeholder="Describe the condition..."
          rows={2}
          className={cn('resize-none', errors?.condition && 'border-red-500/50 focus-visible:ring-red-500')}
        />
        <FieldError errors={errors} field="condition" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="trueLabel" className="text-xs text-emerald-400">True Branch</Label>
          <Input
            id="trueLabel"
            value={(data.trueLabel as string) || 'Yes'}
            onChange={(e) => onUpdate('trueLabel', e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="falseLabel" className="text-xs text-red-400">False Branch</Label>
          <Input
            id="falseLabel"
            value={(data.falseLabel as string) || 'No'}
            onChange={(e) => onUpdate('falseLabel', e.target.value)}
            className="h-9"
          />
        </div>
      </div>
    </>
  )
}

function PaymentFields({ data, onUpdate }: Omit<FieldProps, 'errors'>) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="paymentAmount" className="text-xs text-muted-foreground">Amount</Label>
          <Input
            id="paymentAmount"
            type="number"
            value={(data.amount as number) || 0}
            onChange={(e) => onUpdate('amount', parseFloat(e.target.value) || 0)}
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentCurrency" className="text-xs text-muted-foreground">Currency</Label>
          <Select
            value={(data.currency as string) || 'USDC'}
            onValueChange={(value) => onUpdate('currency', value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USDC">USDC</SelectItem>
              <SelectItem value="USDT">USDT</SelectItem>
              <SelectItem value="ETH">ETH</SelectItem>
              <SelectItem value="DAI">DAI</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="triggerType" className="text-xs text-muted-foreground">Trigger Type</Label>
        <Select
          value={(data.triggerType as string) || 'milestone-completion'}
          onValueChange={(value) => onUpdate('triggerType', value)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="milestone-completion">Milestone Completion</SelectItem>
            <SelectItem value="manual">Manual Release</SelectItem>
            <SelectItem value="time-based">Time-Based</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

function SignatureFields({ data, onUpdate }: Omit<FieldProps, 'errors'>) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="signerRole" className="text-xs text-muted-foreground">Signer Role</Label>
        <Select
          value={(data.signerRole as string) || 'payer'}
          onValueChange={(value) => onUpdate('signerRole', value)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="payer">Payer (Client)</SelectItem>
            <SelectItem value="payee">Payee (Provider)</SelectItem>
            <SelectItem value="witness">Witness</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between py-2">
        <div>
          <Label htmlFor="required" className="text-sm">Required</Label>
          <p className="text-xs text-muted-foreground">Contract requires this signature</p>
        </div>
        <Switch
          id="required"
          checked={(data.required as boolean) ?? true}
          onCheckedChange={(checked) => onUpdate('required', checked)}
        />
      </div>
    </>
  )
}

interface ClauseFieldsProps extends FieldProps {
  aiPrompt: string
  setAiPrompt: (value: string) => void
  isGenerating: boolean
  onGenerate: () => void
}

function ClauseFields({ data, onUpdate, aiPrompt, setAiPrompt, isGenerating, onGenerate, errors }: ClauseFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="clauseTitle" className="text-xs text-muted-foreground">
          Clause Title <span className="text-red-400">*</span>
        </Label>
        <Input
          id="clauseTitle"
          value={(data.title as string) || ''}
          onChange={(e) => onUpdate('title', e.target.value)}
          className={cn('h-9', errors?.title && 'border-red-500/50 focus-visible:ring-red-500')}
        />
        <FieldError errors={errors} field="title" />
      </div>

      {/* AI Generation */}
      <div className="space-y-2 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-300">AI Clause Generator</span>
        </div>
        <Textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Describe the clause in natural language..."
          rows={2}
          className="resize-none bg-background/50"
        />
        <Button
          size="sm"
          className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
          onClick={onGenerate}
          disabled={isGenerating || !aiPrompt.trim()}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Clause
            </>
          )}
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content" className="text-xs text-muted-foreground">
          Clause Content <span className="text-red-400">*</span>
        </Label>
        <Textarea
          id="content"
          value={(data.content as string) || ''}
          onChange={(e) => onUpdate('content', e.target.value)}
          rows={6}
          className={cn('resize-none font-mono text-xs', errors?.content && 'border-red-500/50 focus-visible:ring-red-500')}
        />
        <FieldError errors={errors} field="content" />
      </div>

      {data.aiGenerated && (
        <div className="flex items-center gap-2 text-xs text-purple-400">
          <Sparkles className="w-3 h-3" />
          AI-generated content
        </div>
      )}
    </>
  )
}

function CommissionFields({ data, onUpdate, errors }: FieldProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="recipientName" className="text-xs text-muted-foreground">
          Recipient Name <span className="text-red-400">*</span>
        </Label>
        <Input
          id="recipientName"
          value={(data.recipientName as string) || ''}
          onChange={(e) => onUpdate('recipientName', e.target.value)}
          placeholder="Agency or partner name"
          className={cn('h-9', errors?.recipientName && 'border-red-500/50 focus-visible:ring-red-500')}
        />
        <FieldError errors={errors} field="recipientName" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="recipientAddress" className="text-xs text-muted-foreground">
          Wallet Address <span className="text-red-400">*</span>
        </Label>
        <Input
          id="recipientAddress"
          value={(data.recipientAddress as string) || ''}
          onChange={(e) => onUpdate('recipientAddress', e.target.value)}
          placeholder="0x..."
          className={cn('h-9 font-mono text-xs', errors?.recipientAddress && 'border-red-500/50 focus-visible:ring-red-500')}
        />
        <FieldError errors={errors} field="recipientAddress" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="percentage" className="text-xs text-muted-foreground">
          Commission Percentage
          <span className="ml-1 text-yellow-400">(max 10%)</span>
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="percentage"
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={(data.percentage as number) || 0}
            onChange={(e) => onUpdate('percentage', Math.min(10, parseFloat(e.target.value) || 0))}
            className="h-9"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>
    </>
  )
}

function IdentityVerificationFields({ data, onUpdate, errors }: FieldProps) {
  const verificationType = (data.verificationType as string) || 'kyc'
  const requirements = (data.requirements as Record<string, unknown>) || {}
  const kycRequirements = (requirements.kyc as Record<string, boolean>) || {}
  const kybRequirements = (requirements.kyb as Record<string, boolean>) || {}

  const updateRequirement = (type: 'kyc' | 'kyb', field: string, value: boolean) => {
    const currentReqs = (data.requirements as Record<string, unknown>) || {}
    const typeReqs = (currentReqs[type] as Record<string, boolean>) || {}
    onUpdate('requirements', {
      ...currentReqs,
      [type]: { ...typeReqs, [field]: value },
      blockSanctioned: (currentReqs.blockSanctioned as boolean) ?? true,
    })
  }

  return (
    <>
      {/* Verification Type */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Verification Type <span className="text-red-400">*</span>
        </Label>
        <Select
          value={verificationType}
          onValueChange={(value) => onUpdate('verificationType', value)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kyc">KYC (Individual)</SelectItem>
            <SelectItem value="kyb">KYB (Business)</SelectItem>
            <SelectItem value="both">Both KYC + KYB</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Required For */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Required For <span className="text-red-400">*</span>
        </Label>
        <Select
          value={(data.requiredFor as string) || 'both'}
          onValueChange={(value) => onUpdate('requiredFor', value)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="payer">Payer Only</SelectItem>
            <SelectItem value="payee">Payee Only</SelectItem>
            <SelectItem value="both">Both Parties</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trigger Point */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Trigger Point</Label>
        <Select
          value={(data.triggerPoint as string) || 'before_signing'}
          onValueChange={(value) => onUpdate('triggerPoint', value)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="before_signing">Before Signing</SelectItem>
            <SelectItem value="before_funding">Before Funding</SelectItem>
            <SelectItem value="before_milestone">Before Milestone</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* KYC Requirements */}
      {(verificationType === 'kyc' || verificationType === 'both') && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            <Label className="text-xs font-medium text-cyan-400">KYC Requirements</Label>
          </div>
          <div className="space-y-2 pl-6">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Government ID</Label>
              <Switch
                checked={kycRequirements.governmentId ?? true}
                onCheckedChange={(checked) => updateRequirement('kyc', 'governmentId', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Selfie Verification</Label>
              <Switch
                checked={kycRequirements.selfie ?? true}
                onCheckedChange={(checked) => updateRequirement('kyc', 'selfie', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Proof of Address</Label>
              <Switch
                checked={kycRequirements.proofOfAddress ?? false}
                onCheckedChange={(checked) => updateRequirement('kyc', 'proofOfAddress', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Accredited Investor</Label>
              <Switch
                checked={kycRequirements.accreditedInvestor ?? false}
                onCheckedChange={(checked) => updateRequirement('kyc', 'accreditedInvestor', checked)}
              />
            </div>
          </div>
        </div>
      )}

      {/* KYB Requirements */}
      {(verificationType === 'kyb' || verificationType === 'both') && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-400" />
            <Label className="text-xs font-medium text-teal-400">KYB Requirements</Label>
          </div>
          <div className="space-y-2 pl-6">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Business Registration</Label>
              <Switch
                checked={kybRequirements.businessRegistration ?? true}
                onCheckedChange={(checked) => updateRequirement('kyb', 'businessRegistration', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Business Address</Label>
              <Switch
                checked={kybRequirements.proofOfAddress ?? true}
                onCheckedChange={(checked) => updateRequirement('kyb', 'proofOfAddress', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Beneficial Owners (UBO)</Label>
              <Switch
                checked={kybRequirements.beneficialOwners ?? true}
                onCheckedChange={(checked) => updateRequirement('kyb', 'beneficialOwners', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Authorized Signatory</Label>
              <Switch
                checked={kybRequirements.authorizedSignatory ?? false}
                onCheckedChange={(checked) => updateRequirement('kyb', 'authorizedSignatory', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Financial Statements</Label>
              <Switch
                checked={kybRequirements.financialStatements ?? false}
                onCheckedChange={(checked) => updateRequirement('kyb', 'financialStatements', checked)}
              />
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Sanctions Screening */}
      <div className="flex items-center justify-between py-2">
        <div>
          <Label className="text-sm">Block Sanctioned</Label>
          <p className="text-xs text-muted-foreground">OFAC/sanctions screening</p>
        </div>
        <Switch
          checked={(requirements.blockSanctioned as boolean) ?? true}
          onCheckedChange={(checked) => onUpdate('requirements', { ...requirements, blockSanctioned: checked })}
        />
      </div>

      {/* Persona Integration Note */}
      <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-medium text-cyan-400">Powered by Persona</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Identity verification is handled securely via Persona integration with real-time status updates.
        </p>
      </div>
    </>
  )
}
