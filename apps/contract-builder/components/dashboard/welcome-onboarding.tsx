'use client'

import React from "react"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  FileText,
  PenTool,
  Wallet,
  Shield,
  ArrowRight,
  X,
  CheckCircle2,
  Sparkles,
  Upload,
  Users,
  TrendingUp,
  Scale,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  href: string
  completed: boolean
  ctaLabel: string
}

interface WelcomeOnboardingProps {
  userName?: string
  onDismiss?: () => void
  className?: string
}

export function WelcomeOnboarding({
  userName = 'there',
  onDismiss,
  className,
}: WelcomeOnboardingProps) {
  const [dismissed, setDismissed] = useState(false)
  const [expandedStep, setExpandedStep] = useState<string | null>(null)

  // Check localStorage for dismissed state
  useEffect(() => {
    const isDismissed = localStorage.getItem('bufi-onboarding-dismissed')
    if (isDismissed === 'true') setDismissed(true)
  }, [])

  const steps: OnboardingStep[] = [
    {
      id: 'create',
      title: 'Create Your First Contract',
      description: 'Choose from 18+ templates or import an existing PDF. The AI-powered builder guides you through adding parties, milestones, and payment terms.',
      icon: FileText,
      href: '/builder',
      completed: false,
      ctaLabel: 'Start Building',
    },
    {
      id: 'sign',
      title: 'Sign & Send for Signatures',
      description: 'Both parties sign digitally with blockchain verification. Share a secure link -- no account needed for counterparties.',
      icon: PenTool,
      href: '/builder',
      completed: false,
      ctaLabel: 'Learn More',
    },
    {
      id: 'fund',
      title: 'Fund the Escrow',
      description: 'Deposit USDC into a smart contract escrow. Funds are locked and released automatically when milestones are verified.',
      icon: Wallet,
      href: '/builder',
      completed: false,
      ctaLabel: 'Learn More',
    },
    {
      id: 'verify',
      title: 'AI Verifies Deliverables',
      description: 'Submit work and our AI checks it against the agreed criteria. Every decision is transparent, auditable, and can be appealed to a human arbitrator.',
      icon: Shield,
      href: '/builder',
      completed: false,
      ctaLabel: 'Learn More',
    },
  ]

  const completedCount = steps.filter((s) => s.completed).length
  const progress = (completedCount / steps.length) * 100

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('bufi-onboarding-dismissed', 'true')
    onDismiss?.()
  }

  if (dismissed) return null

  return (
    <Card className={cn('overflow-hidden rounded-xl border border-border', className)}>
      {/* Header */}
      <div className="bg-card p-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-balance">
              Welcome to BUFI, {userName}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              Automate contracts with escrow and payment conditioned on verified deliverables. Here is how it works in 4 steps.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
        {completedCount > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground shrink-0">
              {completedCount}/{steps.length} complete
            </span>
          </div>
        )}
      </div>

      {/* Steps */}
      <CardContent className="p-4 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
              className={cn(
                'text-left p-4 rounded-lg border transition-all duration-200',
                step.completed
                  ? 'border-border bg-muted/50'
                  : expandedStep === step.id
                    ? 'border-border bg-muted/50'
                    : 'border-border hover:bg-muted/50',
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-lg shrink-0',
                    step.completed
                      ? 'bg-emerald-500/10'
                      : 'bg-primary/10',
                  )}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <step.icon className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">Step {index + 1}</span>
                  </div>
                  <p className="text-sm font-medium mt-0.5 text-balance">{step.title}</p>
                </div>
              </div>

              {expandedStep === step.id && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                  {!step.completed && (
                    <Link
                      href={step.href}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary mt-2 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {step.ctaLabel}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Key differentiators - collapsed by default */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs gap-1.5">
              <Scale className="h-3 w-3" />
              Human Appeal on Every AI Decision
            </Badge>
            <Badge variant="outline" className="text-xs gap-1.5">
              <TrendingUp className="h-3 w-3" />
              Earn Yield While Funds Are in Escrow
            </Badge>
            <Badge variant="outline" className="text-xs gap-1.5">
              <Upload className="h-3 w-3" />
              Import Existing PDF Contracts
            </Badge>
            <Badge variant="outline" className="text-xs gap-1.5">
              <Users className="h-3 w-3" />
              Collaborate with Lawyers & Teams
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
