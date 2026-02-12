'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DollarSign,
  Clock,
  TrendingUp,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommissionContract {
  id: string
  name: string
  role: string
  percentage: number
  totalValue: number
  yourShare: number
  earnedSoFar: number
  completedMilestones: number
  totalMilestones: number
  status: 'active' | 'completed' | 'cancelled'
}

interface CommissionPayout {
  id: string
  contractName: string
  amount: number
  timestamp: string
  txHash: string
}

interface CommissionEarningsProps {
  totalEarned: number
  pendingEarnings: number
  contracts: CommissionContract[]
  recentPayouts: CommissionPayout[]
}

export function CommissionEarnings({
  totalEarned,
  pendingEarnings,
  contracts,
  recentPayouts,
}: CommissionEarningsProps) {
  const activeContracts = contracts.filter(c => c.status === 'active')

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10">
                <DollarSign className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">TOTAL EARNED</p>
                <p className="text-3xl font-bold">${totalEarned.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">USDC</p>
                <p className="text-xs text-muted-foreground mt-1">
                  From {contracts.filter(c => c.status === 'completed' || c.earnedSoFar > 0).length} contracts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PENDING</p>
                <p className="text-3xl font-bold">${pendingEarnings.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">USDC</p>
                <p className="text-xs text-muted-foreground mt-1">
                  From {activeContracts.length} active contracts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Contracts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            Contracts You're Earning From
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeContracts.map((contract) => {
            const progress = (contract.completedMilestones / contract.totalMilestones) * 100
            return (
              <div 
                key={contract.id}
                className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{contract.name}</p>
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-xs">
                        ACTIVE
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your role: {contract.role} ({contract.percentage}%)
                    </p>
                  </div>
                </div>
                <div className="space-y-1 text-sm mb-3">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Contract value: ${contract.totalValue.toLocaleString()}</span>
                    <span>Your share: ${contract.yourShare.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Earned so far: <span className="text-emerald-600 font-medium">${contract.earnedSoFar.toLocaleString()}</span>
                    </span>
                    <span className="text-muted-foreground">
                      ({contract.completedMilestones}/{contract.totalMilestones} milestones)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={progress} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground w-10">{Math.round(progress)}%</span>
                </div>
              </div>
            )
          })}

          {activeContracts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No active contracts with commission
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payouts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            Recent Payouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentPayouts.map((payout) => (
              <div 
                key={payout.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {new Date(payout.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-sm">{payout.contractName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-emerald-600">
                    +${payout.amount.toLocaleString()}
                  </span>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-xs text-muted-foreground"
                    asChild
                  >
                    <a 
                      href={`https://snowtrace.io/tx/${payout.txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      TX: {payout.txHash.slice(0, 6)}...
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}

            {recentPayouts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No payouts yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
