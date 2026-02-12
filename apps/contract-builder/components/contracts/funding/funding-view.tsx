'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { useActiveContractStore } from '@/lib/active-contract-store'
import { cn } from '@/lib/utils'

interface FundingViewProps {
  contractId: string
}

export function FundingView({ contractId }: FundingViewProps) {
  const {
    contract,
    loading,
    currentUserRole,
    currentUserWallet,
    fundingState,
    fundingError,
    userUsdcBalance,
    fetchContract,
    fundEscrow,
    fetchUsdcBalance,
    resetFundingState,
    canFund,
    hasSufficientBalance,
  } = useActiveContractStore()

  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    fetchContract(contractId)
    fetchUsdcBalance()
  }, [contractId, fetchContract, fetchUsdcBalance])

  const handleDeposit = async () => {
    if (contract) {
      await fundEscrow(contract.totalAmount)
    }
  }

  if (loading || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading contract...</div>
      </div>
    )
  }

  // Already funded
  if (contract.fundedAt) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="container max-w-2xl mx-auto px-4 py-4">
            <Link
              href={`/contracts/${contractId}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Contract
            </Link>
          </div>
        </div>

        <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Escrow Already Funded</h1>
          <p className="text-muted-foreground mb-6">
            This contract has already been funded with ${contract.totalAmount.toLocaleString()} USDC.
          </p>
          <Link href={`/contracts/${contractId}`}>
            <Button>View Contract Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Not authorized to fund
  if (currentUserRole !== 'payer') {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="container max-w-2xl mx-auto px-4 py-4">
            <Link
              href={`/contracts/${contractId}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Contract
            </Link>
          </div>
        </div>

        <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Funding Not Available</h1>
          <p className="text-muted-foreground mb-6">
            Only the payer can fund the escrow for this contract.
          </p>
          <Link href={`/contracts/${contractId}`}>
            <Button variant="outline">View Contract</Button>
          </Link>
        </div>
      </div>
    )
  }

  const estimatedGas = 0.50
  const totalWithGas = contract.totalAmount + estimatedGas
  const sufficientBalance = hasSufficientBalance()

  // Success state
  if (fundingState === 'success') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Escrow Funded!</h1>
          <p className="text-muted-foreground mb-6">
            ${contract.totalAmount.toLocaleString()} USDC has been deposited into the escrow.
            <br />
            Work on Milestone 1 can now begin.
          </p>
          <Link href={`/contracts/${contractId}`}>
            <Button>View Contract Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <Link
            href={`/contracts/${contractId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Contract
          </Link>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Fund Escrow</h1>
          <p className="text-muted-foreground">{contract.name}</p>
        </div>

        {/* Deposit Amount */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Deposit Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Contract Total</span>
                <span className="font-medium">${contract.totalAmount.toLocaleString()} USDC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Already Deposited</span>
                <span className="font-medium">$0.00 USDC</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Amount Due</span>
                  <span className="text-primary">${contract.totalAmount.toLocaleString()} USDC</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Your Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">USDC Balance ({contract.chain})</p>
                <p className="text-lg font-semibold">
                  ${userUsdcBalance?.toLocaleString() ?? '...'} USDC
                </p>
              </div>
              <div
                className={cn(
                  'flex items-center gap-1 text-sm',
                  sufficientBalance ? 'text-emerald-500' : 'text-red-500'
                )}
              >
                {sufficientBalance ? (
                  <>
                    <Check className="w-4 h-4" />
                    Sufficient
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Insufficient
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Yield Strategy */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Yield Strategy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your escrowed funds will be deposited to:
            </p>
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">AAVE V3</span>
                <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">
                  Low Risk
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">~3-5% APY</p>
              <p className="text-xs text-muted-foreground">
                Estimated yield over 60 days: ~$100-170 USDC
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Yield is distributed based on contract performance rules.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Transaction Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Deposit Amount</span>
                <span className="font-medium">${contract.totalAmount.toLocaleString()} USDC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gas Fee (est.)</span>
                <span className="font-medium">~${estimatedGas.toFixed(2)} USDC</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>${totalWithGas.toLocaleString()} USDC</span>
                </div>
              </div>
            </div>

            <label
              className={cn(
                'flex items-start gap-3 mt-4 pt-4 border-t border-border cursor-pointer p-3 rounded-lg transition-colors',
                confirmed ? 'bg-primary/10' : 'hover:bg-muted/50'
              )}
            >
              <Checkbox
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
              />
              <span className="text-sm">
                I understand funds will be held in escrow until milestones are verified and released.
              </span>
            </label>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Connected:</span>
                <span className="text-sm font-mono">
                  {currentUserWallet?.slice(0, 10)}...{currentUserWallet?.slice(-8)}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs">
                Disconnect
              </Button>
            </div>

            <Button
              className="w-full h-12 text-base"
              disabled={!confirmed || !sufficientBalance || fundingState !== 'idle'}
              onClick={handleDeposit}
            >
              {fundingState === 'approving' && (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Approving USDC...
                </>
              )}
              {fundingState === 'depositing' && (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Depositing...
                </>
              )}
              {fundingState === 'idle' && (
                <>
                  <Wallet className="w-5 h-5 mr-2" />
                  Deposit ${contract.totalAmount.toLocaleString()} USDC
                </>
              )}
            </Button>

            {fundingError && (
              <p className="text-center text-sm text-red-500 mt-3">{fundingError}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
