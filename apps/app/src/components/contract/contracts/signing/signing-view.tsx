'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@bu/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@bu/ui/card'
import {
  ArrowLeft,
  FileText,
  PenLine,
  Copy,
  Check,
  ExternalLink,
  Send,
  Clock,
  PartyPopper,
  Wallet,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useActiveContractStore } from '@/lib/active-contract-store'
import { SignatureStatusList } from './signature-status'
import { SigningTerms } from './signing-terms'
import { SigningProgress } from './signing-progress'
import { SigningViewSkeleton } from '../skeletons'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'
import { useSignMessage, useAccount } from 'wagmi'
import { keccak256, toBytes } from 'viem'


interface SigningViewProps {
  contractId: string
}

export function SigningView({ contractId }: SigningViewProps) {
  const {
    contract,
    loading,
    currentUserRole,
    currentUserWallet,
    signingState,
    fetchContract,
    signContract,
    resetSigningState,
    canSign,
    hasUserSigned,
    hasCounterpartySigned,
    bothSigned,
    sendSigningReminder,
    lastReminderSent,
  } = useActiveContractStore()

  const { address: walletAddress } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [termsAgreed, setTermsAgreed] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reminderSent, setReminderSent] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    setFetchError(null)
    fetchContract(contractId).catch((err) => {
      setFetchError(err instanceof Error ? err.message : 'Failed to load contract')
    })
  }, [contractId, fetchContract])

  useEffect(() => {
    if (signingState === 'confirming' || signingState === 'signing') {
      setShowProgress(true)
    }
    if (signingState === 'success') {
      toast.success('Contract signed successfully')
      setTimeout(() => setShowProgress(false), 2000)
    }
    if (signingState === 'error') {
      toast.error('Failed to sign contract. Please try again.')
      setShowProgress(false)
    }
  }, [signingState])

  const buildSigningMessage = useCallback((): { message: string; hash: string } | null => {
    if (!contract) return null
    const agreementJson = JSON.stringify({
      id: contract.id,
      name: contract.name,
      totalAmount: contract.totalAmount,
      parties: contract.parties,
      milestones: contract.milestones,
      commissions: contract.commissions ?? [],
      conditions: (contract as Record<string, unknown>).conditions ?? [],
    })
    const hash = keccak256(toBytes(agreementJson))
    return { message: `I agree to contract: ${contract.id} | Hash: ${hash}`, hash }
  }, [contract])

  const handleSign = async () => {
    if (!contract) return
    setShowProgress(true)

    try {
      const signingData = buildSigningMessage()
      if (!signingData) {
        toast.error('Unable to build signing message')
        setShowProgress(false)
        return
      }

      // Request EIP-191 wallet signature
      const signature = await signMessageAsync({ message: signingData.message })

      await signContract({ signature, messageHash: signingData.hash })
    } catch (error) {
      // User rejected or wallet error — the store handles state reset
      if ((error as Error)?.message?.includes('User rejected')) {
        toast.error('Signature rejected by wallet')
        setShowProgress(false)
        resetSigningState()
      }
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendReminder = async () => {
    await sendSigningReminder()
    setReminderSent(true)
    setTimeout(() => setReminderSent(false), 3000)
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
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="container max-w-3xl mx-auto px-4 py-4">
            <Link
              href={`/contracts/${contractId}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Contract
            </Link>
          </div>
        </div>
        <div className="container max-w-3xl mx-auto px-4 py-8">
          <SigningViewSkeleton />
        </div>
      </div>
    )
  }

  const payer = contract.parties.find((p) => p.role === 'payer')!
  const payee = contract.parties.find((p) => p.role === 'payee')!
  const payerSignature = contract.signatures.find((s) => s.party.role === 'payer')
  const payeeSignature = contract.signatures.find((s) => s.party.role === 'payee')

  const commissionTotal = (contract.commissions ?? []).reduce((sum: number, c: { percentage: number }) => sum + c.percentage, 0)
  const userSigned = hasUserSigned()
  const counterpartySigned = hasCounterpartySigned()
  const allSigned = bothSigned()

  // Determine which view to show
  const showAwaitingCounterparty = userSigned && !counterpartySigned
  const showBothSigned = allSigned
  const showNeedToSign = canSign()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container max-w-3xl mx-auto px-4 py-4">
          <Link
            href={`/contracts/${contractId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Contract
          </Link>
        </div>
      </div>

      <div className="container max-w-3xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          {showNeedToSign && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <PenLine className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Sign Contract</h1>
              <p className="text-muted-foreground">{contract.name}</p>
            </>
          )}

          {showAwaitingCounterparty && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold mb-2">You have Signed!</h1>
              <p className="text-muted-foreground">Waiting for counterparty</p>
            </>
          )}

          {showBothSigned && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
                <PartyPopper className="w-8 h-8 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Contract Signed!</h1>
              <p className="text-muted-foreground mb-6">Both parties have agreed. {currentUserRole === 'payer' ? 'Next step: Fund the escrow.' : 'Waiting for payer to fund escrow.'}</p>
              {currentUserRole === 'payer' && (
                <Link href={`/contracts/${contractId}/fund`}>
                  <Button className="gap-2">
                    <Wallet className="w-4 h-4" />
                    Fund Escrow Now
                  </Button>
                </Link>
              )}
            </>
          )}
        </div>

        {/* Contract Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Contract Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Value</span>
                <span className="font-medium">${contract.totalAmount.toLocaleString()} USDC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Milestones</span>
                <span className="font-medium">{contract.milestones.length} payments</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">
                  {format(contract.milestones[0]?.dueDate || new Date(), 'MMM d')} - {format(contract.milestones[contract.milestones.length - 1]?.dueDate || new Date(), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Role</span>
                <span className="font-medium capitalize">{currentUserRole} ({currentUserRole === 'payer' ? 'Client' : 'Contractor'})</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Counterparty</span>
                <span className="font-medium">
                  {currentUserRole === 'payer' ? (payee.bufiHandle || payee.name) : (payer.bufiHandle || payer.name)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Escrow Yield</span>
                <span className="font-medium">
                  {contract.yieldConfiguration?.strategy === 'aave-v3' ? 'AAVE V3 (~3-5% APY)' : 'None'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Chain</span>
                <span className="font-medium">{contract.chain}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <Link
                href={`/contracts/${contractId}/preview`}
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                View Full Contract
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Signature Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PenLine className="w-4 h-4" />
              Signature Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SignatureStatusList
              payer={payer}
              payee={payee}
              payerSignature={payerSignature}
              payeeSignature={payeeSignature}
              currentUserRole={currentUserRole}
            />
          </CardContent>
        </Card>

        {/* PDF Preview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Agreement Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
              <iframe
                src={`/api/contracts/pdf?id=${contract.id}`}
                className="w-full h-[400px]"
                title="Agreement PDF Preview"
              />
            </div>
            <a
              href={`/api/contracts/pdf?id=${contract.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              Open in new tab
              <ExternalLink className="w-3 h-3" />
            </a>
          </CardContent>
        </Card>

        {/* Need to Sign View */}
        {showNeedToSign && (
          <>
            <SigningTerms
              totalAmount={contract.totalAmount}
              commissionPercentage={commissionTotal}
              onAgreed={setTermsAgreed}
            />

            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Connected:</span>
                    <span className="text-sm font-mono">
                      {(walletAddress ?? currentUserWallet)?.slice(0, 10)}...{(walletAddress ?? currentUserWallet)?.slice(-8)}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Disconnect
                  </Button>
                </div>

                {!walletAddress && (
                  <p className="text-center text-xs text-amber-500 mb-3">
                    Connect your wallet to sign with EIP-191
                  </p>
                )}

                <Button
                  className="w-full h-12 text-base"
                  disabled={!termsAgreed || signingState !== 'idle' || !walletAddress}
                  onClick={handleSign}
                >
                  <PenLine className="w-5 h-5 mr-2" />
                  Sign with Wallet
                </Button>

                <p className="text-center text-xs text-muted-foreground mt-3">
                  EIP-191 personal signature on {contract.chain}
                  <br />
                  No gas required — off-chain signature
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Awaiting Counterparty View */}
        {showAwaitingCounterparty && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Remind Counterparty
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lastReminderSent && (
                  <p className="text-sm text-muted-foreground mb-3">
                    Last notified: {formatDistanceToNow(lastReminderSent, { addSuffix: true })}
                  </p>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={handleSendReminder}
                    disabled={reminderSent}
                  >
                    {reminderSent ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Reminder Sent
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Reminder
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Signing Link
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  What happens next?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">1</span>
                    <span className="text-muted-foreground">
                      Counterparty signs → Smart contract deploys
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">2</span>
                    <span className="text-muted-foreground">
                      You deposit ${contract.totalAmount.toLocaleString()} USDC → Escrow activates
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">3</span>
                    <span className="text-muted-foreground">
                      Work begins → Milestones unlock sequentially
                    </span>
                  </li>
                </ol>

                <p className="mt-4 text-xs text-amber-500">
                  Contract expires if not fully signed within 14 days.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Both Signed View */}
        {showBothSigned && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  All Signatures Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {payerSignature && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium">{payer.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {payerSignature.signedAt && format(payerSignature.signedAt, 'MMM d, h:mm a')}
                      </span>
                    </div>
                  )}
                  {payeeSignature && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium">{payee.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {payeeSignature.signedAt && format(payeeSignature.signedAt, 'MMM d, h:mm a')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {contract.smartContractAddress && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Smart Contract Deployed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="font-mono">
                        {contract.smartContractAddress.slice(0, 10)}...{contract.smartContractAddress.slice(-8)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chain:</span>
                      <span>{contract.chain}</span>
                    </div>
                  </div>
                  <a
                    href={`https://sepolia.etherscan.io/address/${contract.smartContractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    View on Etherscan
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </CardContent>
              </Card>
            )}

            {/* Fund Escrow CTA */}
            {currentUserRole === 'payer' && !contract.fundedAt && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold mb-1">Next Step: Fund the Escrow</h3>
                    <p className="text-sm text-muted-foreground">
                      Deposit ${contract.totalAmount.toLocaleString()} USDC to activate the contract and begin work on Milestone 1.
                    </p>
                  </div>

                  <Link href={`/contracts/${contractId}/fund`}>
                    <Button className="w-full h-12 text-base">
                      <Wallet className="w-5 h-5 mr-2" />
                      Fund Escrow Now
                    </Button>
                  </Link>

                  <Link
                    href={`/contracts/${contractId}`}
                    className="block text-center text-sm text-muted-foreground hover:text-foreground mt-3"
                  >
                    Do This Later
                  </Link>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Signing Progress Modal */}
      <SigningProgress
        open={showProgress}
        onOpenChange={setShowProgress}
        state={signingState}
        walletAddress={currentUserWallet || ''}
        contractNumber={contract.contractNumber || contract.id}
        chain={contract.chain}
        onCancel={() => {
          setShowProgress(false)
          resetSigningState()
        }}
      />
    </div>
  )
}
