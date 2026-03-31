'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@bu/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@bu/ui/card'
import { Checkbox } from '@bu/ui/checkbox'
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useActiveContractStore } from '@/lib/active-contract-store'
import { cn } from '@bu/ui/cn'
import { toast } from '@bu/ui/use-toast'
import { PaymentMethodSelector } from '@/components/invoice-payment/payment-method-selector'
import { ExternalWalletConnector } from '@/components/invoice-payment/external-wallet-connector'
import { usePaymentMethod } from '@/hooks/use-payment-method'
import { useSessionCheck } from '@/hooks/use-session-check'
import { useWriteContract } from 'wagmi'
import { waitForTransactionReceipt } from '@wagmi/core'
import { erc20Abi } from 'viem'
import { ESCROW_WITH_AGENT_V3_ABI } from '@bu/contracts/escrow'
import { wagmiConfig } from '@/lib/reown-config'

// Well-known USDC contract addresses per chain
const USDC_ADDRESSES: Record<string, string> = {
  'avalanche': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  'avalanche-fuji': '0x5425890298aed601595a70AB815c96711a31Bc65',
  'ethereum': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'polygon': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
}

function getUsdcAddress(chain: string): string | null {
  return USDC_ADDRESSES[chain.toLowerCase()] ?? null
}

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

  const router = useRouter()
  const [confirmed, setConfirmed] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Dual-wallet payment method state
  const { hasSession, isLoading: isSessionLoading } = useSessionCheck()
  const { paymentMethod, setPaymentMethod, canUseBufiConnect } = usePaymentMethod({
    hasSession,
    isLoading: isSessionLoading,
  })
  const [externalWalletAddress, setExternalWalletAddress] = useState<string | null>(null)
  const [isExternalWalletConnected, setIsExternalWalletConnected] = useState(false)
  const [isExternalFunding, setIsExternalFunding] = useState(false)

  // Wagmi hook for external wallet on-chain transactions
  const { writeContractAsync } = useWriteContract()

  useEffect(() => {
    setFetchError(null)
    fetchContract(contractId).catch((err) => {
      setFetchError(err instanceof Error ? err.message : 'Failed to load contract')
    })
    fetchUsdcBalance()
    return () => resetFundingState()
  }, [contractId, fetchContract, fetchUsdcBalance, resetFundingState])

  // Navigate to dashboard after successful funding
  useEffect(() => {
    if (fundingState === 'success') {
      toast({ title: 'Escrow funded successfully', variant: 'success-light' })
      const timeout = setTimeout(() => {
        router.push(`/contracts/${contractId}`)
      }, 2500)
      return () => clearTimeout(timeout)
    }
    if (fundingState === 'error' && fundingError) {
      toast({ title: fundingError, variant: 'error-light' })
    }
  }, [fundingState, fundingError, contractId, router])

  // BuFi Connect wallet deposit — uses the platform wallet via API
  const handleBufiDeposit = async () => {
    if (!contract) return
    const amountDue = contract.totalAmount - contract.fundedAmount
    if (amountDue <= 0) return
    // BuFi path: the backend handles the on-chain tx via the platform wallet
    await fundEscrow(amountDue, `bufi-deposit-${Date.now()}`)
  }

  // External wallet deposit — approve USDC + fund escrow on-chain via wagmi
  const handleExternalFund = async () => {
    if (!contract?.escrowAddress || !externalWalletAddress) return
    const amountDue = contract.totalAmount - contract.fundedAmount
    if (amountDue <= 0) return

    const escrowAddr = contract.escrowAddress as `0x${string}`
    // USDC has 6 decimals
    const amountRaw = BigInt(Math.round(amountDue * 1_000_000))

    // Validate USDC address before starting the flow
    const usdcAddress = getUsdcAddress(contract.chain)
    if (!usdcAddress) {
      toast({ title: `USDC address not found for chain: ${contract.chain}`, variant: 'error-light' })
      return
    }

    setIsExternalFunding(true)
    try {
      // Step 1: Approve the escrow contract to spend USDC
      const approveHash = await writeContractAsync({
        address: usdcAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [escrowAddr, amountRaw],
      })

      // Wait for approval confirmation
      await waitForTransactionReceipt(wagmiConfig, { hash: approveHash })

      // Step 2: Fund the escrow
      const fundHash = await writeContractAsync({
        address: escrowAddr,
        abi: ESCROW_WITH_AGENT_V3_ABI as readonly unknown[],
        functionName: 'fund',
        args: [],
      })
      await waitForTransactionReceipt(wagmiConfig, { hash: fundHash })

      // Step 3: Record in the DB
      await fundEscrow(amountDue, fundHash)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'External wallet funding failed'
      toast({ title: msg, variant: 'error-light' })
    } finally {
      setIsExternalFunding(false)
    }
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm">
        <AlertCircle className="w-5 h-5 text-destructive" />
        <p className="text-destructive">{fetchError}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            setFetchError(null)
            fetchContract(contractId).catch((err) => {
              setFetchError(err instanceof Error ? err.message : 'Failed to load contract')
            })
          }}>
            Try again
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/contracts">Back to contracts</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (loading || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading contract...</span>
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgba(183,255,241,0.2)] mb-4">
            <Check className="w-8 h-8 text-purpleDanis" />
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgba(255,235,180,0.2)] mb-4">
            <AlertCircle className="w-8 h-8 text-textDanis" />
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

  const amountDue = contract.totalAmount - contract.fundedAmount
  const estimatedGas = 0.50
  const totalWithGas = amountDue + estimatedGas
  const sufficientBalance = hasSufficientBalance()

  // Success state
  if (fundingState === 'success') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgba(183,255,241,0.2)] mb-4">
            <Check className="w-8 h-8 text-purpleDanis" />
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
                <span className="font-medium">${contract.fundedAmount.toLocaleString()} USDC</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Amount Due</span>
                  <span className="text-primary">${amountDue.toLocaleString()} USDC</span>
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
                  sufficientBalance ? 'text-purpleDanis' : 'text-destructive'
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
                <span className="text-xs bg-[rgba(183,255,241,0.2)] text-purpleDanis px-2 py-0.5 rounded-full">
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
                <span className="font-medium">${amountDue.toLocaleString()} USDC</span>
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
                confirmed ? 'bg-muted/30' : 'hover:bg-muted/50'
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

        {/* Payment Method Selection */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <PaymentMethodSelector
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              canUseBufiConnect={canUseBufiConnect}
              showSignInMessage={!isSessionLoading}
            />
          </CardContent>
        </Card>

        {/* CTA */}
        <Card>
          <CardContent className="pt-6">
            {paymentMethod === 'external' ? (
              <>
                <ExternalWalletConnector
                  onConnect={(address) => {
                    setExternalWalletAddress(address)
                    setIsExternalWalletConnected(true)
                  }}
                  onDisconnect={() => {
                    setExternalWalletAddress(null)
                    setIsExternalWalletConnected(false)
                  }}
                />
                {isExternalWalletConnected && (
                  <>
                  {!contract?.escrowAddress && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Escrow contract is being deployed on-chain. External wallet funding will be available shortly.
                    </p>
                  )}
                  <Button
                    className="w-full h-12 text-base mt-4"
                    disabled={
                      !confirmed ||
                      !contract?.escrowAddress ||
                      isExternalFunding ||
                      (fundingState !== 'idle' && fundingState !== 'error')
                    }
                    onClick={handleExternalFund}
                  >
                    {isExternalFunding ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Approving & Funding...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-5 h-5 mr-2" />
                        Approve & Fund ${amountDue.toLocaleString()} USDC
                      </>
                    )}
                  </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Connected:</span>
                    <span className="text-sm font-mono">
                      {currentUserWallet?.slice(0, 10)}...{currentUserWallet?.slice(-8)}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full h-12 text-base"
                  disabled={!confirmed || !sufficientBalance || (fundingState !== 'idle' && fundingState !== 'error')}
                  onClick={handleBufiDeposit}
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
                  {(fundingState === 'idle' || fundingState === 'error') && (
                    <>
                      <Wallet className="w-5 h-5 mr-2" />
                      Deposit ${amountDue.toLocaleString()} USDC
                    </>
                  )}
                </Button>
              </>
            )}

            {fundingError && (
              <p className="text-center text-sm text-destructive mt-3">{fundingError}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
