'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@bu/ui/card'
import { Badge } from '@bu/ui/badge'
import { Button } from '@bu/ui/button'
import { Separator } from '@bu/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@bu/ui/accordion'
import {
  Eye,
  Database,
  Shield,
  Scale,
  FileText,
  Brain,
  Lock,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Server,
  Users,
} from 'lucide-react'
import { cn } from '@bu/ui/cn'

interface AITransparencyPanelProps {
  contractId: string
  milestoneId: string
  verificationDate: string
  modelVersion?: string
  dataAnalyzed?: string[]
  className?: string
}

export function AITransparencyPanel({
  contractId,
  milestoneId,
  verificationDate,
  modelVersion = 'BUFI-Verify v2.1',
  dataAnalyzed = [
    'Submitted deliverable files (hashed, not stored)',
    'Milestone description and acceptance criteria',
    'Contract terms and verification rules',
    'File metadata (type, size, timestamps)',
  ],
  className,
}: AITransparencyPanelProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className={cn('border-border/50', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            AI Transparency & Your Rights
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {modelVersion}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Rights Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50 border border-border/50">
            <Scale className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Human Appeal</p>
              <p className="text-xs text-muted-foreground">Every AI decision can be reviewed by a human arbitrator</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50 border border-border/50">
            <Eye className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Full Audit Trail</p>
              <p className="text-xs text-muted-foreground">Every step of the AI analysis is logged and reviewable</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50 border border-border/50">
            <Lock className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Data Privacy</p>
              <p className="text-xs text-muted-foreground">Files analyzed in-memory only, never stored or used for training</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Expandable Details */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="how-it-works" className="border-b-0">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-muted-foreground" />
                How does the AI make decisions?
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm text-muted-foreground pl-6">
                <p>
                  The BUFI verification AI compares your submitted deliverables against the acceptance criteria defined in the contract. It does not make subjective judgments -- it checks for specific, measurable conditions that both parties agreed to.
                </p>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">The AI evaluates:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>File format and type match the required deliverables</li>
                    <li>Content matches the milestone description criteria</li>
                    <li>Completeness of all required items in the deliverable checklist</li>
                    <li>Technical specifications defined in the contract terms</li>
                  </ol>
                </div>
                <p>
                  Each criterion receives a pass/fail result with an explanation. The overall result requires all required criteria to pass.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="data-analyzed" className="border-b-0">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                What data does the AI analyze?
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pl-6">
                <ul className="space-y-2">
                  {dataAnalyzed.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Your files are processed in an isolated, encrypted environment and are immediately deleted after verification. They are never stored, shared, or used to train AI models.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="who-responsible" className="border-b-0">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Who is responsible if the AI is wrong?
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm text-muted-foreground pl-6">
                <p>
                  <span className="font-medium text-foreground">BUFI assumes full responsibility</span> for AI verification errors. If the AI incorrectly fails or passes a deliverable:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Either party can file a human appeal at any time
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    A certified human arbitrator reviews the evidence
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    The human decision overrides the AI decision
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Escrow funds remain locked until resolution
                  </li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="data-storage" className="border-b-0">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                Where is my data stored?
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm text-muted-foreground pl-6">
                <p>
                  Contract metadata and verification results are stored on encrypted servers compliant with GDPR and SOC 2 Type II standards. Deliverable files are processed in isolated environments and deleted immediately after verification.
                </p>
                <p>
                  Blockchain proofs (hashes only, no content) are stored on-chain for immutable audit trails. No personal data is ever written to the blockchain.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Separator />

        {/* Verification Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Verified: {verificationDate}</span>
          <span>Contract: #{contractId.slice(0, 8).toUpperCase()}</span>
          <span>Milestone: #{milestoneId.slice(0, 8).toUpperCase()}</span>
        </div>
      </CardContent>
    </Card>
  )
}
