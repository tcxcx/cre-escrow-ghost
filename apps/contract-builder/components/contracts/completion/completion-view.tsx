'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
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
} from 'lucide-react'
import { CreateContractButton } from '@/components/shared/create-contract-button'
import { cn } from '@/lib/utils'
import confetti from 'canvas-confetti'
import { useEffect } from 'react'

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

// Mock data
const mockCompletionData: CompletionData = {
  contractId: 'contract-1',
  contractName: 'Website Redesign Project',
  status: 'completed',
  completedAt: new Date(),
  totalValue: 15000,
  currency: 'USDC',
  payer: { name: 'Acme Corp', address: '0x1234...5678' },
  payee: { name: 'Design Studio LLC', address: '0xabcd...ef01' },
  milestones: [
    { name: 'Discovery & Research', amount: 3000, completedAt: new Date('2024-01-15') },
    { name: 'Wireframes & Design', amount: 5000, completedAt: new Date('2024-01-22') },
    { name: 'Development', amount: 5000, completedAt: new Date('2024-01-29') },
    { name: 'Testing & Launch', amount: 2000, completedAt: new Date() },
  ],
  settlement: {
    payeePayment: 15000,
    payerRefund: 0,
    payeeYield: 122.66,
    payerYield: 122.66,
    commissions: [
      { recipient: 'Platform Agency', amount: 150 },
    ],
    protocolFee: 75,
    totalSettled: 15470.32,
  },
  transactionHashes: {
    settlement: '0xsettlement123...abc',
    payeePayment: '0xpayment456...def',
    commissions: ['0xcomm789...ghi'],
  },
  yieldStrategy: 'aave',
  totalDuration: 45,
}

export function CompletionView() {
  const router = useRouter()
  const params = useParams()
  const [data] = useState(mockCompletionData)
  const [showConfetti, setShowConfetti] = useState(true)

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

  const totalYield = data.settlement.payeeYield + data.settlement.payerYield
  const yieldPercentage = (totalYield / data.totalValue) * 100

  return (
    <div className="min-h-screen bg-background">
      {/* Success Header */}
      <div className="bg-gradient-to-b from-[#82e664]/10 to-transparent border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#82e664]/20 mb-6">
            <Trophy className="w-10 h-10 text-[#82e664]" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Contract Completed!
          </h1>
          <p className="text-muted-foreground mb-4">
            {data.contractName} has been successfully completed and settled
          </p>
          <div className="flex items-center justify-center gap-2">
            <Badge className="bg-[#82e664]/10 text-[#5cb346] border-[#82e664]/20">
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
              <DollarSign className="w-5 h-5 text-[#6854CF]" />
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
                <span className="text-lg font-semibold text-[#82e664]">
                  +${totalYield.toFixed(2)} ({yieldPercentage.toFixed(2)}%)
                </span>
              </div>
            </div>

            <Separator />

            {/* Distribution Breakdown */}
            <div className="space-y-4">
              {/* Payee Section */}
              <div className="flex items-start gap-4 p-4 rounded-lg bg-[#82e664]/5 border border-[#82e664]/20">
                <div className="p-2 rounded-lg bg-[#82e664]/10">
                  <User className="w-5 h-5 text-[#82e664]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">{data.payee.name}</span>
                    <Badge variant="outline" className="text-[#82e664] border-[#82e664]/30">Payee</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{data.payee.address}</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Contract Payment</span>
                      <span className="text-foreground">${data.settlement.payeePayment.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Yield Earned (50%)</span>
                      <span className="text-[#82e664]">+${data.settlement.payeeYield.toFixed(2)}</span>
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
              <div className="flex items-start gap-4 p-4 rounded-lg bg-[#6854CF]/5 border border-[#6854CF]/20">
                <div className="p-2 rounded-lg bg-[#6854CF]/10">
                  <Building2 className="w-5 h-5 text-[#6854CF]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">{data.payer.name}</span>
                    <Badge variant="outline" className="text-[#6854CF] border-[#6854CF]/30">Payer</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{data.payer.address}</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Yield Earned (50%)</span>
                      <span className="text-[#82e664]">+${data.settlement.payerYield.toFixed(2)}</span>
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
              <CheckCircle2 className="w-5 h-5 text-[#82e664]" />
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
                    <div className="w-8 h-8 rounded-full bg-[#82e664]/10 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-[#82e664]" />
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
              <Shield className="w-5 h-5 text-[#6854CF]" />
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
