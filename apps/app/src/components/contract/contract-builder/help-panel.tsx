'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@bu/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@bu/ui/sheet'
import { ScrollArea } from '@bu/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@bu/ui/tabs'
import { Badge } from '@bu/ui/badge'
import {
  HelpCircle,
  X,
  Workflow,
  MousePointer,
  GitBranch,
  PenLine,
  Users,
  Target,
  Banknote,
  FileText,
  Percent,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Keyboard,
  Link2,
} from 'lucide-react'
import { cn } from '@bu/ui/cn'

interface HelpPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpPanel({ open, onOpenChange }: HelpPanelProps) {
  const [activeTab, setActiveTab] = useState('basics')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 bg-card border-border flex flex-col h-full overflow-hidden">
        <SheetHeader className="flex-shrink-0 p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900">
                <HelpCircle className="w-5 h-5 text-purpleDanis" />
              </div>
              <div>
                <SheetTitle className="text-lg font-semibold text-foreground">
                  Contract Builder Guide
                </SheetTitle>
                <p className="text-sm text-muted-foreground">
                  Learn how to build contracts with the visual editor
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 bg-transparent"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="flex-shrink-0 px-6 pt-4">
            <TabsList className="w-full grid grid-cols-4 bg-muted/50">
              <TabsTrigger value="basics" className="text-xs">Basics</TabsTrigger>
              <TabsTrigger value="nodes" className="text-xs">Nodes</TabsTrigger>
              <TabsTrigger value="logic" className="text-xs">Logic Flow</TabsTrigger>
              <TabsTrigger value="tips" className="text-xs">Tips</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 space-y-6">
              {/* Basics Tab */}
              <TabsContent value="basics" className="mt-0 space-y-6">
                <Section title="Getting Started" icon={Workflow}>
                  <p className="text-sm text-muted-foreground mb-4">
                    The BUFI Contract Builder uses a visual flow-based approach to create smart escrow contracts. 
                    Drag nodes onto the canvas and connect them to define your contract logic.
                  </p>
                  
                  <StepList steps={[
                    'Choose a template or start from scratch with AI assistance',
                    'Add nodes from the left sidebar by dragging them onto the canvas',
                    'Connect nodes by dragging from one handle to another',
                    'Configure each node by clicking on it to open the properties panel',
                    'Validate and save your contract when all nodes are configured',
                  ]} />
                </Section>

                <Section title="Connecting Nodes" icon={Link2}>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <MousePointer className="w-4 h-4 text-purpleDanis" />
                        How to Connect
                      </h4>
                      <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                        <li>Hover over a node to see its connection handles (circles on edges)</li>
                        <li>Click and drag from a <span className="text-purpleDanis font-medium">source handle</span> (right side)</li>
                        <li>Drop onto a <span className="text-vverde font-medium">target handle</span> (left side) of another node</li>
                        <li>The connection will animate to show data flow direction</li>
                      </ol>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-violet-50 dark:bg-violet-950 border border-borderFine">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-200 dark:bg-violet-800 flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-purpleDanis" />
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-foreground">Flow Direction:</span>{' '}
                        <span className="text-muted-foreground">
                          Contracts flow left-to-right, from Payer through Milestones to Payee
                        </span>
                      </div>
                    </div>
                  </div>
                </Section>

                <Section title="Keyboard Shortcuts" icon={Keyboard}>
                  <div className="grid grid-cols-2 gap-2">
                    <ShortcutItem keys={['Delete', 'Backspace']} action="Delete selected node" />
                    <ShortcutItem keys={['Ctrl', 'Z']} action="Undo last action" />
                    <ShortcutItem keys={['Ctrl', 'S']} action="Save contract" />
                    <ShortcutItem keys={['Escape']} action="Deselect node" />
                    <ShortcutItem keys={['+']} action="Zoom in" />
                    <ShortcutItem keys={['-']} action="Zoom out" />
                  </div>
                </Section>
              </TabsContent>

              {/* Nodes Tab */}
              <TabsContent value="nodes" className="mt-0 space-y-6">
                <Section title="Node Types" icon={Target}>
                  <div className="space-y-3">
                    <NodeTypeCard
                      icon={Users}
                      name="Party (Payer)"
                      color="bg-purpleDanis"
                      description="The client or buyer who funds the contract. Every contract must start with a payer."
                      requiresSignature
                    />
                    <NodeTypeCard
                      icon={Users}
                      name="Party (Payee)"
                      color="bg-vverde"
                      description="The provider or seller who receives payment. Every contract must end with a payee."
                      requiresSignature
                    />
                    <NodeTypeCard
                      icon={Target}
                      name="Milestone"
                      color="bg-violeta"
                      description="A deliverable checkpoint that triggers payment release. Define clear acceptance criteria."
                    />
                    <NodeTypeCard
                      icon={GitBranch}
                      name="Condition"
                      color="bg-amarillo"
                      description="If/else branching logic. Routes the contract flow based on conditions being met."
                      hasMultipleOutputs
                    />
                    <NodeTypeCard
                      icon={Banknote}
                      name="Payment"
                      color="bg-vverde"
                      description="Releases funds from escrow to the payee when triggered by a milestone."
                    />
                    <NodeTypeCard
                      icon={PenLine}
                      name="Signature"
                      color="bg-purpleDanis"
                      description="Captures eSignature from a party. Required for each payer and payee in the contract."
                    />
                    <NodeTypeCard
                      icon={FileText}
                      name="Clause"
                      color="bg-lila"
                      description="Legal text block that can be AI-generated. Adds terms and conditions."
                    />
                    <NodeTypeCard
                      icon={Percent}
                      name="Commission"
                      color="bg-belanova"
                      description="Third-party fee split (max 10%). Non-blocking link payment on execution."
                      isNonBlocking
                    />
                  </div>
                </Section>

                <Section title="Signature Requirements" icon={PenLine}>
                  <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-950 border border-borderFine">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-purpleDanis flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground mb-2">
                          Every Payer and Payee must have a Signature node
                        </p>
                        <p className="text-muted-foreground">
                          The contract will not validate until each party has an associated signature. 
                          Signatures can be ordered (e.g., payer signs first, then payee).
                        </p>
                      </div>
                    </div>
                  </div>
                </Section>
              </TabsContent>

              {/* Logic Flow Tab */}
              <TabsContent value="logic" className="mt-0 space-y-6">
                <Section title="Contract Flow Structure" icon={Workflow}>
                  <p className="text-sm text-muted-foreground mb-4">
                    A valid contract follows a specific flow pattern. Here's a typical structure:
                  </p>
                  
                  <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
                    <FlowStep number={1} title="Payer Entry" description="Contract starts with the payer node" />
                    <FlowStep number={2} title="Payer Signature" description="Payer must sign to activate the contract" />
                    <FlowStep number={3} title="Milestones" description="One or more deliverable checkpoints" />
                    <FlowStep number={4} title="Conditions (Optional)" description="If/else logic for approval or branching" />
                    <FlowStep number={5} title="Payments" description="Release funds on milestone completion" />
                    <FlowStep number={6} title="Payee Signature" description="Payee signs to confirm receipt" />
                    <FlowStep number={7} title="Payee Exit" description="Contract completes at the payee node" />
                  </div>
                </Section>

                <Section title="If/Else Conditions" icon={GitBranch}>
                  <p className="text-sm text-muted-foreground mb-4">
                    Condition nodes allow branching logic in your contract. They have two outputs:
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-borderFine">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-vverde" />
                        <span className="font-medium text-sm text-foreground">True Branch</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Executes when the condition is met (e.g., milestone approved)
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <X className="w-4 h-4 text-red-500" />
                        <span className="font-medium text-sm text-foreground">False Branch</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Executes when the condition is not met (e.g., needs revision)
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border">
                    <h4 className="font-medium text-sm mb-2">Example Conditions:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>"Client approves the deliverable"</li>
                      <li>"Quality score is above 90%"</li>
                      <li>"Shipment arrives within deadline"</li>
                      <li>"Third-party inspector passes goods"</li>
                    </ul>
                  </div>
                </Section>

                <Section title="Commission Payments" icon={Percent}>
                  <div className="p-4 rounded-lg bg-pink-50 dark:bg-pink-950 border border-borderFine">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-belanova flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground mb-2">
                          Non-Blocking Link Payments
                        </p>
                        <p className="text-muted-foreground mb-3">
                          Commission nodes are special - they don't block the main contract flow. 
                          They execute as "link payments" when the contract completes:
                        </p>
                        <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Max 10% total commission across all recipients</li>
                          <li>Executed automatically on contract completion</li>
                          <li>Paid from the contract total, not additional</li>
                          <li>Perfect for referral fees, platform fees, or agent commissions</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </Section>
              </TabsContent>

              {/* Tips Tab */}
              <TabsContent value="tips" className="mt-0 space-y-6">
                <Section title="Best Practices" icon={Lightbulb}>
                  <div className="space-y-3">
                    <TipCard
                      title="Start Simple"
                      description="Begin with a basic flow (Payer -> Milestone -> Payment -> Payee) then add complexity."
                    />
                    <TipCard
                      title="Clear Acceptance Criteria"
                      description="Define specific, measurable criteria for each milestone to avoid disputes."
                    />
                    <TipCard
                      title="Use AI for Clauses"
                      description="Describe what you need in plain English and let AI generate legal language."
                    />
                    <TipCard
                      title="Split Large Projects"
                      description="Break down big projects into multiple milestones with partial payments."
                    />
                    <TipCard
                      title="Add Review Conditions"
                      description="Include approval conditions after milestones to ensure quality checks."
                    />
                  </div>
                </Section>

                <Section title="Common Patterns" icon={Workflow}>
                  <div className="space-y-4">
                    <PatternCard
                      name="Simple Freelance"
                      pattern="Payer -> Signature -> Milestone -> Signature -> Payee"
                      description="Basic one-deliverable contract"
                    />
                    <PatternCard
                      name="Multi-Milestone"
                      pattern="Payer -> Sig -> M1 -> Pay1 -> M2 -> Pay2 -> M3 -> Pay3 -> Sig -> Payee"
                      description="Project split into 3 payment tranches"
                    />
                    <PatternCard
                      name="With Approval"
                      pattern="Payer -> Milestone -> Condition (Approve?) -> [Yes: Payment] [No: Revision Milestone]"
                      description="Includes client approval step"
                    />
                    <PatternCard
                      name="With Commission"
                      pattern="Payer -> ... -> Payee + Commission (5% to Agent)"
                      description="Includes referral fee"
                    />
                  </div>
                </Section>

                <Section title="Validation Checklist" icon={CheckCircle2}>
                  <p className="text-sm text-muted-foreground mb-4">
                    Before saving, ensure your contract meets these requirements:
                  </p>
                  <div className="space-y-2">
                    <ChecklistItem text="At least one Payer node" />
                    <ChecklistItem text="At least one Payee node" />
                    <ChecklistItem text="Signature node for each Payer" />
                    <ChecklistItem text="Signature node for each Payee" />
                    <ChecklistItem text="At least one Milestone or deliverable" />
                    <ChecklistItem text="All nodes are connected in a valid flow" />
                    <ChecklistItem text="All required fields are filled (no red nodes)" />
                    <ChecklistItem text="Payment amounts match contract total" />
                  </div>
                </Section>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

// Helper Components
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-purpleDanis" />
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900 text-purpleDanis flex items-center justify-center text-xs font-medium">
            {i + 1}
          </span>
          <span className="text-muted-foreground pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  )
}

function ShortcutItem({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded bg-muted/30">
      <span className="text-xs text-muted-foreground">{action}</span>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <kbd key={i} className="px-1.5 py-0.5 text-[10px] font-mono bg-background border border-border rounded">
            {key}
          </kbd>
        ))}
      </div>
    </div>
  )
}

function NodeTypeCard({ 
  icon: Icon, 
  name, 
  color, 
  description, 
  requiresSignature,
  hasMultipleOutputs,
  isNonBlocking,
}: { 
  icon: React.ElementType
  name: string
  color: string
  description: string
  requiresSignature?: boolean
  hasMultipleOutputs?: boolean
  isNonBlocking?: boolean
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
      <div className={cn('flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center', color)}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-foreground">{name}</span>
          {requiresSignature && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-borderFine text-purpleDanis">
              Requires Signature
            </Badge>
          )}
          {hasMultipleOutputs && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-borderFine text-amarillo">
              2 Outputs
            </Badge>
          )}
          {isNonBlocking && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-borderFine text-belanova">
              Non-Blocking
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  )
}

function FlowStep({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purpleDanis text-white flex items-center justify-center text-xs font-medium">
        {number}
      </span>
      <div className="flex-1">
        <span className="font-medium text-sm text-foreground">{title}</span>
        <span className="text-muted-foreground text-sm"> - {description}</span>
      </div>
    </div>
  )
}

function TipCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border">
      <h4 className="font-medium text-sm text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function PatternCard({ name, pattern, description }: { name: string; pattern: string; description: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border">
      <h4 className="font-medium text-sm text-foreground mb-1">{name}</h4>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <code className="text-[10px] font-mono bg-background px-2 py-1 rounded border border-border text-purpleDanis block overflow-x-auto">
        {pattern}
      </code>
    </div>
  )
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <CheckCircle2 className="w-4 h-4 text-vverde" />
      <span className="text-muted-foreground">{text}</span>
    </div>
  )
}

// Floating Help Button Component
export function HelpButton() {
  const [helpOpen, setHelpOpen] = useState(false)
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-40 gap-2 bg-card shadow-lg border-border hover:bg-muted"
        onClick={() => setHelpOpen(true)}
      >
        <HelpCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Help</span>
      </Button>
      <HelpPanel open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}
