'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@bu/ui/card'
import { Button } from '@bu/ui/button'
import { Badge } from '@bu/ui/badge'
import { Progress } from '@bu/ui/progress'
import { Separator } from '@bu/ui/separator'
import {
  CheckCircle2,
  Trophy,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  FileText,
  Download,
  Share2,
  ExternalLink,
  ArrowRight,
  Clock,
  Shield,
  Banknote,
  Building2,
  User,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { CreateContractButton } from '@/components/contract/shared/create-contract-button'
import { cn } from '@bu/ui/cn'
import confetti from 'canvas-confetti'

interface SettlementBreakdown {
  payeePayment: number
  payerRefund: number
  payeeYield: number
  payerYield: number
  commissions: { recipient: string; amount: number }[]
  protocolFee: number
  totalSettled: number
}

interface CompletionData {
  contractId: string
  contractName: string
  status: 'completed' | 'settling'
  completedAt: Date
  totalValue: number
  currency: string
  payer: { name: string; address: string }
  payee: { name: string; address: string }
  milestones: { name: string; amount: number; completedAt: Date }[]
  settlement: SettlementBreakdown
  transactionHashes: {
    settlement: string
    payeePayment: string
    commissions: string[]
  }
  yieldStrategy: 'aave' | 'compound' | 'none'
  totalDuration: number // in days
}

export function CompletionView() {
  const router = useRouter()
  const params = useParams()
  const [data, setData] = useState<CompletionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(true)

  // Fetch completion data
  useEffect(() => {
    if (!params?.id) return

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const res = await fetch(`/api/contracts/agreements/${params.id}`)
        if (!res.ok) {
          throw new Error(`Failed to load completion data (${res.status})`)
        }
        const json = await res.json()
        const transformed: CompletionData = {
          contractId: json.id ?? json.contractId ?? (params.id as string),
          contractName: json.name ?? json.contractName ?? 'Untitled Contract',
          status: json.status === 'completed' ? 'completed' : 'settling',
          completedAt: new Date(json.completedAt ?? json.completed_at ?? Date.now()),
          totalValue: json.totalValue ?? json.total_value ?? 0,
          currency: json.currency ?? 'USDC',
          payer: json.payer ?? { name: 'Unknown', address: '' },
          payee: json.payee ?? { name: 'Unknown', address: '' },
          milestones: (json.milestones ?? []).map((m: Record<string, unknown>) => ({
            name: (m.name ?? m.title ?? '') as string,
            amount: (m.amount ?? 0) as number,
            completedAt: new Date((m.completedAt ?? m.completed_at ?? Date.now()) as string | number),
          })),
          settlement: json.settlement ?? {
            payeePayment: 0,
            payerRefund: 0,
            payeeYield: 0,
            payerYield: 0,
            commissions: [],
            protocolFee: 0,
            totalSettled: 0,
          },
          transactionHashes: json.transactionHashes ?? json.transaction_hashes ?? {
            settlement: '',
            payeePayment: '',
            commissions: [],
          },
          yieldStrategy: json.yieldStrategy ?? json.yield_strategy ?? 'none',
          totalDuration: json.totalDuration ?? json.total_duration ?? 0,
        }
        setData(transformed)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [params?.id])

  // Trigger confetti on mount
  useEffect(() => {
    if (showConfetti && data.status === 'completed') {
      const duration = 3 * 1000
      const end = Date.now() + duration

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#6854CF', '#C4A1FF', '#82e664', '#FFE48C'],
        })
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#6854CF', '#C4A1FF', '#82e664', '#FFE48C'],
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }
      frame()
      setShowConfetti(false)
    }
  }, [showConfetti, data.status])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purpleDanis" />
          <p className="text-sm text-muted-foreground">Loading completion details...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <p className="text-sm text-destructive">{error ?? 'Failed to load completion data'}</p>
          <Button variant="outline" className="bg-transparent" onClick={() => router.push('/contracts')}>
            Back to Contracts
          </Button>
        </div>
      </div>
    )
  }

  const totalYield = data.settlement.payeeYield + data.settlement.payerYield
  const yieldPercentage = data.totalValue > 0 ? (totalYield / data.totalValue) * 100 : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Success Header */}
      <div className="bg-gradient-to-b from-emerald-50 dark:from-emerald-950 to-transparent border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900 mb-6">
            <Trophy className="w-10 h-10 text-vverde" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Contract Completed!
          </h1>
          <p className="text-muted-foreground mb-4">
            {data.contractName} has been successfully completed and settled
          </p>
          <div className="flex items-center justify-center gap-2">
            <Badge className="bg-emerald-50 dark:bg-emerald-950 text-vverde border-vverde/20">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Settled
            </Badge>
            <Badge variant="outline" className="border-border">
              <Calendar className="w-3 h-3 mr-1" />
              {data.completedAt.toLocaleDateString()}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Settlement Summary */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purpleDanis" />
              Settlement Summary
            </CardTitle>
            <CardDescription>
              Final distribution of funds including yield earnings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Total Contract Value */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Original Contract Value</span>
                <span className="text-lg font-semibold text-foreground">
                  ${data.totalValue.toLocaleString()} {data.currency}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Yield Generated</span>
                <span className="text-lg font-semibold text-vverde">
                  +${totalYield.toFixed(2)} ({yieldPercentage.toFixed(2)}%)
                </span>
              </div>
            </div>

            <Separator />

            {/* Distribution Breakdown */}
            <div className="space-y-4">
              {/* Payee Section */}
              <div className="flex items-start gap-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-vverde/20">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                  <User className="w-5 h-5 text-vverde" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">{data.payee.name}</span>
                    <Badge variant="outline" className="text-vverde border-vverde/30">Payee</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{data.payee.address}</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Contract Payment</span>
                      <span className="text-foreground">${data.settlement.payeePayment.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Yield Earned (50%)</span>
                      <span className="text-vverde">+${data.settlement.payeeYield.toFixed(2)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span className="text-foreground">Total Received</span>
                      <span className="text-foreground">
                        ${(data.settlement.payeePayment + data.settlement.payeeYield).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payer Section */}
              <div className="flex items-start gap-4 p-4 rounded-lg bg-violet-50 dark:bg-violet-950 border border-purpleDanis/20">
                <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900">
                  <Building2 className="w-5 h-5 text-purpleDanis" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">{data.payer.name}</span>
                    <Badge variant="outline" className="text-purpleDanis border-purpleDanis/30">Payer</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{data.payer.address}</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Yield Earned (50%)</span>
                      <span className="text-vverde">+${data.settlement.payerYield.toFixed(2)}</span>
                    </div>
                    {data.settlement.payerRefund > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Refund</span>
                        <span className="text-foreground">${data.settlement.payerRefund.toFixed(2)}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span className="text-foreground">Total Received</span>
                      <span className="text-foreground">
                        ${(data.settlement.payerYield + data.settlement.payerRefund).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commissions */}
              {data.settlement.commissions.length > 0 && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Commissions (Non-blocking)</span>
                  </div>
                  <div className="space-y-2">
                    {data.settlement.commissions.map((commission, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{commission.recipient}</span>
                        <span className="text-foreground">${commission.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Protocol Fee */}
              <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/30">
                <span className="text-muted-foreground">Bufi Protocol Fee (0.5%)</span>
                <span className="text-muted-foreground">${data.settlement.protocolFee.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Milestones Completed */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-vverde" />
              Milestones Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.milestones.map((milestone, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-vverde" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{milestone.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Completed {milestone.completedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    ${milestone.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Blockchain Verification */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purpleDanis" />
              Blockchain Verification
            </CardTitle>
            <CardDescription>
              All transactions recorded on-chain for permanent verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Settlement Transaction</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 gap-1 bg-transparent text-xs">
                {data.transactionHashes.settlement}
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Payee Payment</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 gap-1 bg-transparent text-xs">
                {data.transactionHashes.payeePayment}
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            className="gap-2 bg-transparent"
            onClick={() => router.push('/contracts')}
          >
            View All Contracts
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              Download Receipt
            </Button>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <CreateContractButton label="Create New Contract" />
          </div>
        </div>
      </div>
    </div>
  )
}
