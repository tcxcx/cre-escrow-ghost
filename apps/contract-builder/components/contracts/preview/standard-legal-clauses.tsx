'use client'

import React from "react"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Scale,
  Shield,
  FileText,
  AlertTriangle,
  Clock,
  Globe,
  Lock,
  Ban,
  Handshake,
  Gavel,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LegalClause {
  id: string
  title: string
  icon: React.ElementType
  content: string
  isCustomizable?: boolean
}

interface StandardLegalClausesProps {
  governingLaw?: string
  jurisdiction?: string
  disputeMethod?: 'arbitration' | 'mediation' | 'litigation'
  terminationNoticeDays?: number
  confidentialityDuration?: string
  className?: string
}

export function StandardLegalClauses({
  governingLaw = 'State of Delaware, United States',
  jurisdiction = 'Courts of Delaware, United States',
  disputeMethod = 'arbitration',
  terminationNoticeDays = 30,
  confidentialityDuration = '2 years after contract termination',
  className,
}: StandardLegalClausesProps) {
  const clauses: LegalClause[] = [
    {
      id: 'governing-law',
      title: 'Governing Law & Jurisdiction',
      icon: Globe,
      isCustomizable: true,
      content: `This Agreement shall be governed by and construed in accordance with the laws of ${governingLaw}, without regard to its conflict of laws principles. Any legal action or proceeding arising under this Agreement shall be brought exclusively in the ${jurisdiction}, and the parties hereby irrevocably consent to the personal jurisdiction and venue therein.`,
    },
    {
      id: 'dispute-resolution',
      title: 'Dispute Resolution',
      icon: Scale,
      isCustomizable: true,
      content: disputeMethod === 'arbitration'
        ? `Any dispute, controversy, or claim arising out of or relating to this Agreement shall first be submitted to BUFI's built-in dispute resolution system. If not resolved within 30 days, disputes shall be settled by binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules. The arbitration shall take place in ${jurisdiction}. The arbitrator's decision shall be final and binding on both parties. Each party shall bear its own costs of arbitration unless the arbitrator determines otherwise.`
        : disputeMethod === 'mediation'
          ? `Any dispute arising out of this Agreement shall first be submitted to BUFI's built-in dispute resolution system. If not resolved within 30 days, the parties agree to attempt resolution through mediation before pursuing other remedies. If mediation fails within 60 days, either party may pursue litigation in the ${jurisdiction}.`
          : `Any dispute arising out of this Agreement shall first be submitted to BUFI's built-in dispute resolution system. If not resolved within 30 days, disputes shall be resolved through litigation in the ${jurisdiction}.`,
    },
    {
      id: 'ai-verification',
      title: 'AI Verification & Human Override',
      icon: Shield,
      content: `The parties acknowledge that deliverable verification may be performed by automated AI systems ("AI Verification"). AI Verification results are preliminary and non-binding. Either party may request a human review of any AI Verification decision within 14 calendar days of the decision. Human arbitrator decisions override AI Verification results. BUFI Platform assumes liability for errors in AI Verification that result in incorrect fund releases, subject to the limitation of liability provisions herein.`,
    },
    {
      id: 'termination',
      title: 'Termination',
      icon: Ban,
      isCustomizable: true,
      content: `Either party may terminate this Agreement by providing ${terminationNoticeDays} calendar days' written notice to the other party. In the event of termination: (a) all completed and verified milestones shall be paid in full; (b) any milestone in progress shall be assessed pro-rata based on completion; (c) escrowed funds for unstarted milestones shall be returned to the Payer within 5 business days; (d) accrued yield shall be distributed according to the agreed yield split. Either party may terminate immediately for material breach if the breaching party fails to cure within 14 days of written notice.`,
    },
    {
      id: 'liability',
      title: 'Limitation of Liability',
      icon: AlertTriangle,
      content: `Neither party shall be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to this Agreement, regardless of the theory of liability. The total aggregate liability of either party under this Agreement shall not exceed the total contract value stated herein. This limitation shall not apply to: (a) breaches of confidentiality; (b) willful misconduct or fraud; (c) indemnification obligations. The BUFI Platform's liability for AI Verification errors is limited to the value of the affected milestone.`,
    },
    {
      id: 'confidentiality',
      title: 'Confidentiality',
      icon: Lock,
      isCustomizable: true,
      content: `Each party agrees to maintain the confidentiality of all non-public information received from the other party in connection with this Agreement ("Confidential Information"). Confidential Information includes, but is not limited to: trade secrets, business plans, financial information, technical data, and deliverable content. The receiving party shall not disclose Confidential Information to any third party without prior written consent. This obligation survives for ${confidentialityDuration}. Exceptions: information that is publicly available, independently developed, or required to be disclosed by law.`,
    },
    {
      id: 'force-majeure',
      title: 'Force Majeure',
      icon: Clock,
      content: `Neither party shall be liable for any failure or delay in performing its obligations under this Agreement due to circumstances beyond its reasonable control, including but not limited to: natural disasters, war, terrorism, pandemics, government actions, blockchain network failures, or smart contract vulnerabilities. The affected party must notify the other party within 5 business days and make reasonable efforts to mitigate the impact. If the force majeure event continues for more than 60 days, either party may terminate this Agreement without penalty.`,
    },
    {
      id: 'intellectual-property',
      title: 'Intellectual Property',
      icon: BookOpen,
      content: `Unless otherwise specified in the milestone descriptions: (a) all intellectual property created by the Payee in performance of this Agreement shall transfer to the Payer upon full payment of the corresponding milestone; (b) the Payee retains rights to any pre-existing intellectual property and general knowledge; (c) the Payee grants the Payer a non-exclusive, perpetual license to any pre-existing IP incorporated into deliverables. Each party warrants that their contributions do not infringe on any third-party intellectual property rights.`,
    },
    {
      id: 'entire-agreement',
      title: 'Entire Agreement & Amendments',
      icon: Handshake,
      content: `This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior agreements, representations, and understandings. No modification, amendment, or waiver of any provision of this Agreement shall be effective unless in writing and signed by both parties through the BUFI Platform. The failure of either party to enforce any provision shall not constitute a waiver of that party's right to enforce the provision in the future.`,
    },
  ]

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Gavel className="h-5 w-5 text-muted-foreground" />
          Standard Legal Clauses
        </h3>
        <Badge variant="outline" className="text-xs">
          9 clauses included
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        The following standard clauses are automatically included in every BUFI contract to ensure legal validity and protect both parties. Clauses marked as customizable can be modified during contract creation.
      </p>

      <Accordion type="single" collapsible className="w-full">
        {clauses.map((clause) => (
          <AccordionItem key={clause.id} value={clause.id}>
            <AccordionTrigger className="text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <clause.icon className="h-4 w-4 text-muted-foreground" />
                {clause.title}
                {clause.isCustomizable && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                    Customizable
                  </Badge>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="text-sm text-muted-foreground leading-relaxed pl-6">
                {clause.content}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
