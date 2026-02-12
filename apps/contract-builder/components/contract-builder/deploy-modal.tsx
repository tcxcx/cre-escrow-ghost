'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useContractStore } from '@/lib/contract-store'
import { useActiveContractStore } from '@/lib/active-contract-store'
import {
  Check,
  ChevronRight,
  Loader2,
  Mail,
  Link2,
  Copy,
  FileSignature,
  Wallet,
  Shield,
  Sparkles,
  ExternalLink,
  Send,
  Users,
} from 'lucide-react'

interface DeployModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type DeployStep = 'review' | 'counterparty' | 'deploying' | 'complete'

export function DeployModal({ open, onOpenChange }: DeployModalProps) {
  const router = useRouter()
  const { contractName, nodes, edges, settings, saveContract } = useContractStore()
  const { setContract } = useActiveContractStore()
  
  const [step, setStep] = useState<DeployStep>('review')
  const [inviteMethod, setInviteMethod] = useState<'email' | 'link'>('email')
  const [counterpartyEmail, setCounterpartyEmail] = useState('')
  const [personalMessage, setPersonalMessage] = useState('')
  const [deployProgress, setDeployProgress] = useState(0)
  const [deployedContractId, setDeployedContractId] = useState<string | null>(null)
  const [shareLink, setShareLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  // Extract contract details from nodes
  const payerNode = nodes.find(n => n.type === 'party-payer')
  const payeeNode = nodes.find(n => n.type === 'party-payee')
  const milestoneNodes = nodes.filter(n => n.type === 'milestone')
  const totalAmount = milestoneNodes.reduce((sum, m) => sum + ((m.data as { amount?: number }).amount || 0), 0)

  const handleDeploy = async () => {
    setStep('deploying')
    
    // Simulate deployment steps
    const steps = [
      { progress: 20, delay: 500 },
      { progress: 40, delay: 800 },
      { progress: 60, delay: 600 },
      { progress: 80, delay: 700 },
      { progress: 100, delay: 500 },
    ]

    for (const s of steps) {
      await new Promise(resolve => setTimeout(resolve, s.delay))
      setDeployProgress(s.progress)
    }

    // Save and create the active contract
    const saved = saveContract()
    if (saved) {
      const newContractId = saved.id
      const newContract = {
        id: newContractId,
        name: saved.name,
        payer: {
          id: 'payer-1',
          name: (payerNode?.data as { name?: string })?.name || 'Payer',
          email: (payerNode?.data as { email?: string })?.email || counterpartyEmail,
          walletAddress: (payerNode?.data as { walletAddress?: string })?.walletAddress,
          role: 'payer' as const,
        },
        payee: {
          id: 'payee-1',
          name: (payeeNode?.data as { name?: string })?.name || 'Payee',
          email: (payeeNode?.data as { email?: string })?.email || '',
          walletAddress: (payeeNode?.data as { walletAddress?: string })?.walletAddress,
          role: 'payee' as const,
        },
        milestones: milestoneNodes.map((m, i) => ({
          id: `milestone-${i + 1}`,
          title: (m.data as { title?: string }).title || `Milestone ${i + 1}`,
          description: (m.data as { description?: string }).description || '',
          amount: (m.data as { amount?: number }).amount || 0,
          currency: 'USDC' as const,
          status: 'pending' as const,
          verificationCriteria: (m.data as { verificationCriteria?: string }).verificationCriteria || '',
          dueDate: (m.data as { dueDate?: string }).dueDate,
          order: i + 1,
          submissions: [],
        })),
        totalAmount,
        currency: 'USDC' as const,
        chain: settings?.chain || 'base',
        yieldStrategy: settings?.yieldStrategy || 'aave',
        status: 'pending_signatures' as const,
        createdAt: new Date().toISOString(),
        signatures: [],
        escrow: {
          status: 'unfunded' as const,
          fundedAmount: 0,
          totalAmount,
          currency: 'USDC' as const,
        },
      }
      
      // Set the contract in the active contract store
      setContract(newContract as any)
      
      setDeployedContractId(newContractId)
      setShareLink(`${window.location.origin}/contracts/${newContractId}/received`)
    }
    
    await new Promise(resolve => setTimeout(resolve, 300))
    setStep('complete')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleViewContract = () => {
    if (deployedContractId) {
      onOpenChange(false)
      router.push(`/contracts/${deployedContractId}`)
    }
  }

  const handleSignNow = () => {
    if (deployedContractId) {
      onOpenChange(false)
      router.push(`/contracts/${deployedContractId}/sign`)
    }
  }

  const resetModal = () => {
    setStep('review')
    setDeployProgress(0)
    setDeployedContractId(null)
    setCounterpartyEmail('')
    setPersonalMessage('')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) resetModal()
      onOpenChange(o)
    }}>
      <DialogContent className="sm:max-w-[600px]">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {['review', 'counterparty', 'deploying', 'complete'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                step === s 
                  ? 'bg-primary text-primary-foreground' 
                  : ['review', 'counterparty', 'deploying', 'complete'].indexOf(step) > i
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              )}>
                {['review', 'counterparty', 'deploying', 'complete'].indexOf(step) > i ? (
                  <Check className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && (
                <div className={cn(
                  'w-8 h-0.5 mx-1',
                  ['review', 'counterparty', 'deploying', 'complete'].indexOf(step) > i
                    ? 'bg-primary'
                    : 'bg-muted'
                )} />
              )}
            </div>
          ))}
        </div>

        {step === 'review' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-primary" />
                Review Contract
              </DialogTitle>
              <DialogDescription>
                Review your contract details before deploying to the blockchain.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Contract Summary */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Contract Name</span>
                  <span className="font-medium">{contractName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Value</span>
                  <span className="font-medium">${totalAmount.toLocaleString()} USDC</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Milestones</span>
                  <span className="font-medium">{milestoneNodes.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Network</span>
                  <Badge variant="outline" className="capitalize">{settings.chain}</Badge>
                </div>
                {settings.yieldStrategy !== 'none' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Yield Strategy</span>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {settings.yieldStrategy.toUpperCase()}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Parties */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="w-4 h-4 text-primary" />
                  Contract Parties
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-md bg-blue-500/5 border border-blue-500/20">
                    <div className="text-xs text-muted-foreground mb-1">Payer</div>
                    <div className="font-medium text-sm">
                      {(payerNode?.data as { name?: string })?.name || 'Not specified'}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-emerald-500/5 border border-emerald-500/20">
                    <div className="text-xs text-muted-foreground mb-1">Payee</div>
                    <div className="font-medium text-sm">
                      {(payeeNode?.data as { name?: string })?.name || 'Not specified'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Info */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <span className="font-medium">Secured by BUFI Protocol</span>
                  <p className="text-muted-foreground mt-0.5">
                    Funds are held in escrow with blockchain verification. Both parties must sign before funding.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep('counterparty')}>
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'counterparty' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Invite Counterparty
              </DialogTitle>
              <DialogDescription>
                Send this contract to the other party for review and signature.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <RadioGroup value={inviteMethod} onValueChange={(v) => setInviteMethod(v as 'email' | 'link')}>
                <div className={cn(
                  'flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors',
                  inviteMethod === 'email' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                )}>
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span className="font-medium">Send via Email</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Send an email invitation with a personalized message
                    </p>
                  </Label>
                </div>
                <div className={cn(
                  'flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors',
                  inviteMethod === 'link' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                )}>
                  <RadioGroupItem value="link" id="link" />
                  <Label htmlFor="link" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      <span className="font-medium">Copy Shareable Link</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Get a link to share via your preferred channel
                    </p>
                  </Label>
                </div>
              </RadioGroup>

              {inviteMethod === 'email' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="counterpartyEmail">Recipient Email</Label>
                    <Input
                      id="counterpartyEmail"
                      type="email"
                      placeholder="counterparty@example.com"
                      value={counterpartyEmail}
                      onChange={(e) => setCounterpartyEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Personal Message (Optional)</Label>
                    <Textarea
                      id="message"
                      placeholder="Add a note to include with the contract invitation..."
                      value={personalMessage}
                      onChange={(e) => setPersonalMessage(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('review')}>
                Back
              </Button>
              <Button 
                onClick={handleDeploy}
                disabled={inviteMethod === 'email' && !counterpartyEmail}
              >
                <FileSignature className="w-4 h-4 mr-2" />
                Deploy & Send
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'deploying' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                Deploying Contract
              </DialogTitle>
              <DialogDescription>
                Please wait while we deploy your contract to the blockchain.
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 space-y-6">
              <Progress value={deployProgress} className="h-2" />
              
              <div className="space-y-3">
                <DeployStep 
                  label="Validating contract structure" 
                  complete={deployProgress >= 20} 
                  active={deployProgress < 20}
                />
                <DeployStep 
                  label="Generating blockchain metadata" 
                  complete={deployProgress >= 40} 
                  active={deployProgress >= 20 && deployProgress < 40}
                />
                <DeployStep 
                  label="Creating escrow contract" 
                  complete={deployProgress >= 60} 
                  active={deployProgress >= 40 && deployProgress < 60}
                />
                <DeployStep 
                  label="Configuring yield strategy" 
                  complete={deployProgress >= 80} 
                  active={deployProgress >= 60 && deployProgress < 80}
                />
                <DeployStep 
                  label="Finalizing deployment" 
                  complete={deployProgress >= 100} 
                  active={deployProgress >= 80 && deployProgress < 100}
                />
              </div>
            </div>
          </>
        )}

        {step === 'complete' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Check className="w-5 h-5 text-emerald-500" />
                </div>
                Contract Deployed
              </DialogTitle>
              <DialogDescription>
                Your contract has been deployed successfully. Share it with your counterparty.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* Share Link */}
              <div className="space-y-2">
                <Label>Shareable Link</Label>
                <div className="flex gap-2">
                  <Input 
                    value={shareLink} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {linkCopied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Next Steps */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="text-sm font-medium">Next Steps</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">1</span>
                    </div>
                    <span className="text-muted-foreground">
                      Sign the contract to confirm your commitment
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">2</span>
                    </div>
                    <span className="text-muted-foreground">
                      Wait for counterparty to review and sign
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">3</span>
                    </div>
                    <span className="text-muted-foreground">
                      Fund the escrow to activate the contract
                    </span>
                  </div>
                </div>
              </div>

              {inviteMethod === 'email' && counterpartyEmail && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Mail className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm">
                    Invitation sent to <span className="font-medium">{counterpartyEmail}</span>
                  </span>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleViewContract} className="w-full sm:w-auto bg-transparent">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Contract
              </Button>
              <Button onClick={handleSignNow} className="w-full sm:w-auto">
                <Wallet className="w-4 h-4 mr-2" />
                Sign Now
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DeployStep({ label, complete, active }: { label: string; complete: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
        complete 
          ? 'bg-emerald-500/10' 
          : active 
            ? 'bg-primary/10' 
            : 'bg-muted'
      )}>
        {complete ? (
          <Check className="w-3.5 h-3.5 text-emerald-500" />
        ) : active ? (
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>
      <span className={cn(
        'text-sm',
        complete ? 'text-foreground' : active ? 'text-foreground' : 'text-muted-foreground'
      )}>
        {label}
      </span>
    </div>
  )
}
