'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@bu/ui/button'
import { Textarea } from '@bu/ui/textarea'
import { Input } from '@bu/ui/input'
import { Badge } from '@bu/ui/badge'
import { ScrollArea } from '@bu/ui/scroll-area'
import { Progress } from '@bu/ui/progress'
import { cn } from '@bu/ui/cn'
import { useContractStore } from '@/lib/contract-store'
import type { ContractNode } from '@bu/contracts/contract-flow'
import {
  analyzePromptCompleteness,
  generateScopeChecklist,
  calculateChecklistCompletion,
  type PromptAnalysisResult,
  type ScopeChecklistItem,
  type ProjectRequirements,
} from '@/lib/scope-validation'
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Lightbulb,
  Building2,
  User,
  Target,
  GitBranch,
  Banknote,
  PenLine,
  FileText,
  Percent,
  CheckCircle2,
  Circle,
  Zap,
  AlertCircle,
  HelpCircle,
  Clock,
  Users,
  FileCheck,
  Scale,
  ChevronRight,
  MessageSquare,
} from 'lucide-react'

const examplePrompts = [
  {
    title: 'Freelance Web Development',
    prompt: 'I need a contract for a freelance web developer building an e-commerce website. The project has 3 milestones: design mockups ($3,000), frontend development ($6,000), and backend integration ($6,000). Total budget is $15,000 USDC with payments after each milestone approval. Project duration is 8 weeks. The client is ABC Corp and the developer is a freelancer.',
  },
  {
    title: 'International Product Import',
    prompt: 'Create a trade contract for importing electronics from a supplier in China. The order is $50,000 worth of products with payment split: 30% upfront ($15,000), 40% when shipped ($20,000), 30% after delivery inspection ($15,000). Include a quality inspection condition. Timeline is 6 weeks from order to delivery.',
  },
  {
    title: 'Content Creator Campaign',
    prompt: 'I want to hire an influencer for a marketing campaign. They will create 3 Instagram posts and 2 TikTok videos over 4 weeks. Budget is $8,000 - $2,000 upfront, $3,000 after content delivery, $3,000 based on engagement targets. Include performance conditions for minimum engagement.',
  },
  {
    title: 'Consulting Retainer',
    prompt: 'Set up a monthly consulting retainer agreement for business advisory services. $5,000/month for 3 months ($15,000 total) with weekly check-in milestones. Include early termination clause if deliverables are not met. Consultant provides strategic guidance and market analysis.',
  },
]

interface GeneratedNode {
  type: string
  label: string
  description: string
  data: Record<string, unknown>
}

interface GeneratedContract {
  nodes: GeneratedNode[]
  connections: { from: number; to: number }[]
  summary: string
  requirements: Partial<ProjectRequirements>
}

type Step = 'input' | 'analysis' | 'refine' | 'preview' | 'building'

const categoryIcons = {
  parties: Users,
  deliverables: FileCheck,
  timeline: Clock,
  payment: Banknote,
  conditions: GitBranch,
  legal: Scale,
}

const categoryLabels = {
  parties: 'Parties',
  deliverables: 'Deliverables',
  timeline: 'Timeline',
  payment: 'Payment',
  conditions: 'Conditions',
  legal: 'Legal',
}

export function AiContractBuilder({ onBack }: { onBack: () => void }) {
  const { addNode, clearCanvas, onConnect } = useContractStore()
  const [prompt, setPrompt] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<PromptAnalysisResult | null>(null)
  const [checklist, setChecklist] = useState<ScopeChecklistItem[]>([])
  const [generatedContract, setGeneratedContract] = useState<GeneratedContract | null>(null)
  const [step, setStep] = useState<Step>('input')
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({})
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Re-analyze when prompt changes
  useEffect(() => {
    if (prompt.length > 50 && step === 'input') {
      const result = analyzePromptCompleteness(prompt)
      setAnalysis(result)
    }
  }, [prompt, step])

  const handleAnalyze = async () => {
    if (!prompt.trim()) return
    
    setIsAnalyzing(true)
    setStep('analysis')
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const result = analyzePromptCompleteness(prompt)
    setAnalysis(result)
    
    // Generate checklist based on extracted data
    const checklistItems = generateScopeChecklist(result.extractedData)
    setChecklist(checklistItems)
    
    setIsAnalyzing(false)
    
    // If confidence is high enough, go to preview
    if (result.confidence >= 75 && result.missingCritical.length === 0) {
      await handleGenerateContract(result)
    }
  }

  const handleGenerateContract = async (analysisResult?: PromptAnalysisResult) => {
    const currentAnalysis = analysisResult || analysis
    if (!currentAnalysis) return
    
    setIsAnalyzing(true)
    
    // Simulate AI generation with clarification answers
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Generate contract structure
    const generated = generateContractFromAnalysis(prompt, currentAnalysis, clarificationAnswers)
    setGeneratedContract(generated)
    setIsAnalyzing(false)
    setStep('preview')
  }

  const handleConfirmAndBuild = async () => {
    if (!generatedContract) return
    
    setStep('building')
    clearCanvas()
    
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const nodeSpacingX = 300
    const nodeSpacingY = 180
    const startX = 100
    const startY = 100
    
    const createdNodeIds: string[] = []
    
    for (let i = 0; i < generatedContract.nodes.length; i++) {
      const nodeConfig = generatedContract.nodes[i]
      const timestamp = Date.now()
      const nodeId = `${nodeConfig.type}-${timestamp}-${i}`
      createdNodeIds.push(nodeId)
      
      const col = i % 3
      const row = Math.floor(i / 3)
      
      const node: ContractNode = {
        id: nodeId,
        type: nodeConfig.type as ContractNode['type'],
        position: { 
          x: startX + col * nodeSpacingX, 
          y: startY + row * nodeSpacingY 
        },
        data: {
          label: nodeConfig.label,
          ...nodeConfig.data,
        },
      }
      
      addNode(node)
      await new Promise(resolve => setTimeout(resolve, 150))
    }
    
    // Connect nodes
    for (const connection of generatedContract.connections) {
      if (createdNodeIds[connection.from] && createdNodeIds[connection.to]) {
        onConnect({
          source: createdNodeIds[connection.from],
          target: createdNodeIds[connection.to],
          sourceHandle: 'source',
          targetHandle: 'target',
        })
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'party-payer': return Building2
      case 'party-payee': return User
      case 'milestone': return Target
      case 'condition': return GitBranch
      case 'payment': return Banknote
      case 'signature': return PenLine
      case 'clause': return FileText
      case 'commission': return Percent
      default: return Target
    }
  }

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'party-payer': return 'bg-[#6854CF]/10 text-[#6854CF] border-[#6854CF]/30'
      case 'party-payee': return 'bg-[#82e664]/10 text-[#5cb346] border-[#82e664]/30'
      case 'milestone': return 'bg-[#C4A1FF]/10 text-[#6854CF] border-[#C4A1FF]/30'
      case 'condition': return 'bg-[#FFE48C]/10 text-[#c9a93a] border-[#FFE48C]/30'
      case 'payment': return 'bg-[#82e664]/10 text-[#5cb346] border-[#82e664]/30'
      case 'signature': return 'bg-[#6854CF]/10 text-[#6854CF] border-[#6854CF]/30'
      case 'clause': return 'bg-[#E2D0FC]/10 text-[#6854CF] border-[#E2D0FC]/30'
      case 'commission': return 'bg-[#FEADEC]/10 text-[#e07bc7] border-[#FEADEC]/30'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const checklistCompletion = checklist.length > 0 
    ? calculateChecklistCompletion(checklist)
    : { percentage: 0, requiredPercentage: 0, completed: 0, total: 0, requiredCompleted: 0, requiredTotal: 0 }

  // Building state
  if (step === 'building') {
    return (
      <div className="w-full max-w-4xl mx-4 h-[85vh] flex flex-col items-center justify-center bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6854CF] to-[#C4A1FF] flex items-center justify-center">
            <Zap className="w-10 h-10 text-white animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#6854CF] to-[#C4A1FF] blur-xl opacity-30 animate-pulse" />
        </div>
        <div className="text-center mt-6">
          <h3 className="text-xl font-semibold text-foreground mb-2">Building Your Contract</h3>
          <p className="text-muted-foreground">Creating nodes and connections...</p>
        </div>
      </div>
    )
  }

  // Preview state
  if (step === 'preview' && generatedContract) {
    return (
      <div className="w-full max-w-4xl mx-4 h-[85vh] flex flex-col bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 bg-transparent"
              onClick={() => setStep('analysis')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-[#6854CF]/20 to-[#C4A1FF]/20">
              <CheckCircle2 className="w-5 h-5 text-[#6854CF]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Review Generated Contract</h2>
              <p className="text-sm text-muted-foreground">
                {generatedContract.nodes.length} nodes will be created
              </p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-6">
            <div className="p-4 rounded-xl bg-[#6854CF]/5 border border-[#6854CF]/20">
              <h3 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6854CF]" />
                AI Summary
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{generatedContract.summary}</p>
            </div>

            <div>
              <h3 className="font-medium text-foreground mb-3">Contract Structure</h3>
              <div className="space-y-2">
                {generatedContract.nodes.map((node, index) => {
                  const Icon = getNodeIcon(node.type)
                  return (
                    <div
                      key={index}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border',
                        getNodeColor(node.type)
                      )}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-background/50">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{node.label}</p>
                        <p className="text-xs opacity-70 truncate">{node.description}</p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {node.type.replace('party-', '').replace('-', ' ')}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-foreground mb-3">Connections</h3>
              <div className="flex flex-wrap gap-2">
                {generatedContract.connections.map((conn, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {generatedContract.nodes[conn.from]?.label} → {generatedContract.nodes[conn.to]?.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 flex items-center justify-between p-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => setStep('analysis')}
            className="bg-transparent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Edit Requirements
          </Button>
          <Button
            onClick={handleConfirmAndBuild}
            className="gap-2 bg-gradient-to-r from-[#6854CF] to-[#C4A1FF] hover:from-[#5a47b8] hover:to-[#b38aff]"
          >
            <Zap className="w-4 h-4" />
            Build Contract
          </Button>
        </div>
      </div>
    )
  }

  // Analysis state - show scope checklist and clarification questions
  if (step === 'analysis' && analysis) {
    const categories = [...new Set(checklist.map(item => item.category))]
    
    return (
      <div className="w-full max-w-5xl mx-4 h-[85vh] flex flex-col bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 bg-transparent"
              onClick={() => setStep('input')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-[#6854CF]/20 to-[#C4A1FF]/20">
              <FileCheck className="w-5 h-5 text-[#6854CF]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Define Project Requirements</h2>
              <p className="text-sm text-muted-foreground">
                Review and complete the scope definition
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {checklistCompletion.requiredCompleted}/{checklistCompletion.requiredTotal} Required
              </p>
              <p className="text-xs text-muted-foreground">
                {checklistCompletion.completed}/{checklistCompletion.total} Total
              </p>
            </div>
            <div className="w-24">
              <Progress 
                value={checklistCompletion.requiredPercentage} 
                className="h-2 bg-muted"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Sidebar - Categories */}
          <div className="w-64 border-r border-border bg-muted/30 p-4 flex-shrink-0">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 px-2">Categories</h3>
            <div className="space-y-1">
              {categories.map(category => {
                const Icon = categoryIcons[category as keyof typeof categoryIcons]
                const categoryItems = checklist.filter(item => item.category === category)
                const completedCount = categoryItems.filter(item => item.isComplete).length
                const hasRequired = categoryItems.some(item => item.isRequired && !item.isComplete)
                
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                      activeCategory === category
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-sm font-medium">
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </span>
                    <span className={cn(
                      'text-xs',
                      completedCount === categoryItems.length 
                        ? 'text-[#82e664]' 
                        : hasRequired 
                          ? 'text-[#FF507A]'
                          : 'text-muted-foreground'
                    )}>
                      {completedCount}/{categoryItems.length}
                    </span>
                    {hasRequired && <AlertCircle className="w-3.5 h-3.5 text-[#FF507A]" />}
                  </button>
                )
              })}
            </div>

            {/* Confidence Score */}
            <div className="mt-6 p-4 rounded-xl bg-background border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">AI Confidence</span>
                <span className={cn(
                  'text-sm font-bold',
                  analysis.confidence >= 75 ? 'text-[#82e664]' :
                  analysis.confidence >= 50 ? 'text-[#FFE48C]' :
                  'text-[#FF507A]'
                )}>
                  {analysis.confidence}%
                </span>
              </div>
              <Progress 
                value={analysis.confidence} 
                className={cn(
                  'h-2',
                  analysis.confidence >= 75 ? '[&>div]:bg-[#82e664]' :
                  analysis.confidence >= 50 ? '[&>div]:bg-[#FFE48C]' :
                  '[&>div]:bg-[#FF507A]'
                )}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {analysis.confidence >= 75 
                  ? 'Ready to generate contract'
                  : 'Answer questions to improve'}
              </p>
            </div>
          </div>

          {/* Main Content */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 space-y-6">
              {/* Missing Critical Items */}
              {analysis.missingCritical.length > 0 && (
                <div className="p-4 rounded-xl bg-[#FF507A]/5 border border-[#FF507A]/20">
                  <h3 className="font-medium text-[#FF507A] mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Missing Required Information
                  </h3>
                  <ul className="space-y-1">
                    {analysis.missingCritical.map((item, index) => (
                      <li key={index} className="text-sm text-foreground/80 flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 text-[#FF507A]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clarification Questions */}
              {analysis.clarificationQuestions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#6854CF]" />
                    Help AI Understand Better
                  </h3>
                  {analysis.clarificationQuestions.map((question, index) => (
                    <div key={index} className="p-4 rounded-xl bg-muted/50 border border-border">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {question}
                      </label>
                      <Input
                        value={clarificationAnswers[`q${index}`] || ''}
                        onChange={(e) => setClarificationAnswers(prev => ({
                          ...prev,
                          [`q${index}`]: e.target.value
                        }))}
                        placeholder="Type your answer..."
                        className="bg-background"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Checklist Items by Category */}
              {(activeCategory ? [activeCategory] : categories).map(category => {
                const categoryItems = checklist.filter(item => item.category === category)
                const Icon = categoryIcons[category as keyof typeof categoryIcons]
                
                return (
                  <div key={category} className="space-y-3">
                    <h3 className="font-medium text-foreground flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[#6854CF]" />
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryItems.map(item => (
                        <div
                          key={item.id}
                          className={cn(
                            'p-3 rounded-lg border transition-colors',
                            item.isComplete
                              ? 'bg-[#82e664]/5 border-[#82e664]/20'
                              : item.isRequired
                                ? 'bg-[#FF507A]/5 border-[#FF507A]/20'
                                : 'bg-muted/30 border-border'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {item.isComplete ? (
                              <CheckCircle2 className="w-4 h-4 text-[#82e664] mt-0.5" />
                            ) : (
                              <Circle className={cn(
                                'w-4 h-4 mt-0.5',
                                item.isRequired ? 'text-[#FF507A]' : 'text-muted-foreground'
                              )} />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">
                                  {item.label}
                                </span>
                                {item.isRequired && !item.isComplete && (
                                  <Badge variant="outline" className="text-[10px] border-[#FF507A]/30 text-[#FF507A]">
                                    Required
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.description}
                              </p>
                              {item.value && (
                                <p className="text-xs font-medium text-[#6854CF] mt-1">
                                  {item.value}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Original Prompt Reference */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Your Description
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep('input')}
                    className="text-xs bg-transparent h-7"
                  >
                    Edit
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{prompt}</p>
              </div>
            </div>
          </ScrollArea>
        </div>

        <div className="flex-shrink-0 flex items-center justify-between p-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => setStep('input')}
            className="bg-transparent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Edit Description
          </Button>
          <Button
            onClick={() => handleGenerateContract()}
            disabled={isAnalyzing || checklistCompletion.requiredPercentage < 50}
            className="gap-2 bg-gradient-to-r from-[#6854CF] to-[#C4A1FF] hover:from-[#5a47b8] hover:to-[#b38aff]"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Contract
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Input state
  return (
    <div className="w-full max-w-4xl mx-4 h-[85vh] flex flex-col bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 bg-transparent"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-[#6854CF]/20 to-[#C4A1FF]/20">
            <Sparkles className="w-5 h-5 text-[#6854CF]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Build with AI</h2>
            <p className="text-sm text-muted-foreground">
              Describe your contract and we'll create the flow
            </p>
          </div>
        </div>
        {analysis && prompt.length > 50 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Confidence:</span>
            <Badge 
              variant="outline" 
              className={cn(
                'text-xs',
                analysis.confidence >= 75 ? 'border-[#82e664]/30 text-[#82e664]' :
                analysis.confidence >= 50 ? 'border-[#FFE48C]/30 text-[#c9a93a]' :
                'border-[#FF507A]/30 text-[#FF507A]'
              )}
            >
              {analysis.confidence}%
            </Badge>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Describe your contract scenario
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: I need a contract for a freelance designer creating a brand identity package. The project includes logo design, color palette, and brand guidelines. Total budget is $5,000 with 3 milestone payments. The client is XYZ Company and the designer will deliver over 4 weeks..."
              className="min-h-[180px] resize-none bg-background border-border focus:border-[#6854CF] focus:ring-[#6854CF]/20"
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Include: parties, deliverables, payment amounts, conditions, and timeline
              </p>
              <span className="text-xs text-muted-foreground">{prompt.length} characters</span>
            </div>
          </div>

          {/* Real-time Analysis Feedback */}
          {analysis && prompt.length > 50 && (
            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
              <h4 className="text-sm font-medium text-foreground">Quick Analysis</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Parties', found: analysis.extractedData.parties !== undefined },
                  { label: 'Deliverables', found: analysis.extractedData.deliverables !== undefined },
                  { label: 'Payment', found: analysis.extractedData.payment !== undefined },
                  { label: 'Timeline', found: analysis.extractedData.timeline !== undefined },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.found ? (
                      <CheckCircle2 className="w-4 h-4 text-[#82e664]" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-xs text-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
              {analysis.missingCritical.length > 0 && (
                <p className="text-xs text-[#FF507A]">
                  Missing: {analysis.missingCritical.slice(0, 2).join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Example Prompts */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-[#FFE48C]" />
              <span className="text-sm font-medium text-foreground">Example scenarios</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {examplePrompts.map((example, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPrompt(example.prompt)}
                  className="p-3 rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/50 hover:border-border text-left transition-all group"
                >
                  <h4 className="font-medium text-sm text-foreground group-hover:text-[#6854CF] transition-colors">
                    {example.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {example.prompt.substring(0, 100)}...
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <h4 className="font-medium text-sm text-foreground mb-3">AI will automatically generate:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { icon: Building2, label: 'Parties', color: 'text-[#6854CF]' },
                { icon: Target, label: 'Milestones', color: 'text-[#C4A1FF]' },
                { icon: GitBranch, label: 'Conditions', color: 'text-[#FFE48C]' },
                { icon: Banknote, label: 'Payments', color: 'text-[#82e664]' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <item.icon className={cn('w-4 h-4', item.color)} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="flex-shrink-0 flex items-center justify-between p-4 border-t border-border/50">
        <p className="text-sm text-muted-foreground">
          {prompt.length > 0 ? `${prompt.length} characters` : 'Enter a description to get started'}
        </p>
        <Button
          onClick={handleAnalyze}
          disabled={prompt.length < 50 || isAnalyzing}
          className="gap-2 bg-gradient-to-r from-[#6854CF] to-[#C4A1FF] hover:from-[#5a47b8] hover:to-[#b38aff]"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Analyze & Generate
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// Generate contract structure from analysis
function generateContractFromAnalysis(
  prompt: string,
  analysis: PromptAnalysisResult,
  clarifications: Record<string, string>
): GeneratedContract {
  const lowerPrompt = prompt.toLowerCase()
  const nodes: GeneratedNode[] = []
  const connections: { from: number; to: number }[] = []
  
  // Extract payment amount if available
  const paymentAmount = analysis.extractedData.payment?.totalAmount || 0
  const currency = analysis.extractedData.payment?.currency || 'USDC'
  
  // Detect parties
  const payerName = lowerPrompt.includes('client') ? 'Client' : 
                    lowerPrompt.includes('buyer') ? 'Buyer' :
                    lowerPrompt.includes('company') ? 'Company' : 'Payer'
  
  const payeeName = lowerPrompt.includes('freelancer') ? 'Freelancer' :
                    lowerPrompt.includes('developer') ? 'Developer' :
                    lowerPrompt.includes('designer') ? 'Designer' :
                    lowerPrompt.includes('supplier') ? 'Supplier' :
                    lowerPrompt.includes('influencer') ? 'Influencer' :
                    lowerPrompt.includes('consultant') ? 'Consultant' : 'Provider'
  
  // Add payer
  nodes.push({
    type: 'party-payer',
    label: payerName,
    description: 'The party funding the contract',
    data: {
      name: payerName,
      email: '',
      role: 'payer',
      walletAddress: '',
    },
  })
  
  // Add payee
  nodes.push({
    type: 'party-payee',
    label: payeeName,
    description: 'The party delivering services/goods',
    data: {
      name: payeeName,
      email: '',
      role: 'payee',
      walletAddress: '',
    },
  })
  
  // Detect milestones
  const milestoneMatch = prompt.match(/(\d+)\s*(milestone|phase|stage)/i)
  let milestoneCount = milestoneMatch ? parseInt(milestoneMatch[1]) : 2
  milestoneCount = Math.min(Math.max(milestoneCount, 1), 5)
  
  // Calculate per-milestone payment
  const perMilestoneAmount = paymentAmount > 0 ? Math.round(paymentAmount / milestoneCount) : 0
  
  // Add milestones
  const milestoneNames = detectMilestoneNames(prompt, milestoneCount)
  for (let i = 0; i < milestoneCount; i++) {
    nodes.push({
      type: 'milestone',
      label: milestoneNames[i] || `Milestone ${i + 1}`,
      description: `Deliverable checkpoint ${i + 1}`,
      data: {
        title: milestoneNames[i] || `Milestone ${i + 1}`,
        description: `Complete deliverable for phase ${i + 1}`,
        amount: perMilestoneAmount,
        currency: currency,
        verificationCriteria: 'Deliverable meets acceptance criteria',
        aiVerificationPrompt: '',
        dueDate: '',
      },
    })
  }
  
  // Add conditions if mentioned
  const conditionKeywords = ['approval', 'review', 'inspection', 'quality', 'if', 'condition', 'target', 'engagement']
  if (conditionKeywords.some(k => lowerPrompt.includes(k))) {
    nodes.push({
      type: 'condition',
      label: 'Approval Check',
      description: 'Verification before proceeding',
      data: {
        type: 'approval',
        condition: 'Deliverable approved by client',
        trueLabel: 'Approved',
        falseLabel: 'Revision Required',
      },
    })
  }
  
  // Add payments
  for (let i = 0; i < milestoneCount; i++) {
    nodes.push({
      type: 'payment',
      label: `Payment ${i + 1}`,
      description: `Release ${perMilestoneAmount} ${currency}`,
      data: {
        amount: perMilestoneAmount,
        currency: currency,
        triggerType: 'milestone-completion',
        milestoneId: '',
      },
    })
  }
  
  // Add signature
  nodes.push({
    type: 'signature',
    label: 'Contract Signature',
    description: 'Both parties sign to activate',
    data: {
      required: true,
      signerId: '',
      signerRole: 'payer',
      signedAt: '',
    },
  })
  
  // Add clause
  nodes.push({
    type: 'clause',
    label: 'Terms & Conditions',
    description: 'Legal terms governing the contract',
    data: {
      title: 'Terms & Conditions',
      content: 'Standard contract terms apply. Both parties agree to the deliverables, timeline, and payment structure defined in this contract.',
      aiGenerated: true,
      aiPrompt: prompt,
    },
  })
  
  // Generate connections
  const signatureIndex = nodes.findIndex(n => n.type === 'signature')
  const milestoneIndices = nodes.map((n, i) => n.type === 'milestone' ? i : -1).filter(i => i >= 0)
  const paymentIndices = nodes.map((n, i) => n.type === 'payment' ? i : -1).filter(i => i >= 0)
  const conditionIndex = nodes.findIndex(n => n.type === 'condition')
  
  // Payer -> Signature
  connections.push({ from: 0, to: signatureIndex })
  
  // Signature -> First Milestone
  if (milestoneIndices.length > 0) {
    connections.push({ from: signatureIndex, to: milestoneIndices[0] })
  }
  
  // Connect milestones and payments
  milestoneIndices.forEach((mi, i) => {
    // Milestone -> Condition (if exists) or Payment
    if (conditionIndex >= 0 && i === 0) {
      connections.push({ from: mi, to: conditionIndex })
      connections.push({ from: conditionIndex, to: paymentIndices[i] })
    } else if (paymentIndices[i] !== undefined) {
      connections.push({ from: mi, to: paymentIndices[i] })
    }
    
    // Connect to next milestone
    if (i < milestoneIndices.length - 1) {
      const source = paymentIndices[i] !== undefined ? paymentIndices[i] : mi
      connections.push({ from: source, to: milestoneIndices[i + 1] })
    }
  })
  
  // Last payment -> Payee
  if (paymentIndices.length > 0) {
    connections.push({ from: paymentIndices[paymentIndices.length - 1], to: 1 })
  }
  
  // Generate summary
  const summary = `This ${analysis.extractedData.projectType || 'custom'} contract involves ${payerName} as the funding party and ${payeeName} as the service provider. The project is structured with ${milestoneCount} milestone${milestoneCount > 1 ? 's' : ''}, each with associated payment releases${paymentAmount > 0 ? ` totaling ${paymentAmount} ${currency}` : ''}. ${conditionIndex >= 0 ? 'Approval conditions are in place to verify deliverables before payment release.' : ''} Both parties must sign to activate the contract.`
  
  return {
    nodes,
    connections,
    summary,
    requirements: analysis.extractedData,
  }
}

function detectMilestoneNames(prompt: string, count: number): string[] {
  const names: string[] = []
  
  // Try to extract milestone names from prompt
  const patterns = [
    /milestone[s]?\s*[:\-]?\s*([^,\.]+(?:,\s*[^,\.]+)*)/i,
    /phase[s]?\s*[:\-]?\s*([^,\.]+(?:,\s*[^,\.]+)*)/i,
    /deliverable[s]?\s*[:\-]?\s*([^,\.]+(?:,\s*[^,\.]+)*)/i,
  ]
  
  for (const pattern of patterns) {
    const match = prompt.match(pattern)
    if (match && match[1]) {
      const extracted = match[1].split(/,|and/).map(s => s.trim()).filter(s => s.length > 0)
      if (extracted.length > 0) {
        return extracted.slice(0, count)
      }
    }
  }
  
  // Common milestone patterns
  const lowerPrompt = prompt.toLowerCase()
  if (lowerPrompt.includes('design') && lowerPrompt.includes('develop')) {
    names.push('Design Phase', 'Development Phase', 'Testing & Launch')
  } else if (lowerPrompt.includes('logo') || lowerPrompt.includes('brand')) {
    names.push('Concept Design', 'Brand Guidelines', 'Final Delivery')
  } else if (lowerPrompt.includes('website') || lowerPrompt.includes('web')) {
    names.push('Design Mockups', 'Frontend Development', 'Backend Integration')
  } else if (lowerPrompt.includes('content') || lowerPrompt.includes('video')) {
    names.push('Content Creation', 'Review & Approval', 'Final Delivery')
  }
  
  // Pad with generic names
  while (names.length < count) {
    names.push(`Milestone ${names.length + 1}`)
  }
  
  return names.slice(0, count)
}
