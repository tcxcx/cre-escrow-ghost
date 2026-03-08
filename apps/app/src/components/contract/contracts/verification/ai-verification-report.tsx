'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@bu/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@bu/ui/card'
import { Badge } from '@bu/ui/badge'
import { Progress } from '@bu/ui/progress'
import { Separator } from '@bu/ui/separator'
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  FileText,
  RefreshCw,
  Link2,
  Lightbulb,
  Shield,
  Scale
} from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { AITransparencyPanel } from './ai-transparency-panel'
import { HumanAppealModal } from './human-appeal-modal'

interface VerificationCriterion {
  id: string
  description: string
  status: 'pass' | 'fail'
  details: string
  required?: string
}

interface AIVerificationReportProps {
  contractId: string
  milestoneId: string
  milestoneName: string
  attemptNumber: number
  maxAttempts: number
  status: 'passed' | 'failed'
  confidence: number
  aiSummary: string
  criteria: VerificationCriterion[]
  suggestions?: string[]
  blockchainProof?: {
    txHash: string
    block: number
    timestamp: string
    verifiedBy: string
  }
  onResubmit?: () => void
  onViewPrevious?: () => void
}

export function AIVerificationReport({
  contractId,
  milestoneId,
  milestoneName,
  attemptNumber,
  maxAttempts,
  status,
  confidence,
  aiSummary,
  criteria,
  suggestions,
  blockchainProof,
  onResubmit,
  onViewPrevious,
}: AIVerificationReportProps) {
  const router = useRouter()
  const [showAppealModal, setShowAppealModal] = useState(false)
  const retriesRemaining = maxAttempts - attemptNumber
  const isPassed = status === 'passed'
  const passedCount = criteria.filter(c => c.status === 'pass').length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Milestone
          </Button>
        </div>
      </header>

      <div className="container max-w-3xl px-4 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">AI Verification Report</h1>
          <p className="text-muted-foreground">
            {milestoneName} - Attempt {attemptNumber} of {maxAttempts}
          </p>
        </div>

        {/* Status Card */}
        <Card className={cn(
          'mb-6 overflow-hidden',
          isPassed ? 'border-emerald-500/30' : 'border-red-500/30'
        )}>
          <div className={cn(
            'p-8 text-center',
            isPassed 
              ? 'bg-gradient-to-b from-emerald-500/10 to-transparent' 
              : 'bg-gradient-to-b from-red-500/10 to-transparent'
          )}>
            <div className={cn(
              'flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-4',
              isPassed ? 'bg-emerald-500/10' : 'bg-red-500/10'
            )}>
              {isPassed ? (
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              ) : (
                <XCircle className="h-10 w-10 text-red-500" />
              )}
            </div>
            <h2 className={cn(
              'text-xl font-bold mb-2',
              isPassed ? 'text-emerald-500' : 'text-red-500'
            )}>
              {isPassed ? 'VERIFICATION PASSED' : 'VERIFICATION FAILED'}
            </h2>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>Confidence: {confidence}%</span>
              {!isPassed && <span>{retriesRemaining} retry remaining</span>}
            </div>
          </div>
        </Card>

        {/* AI Analysis */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              "{aiSummary}"
            </p>
          </CardContent>
        </Card>

        {/* Criteria Results */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              Criteria Results ({passedCount}/{criteria.length} passed)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {criteria.map((criterion) => (
              <div 
                key={criterion.id}
                className={cn(
                  'p-4 rounded-lg border',
                  criterion.status === 'pass' 
                    ? 'border-emerald-500/30 bg-emerald-500/5' 
                    : 'border-red-500/30 bg-red-500/5'
                )}
              >
                <div className="flex items-start gap-3">
                  {criterion.status === 'pass' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{criterion.description}</p>
                      <Badge variant={criterion.status === 'pass' ? 'default' : 'destructive'}>
                        {criterion.status === 'pass' ? 'PASS' : 'FAIL'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {criterion.status === 'pass' ? 'Found: ' : 'Issue: '}{criterion.details}
                    </p>
                    {criterion.required && criterion.status === 'fail' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">Required:</span> {criterion.required}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* How to Pass Section */}
        {!isPassed && suggestions && suggestions.length > 0 && (
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                <Lightbulb className="h-5 w-5" />
                How to Pass on Next Submission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 text-sm font-medium shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-sm text-muted-foreground">{suggestion}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Blockchain Proof */}
        {blockchainProof && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-5 w-5 text-muted-foreground" />
                Chainlink CRE Verification Proof
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Verified by:</span>
                <span className="font-medium">{blockchainProof.verifiedBy}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">TX:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{blockchainProof.txHash}</span>
                  <Button variant="link" size="sm" className="h-auto p-0 text-primary" asChild>
                    <a 
                      href={`https://snowtrace.io/tx/${blockchainProof.txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      View on Snowtrace
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Block:</span>
                <span className="font-mono">{blockchainProof.block.toLocaleString()} - {blockchainProof.timestamp}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Transparency Panel */}
        <AITransparencyPanel
          contractId={contractId}
          milestoneId={milestoneId}
          verificationDate={blockchainProof?.timestamp || new Date().toLocaleDateString()}
          className="mb-6"
        />

        {/* Actions */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {onViewPrevious && (
                <Button variant="outline" className="flex-1 gap-2 bg-transparent" onClick={onViewPrevious}>
                  <FileText className="h-4 w-4" />
                  View Previous Submission
                </Button>
              )}
              {isPassed && (
                <Button 
                  className="flex-1 gap-2" 
                  onClick={() => router.push(`/contracts/${contractId}`)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Continue to Dashboard
                </Button>
              )}
              {!isPassed && onResubmit && retriesRemaining > 0 && (
                <Button className="flex-1 gap-2" onClick={onResubmit}>
                  <RefreshCw className="h-4 w-4" />
                  Resubmit Deliverable
                  {retriesRemaining === 1 && (
                    <Badge variant="destructive" className="ml-2">Last attempt!</Badge>
                  )}
                </Button>
              )}
              {!isPassed && retriesRemaining === 0 && (
                <Button 
                  variant="destructive" 
                  className="flex-1 gap-2" 
                  onClick={() => router.push(`/contracts/${contractId}/dispute`)}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Escalate to Dispute
                </Button>
              )}
            </div>

            {/* Human Appeal - Always available */}
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Disagree with this result?</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 bg-transparent"
                onClick={() => setShowAppealModal(true)}
              >
                <Scale className="h-4 w-4" />
                Request Human Review
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Human Appeal Modal */}
        <HumanAppealModal
          open={showAppealModal}
          onOpenChange={setShowAppealModal}
          contractId={contractId}
          milestoneId={milestoneId}
          milestoneName={milestoneName}
          currentVerdict={status}
          attemptNumber={attemptNumber}
        />
      </div>
    </div>
  )
}
