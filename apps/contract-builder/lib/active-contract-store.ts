import { create } from 'zustand'
import type {
  Contract,
  ContractStatus,
  Milestone,
  MilestoneStatus,
  Submission,
  YieldStatus,
  EscrowStatus,
  Signature,
} from '@/types/contracts'
import {
  getAgreement,
  submitDeliverable as submitDeliverableApi,
  getMilestoneVerification,
  signAgreement,
  fundAgreement,
} from '@/lib/api/client'

// Signing states
export type SigningState = 'idle' | 'confirming' | 'signing' | 'success' | 'error'

// Funding states
export type FundingState = 'idle' | 'approving' | 'depositing' | 'success' | 'error'

// Submission states
export type SubmissionState = 'idle' | 'uploading' | 'submitting' | 'success' | 'error'

// Verification states
export type VerificationState = 'idle' | 'polling' | 'complete'

interface ActiveContractStore {
  // Active contract
  contract: Contract | null
  loading: boolean
  error: string | null
  
  // User context
  currentUserRole: 'payer' | 'payee' | null
  currentUserWallet: string | null
  
  // Contract actions
  fetchContract: (id: string) => Promise<void>
  setContract: (contract: Contract) => void
  updateContractStatus: (status: ContractStatus) => void
  
  // Signing flow
  signingState: SigningState
  signingError: string | null
  signContract: () => Promise<void>
  resetSigningState: () => void
  
  // Computed signing values
  canSign: () => boolean
  hasUserSigned: () => boolean
  hasCounterpartySigned: () => boolean
  bothSigned: () => boolean
  
  // Send reminder
  sendSigningReminder: () => Promise<void>
  lastReminderSent: Date | null
  
  // Funding flow
  fundingState: FundingState
  fundingError: string | null
  userUsdcBalance: number | null
  fundEscrow: (amount: number) => Promise<void>
  fetchUsdcBalance: () => Promise<void>
  resetFundingState: () => void
  
  // Computed funding values
  canFund: () => boolean
  hasSufficientBalance: () => boolean
  
  // Milestone state
  activeMilestone: Milestone | null
  setActiveMilestone: (milestone: Milestone | null) => void
  updateMilestoneStatus: (milestoneId: string, status: MilestoneStatus) => void
  
  // Submission flow
  submissionState: SubmissionState
  submissionProgress: number
  submissionError: string | null
  submitDeliverable: (milestoneId: string, files: File[], links: string[], notes?: string) => Promise<void>
  resetSubmissionState: () => void
  
  // Verification polling
  verificationState: VerificationState
  startVerificationPolling: (submissionId: string) => void
  stopVerificationPolling: () => void
  
  // Yield tracking
  yieldStatus: YieldStatus | null
  fetchYieldStatus: () => Promise<void>
  
  // Escrow tracking
  escrowStatus: EscrowStatus | null
  fetchEscrowStatus: () => Promise<void>
  
  // Reset
  reset: () => void
}

// Mock data for development
const mockContract: Contract = {
  id: 'contract-001',
  name: 'MOIC Digital - Website Redesign',
  contractNumber: 'BUFI-2026-0042',
  templateType: 'freelance-service',
  status: 'pending_sign',
  payer: {
    id: 'party-1',
    name: 'Acme Corp',
    bufiHandle: 'acme.bufi.eth',
    walletAddress: '0x7f3a4b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a',
    email: 'billing@acme.com',
    role: 'payer',
  },
  payee: {
    id: 'party-2',
    name: 'MOIC Digital',
    bufiHandle: 'moic.bufi.eth',
    walletAddress: '0x9c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
    email: 'contracts@moic.digital',
    role: 'payee',
  },
  totalAmount: 12500,
  chain: 'Avalanche C-Chain',
  commissions: [
    { id: 'comm-1', recipientName: 'MOIC Digital Referral', recipientAddress: '0x...', percentage: 1.5 },
    { id: 'comm-2', recipientName: 'BUFI Platform', recipientAddress: '0x...', percentage: 1.0 },
  ],
  yieldConfiguration: {
    strategy: 'aave-v3',
    recipientType: 'performance',
    payerPercentage: 50,
    payeePercentage: 50,
    performanceRules: {
      bonuses: [
        { id: 'bonus-1', trigger: 'first_attempt', beneficiary: 'payee', percentage: 25, description: 'First-attempt approval' },
        { id: 'bonus-2', trigger: 'early_delivery', beneficiary: 'payee', percentage: 10, description: 'Early delivery' },
      ],
      clawbacks: [
        { id: 'claw-1', trigger: 'retry_required', beneficiary: 'payer', percentage: 15, description: 'Retry penalty' },
        { id: 'claw-2', trigger: 'dispute', beneficiary: 'payer', percentage: 100, description: 'Dispute clawback' },
      ],
    },
  },
  milestones: [
    {
      id: 'ms-1',
      contractId: 'contract-001',
      name: 'Research & Concepts',
      description: 'Competitor analysis, mood boards, and 3 concept directions',
      orderIndex: 0,
      amount: 2550,
      percentage: 20,
      verificationCriteria: 'Complete research document with competitor analysis and 3 unique concept directions presented as mood boards',
      requiredDeliverables: [
        { id: 'del-1', type: 'pdf', description: 'Research document', required: true },
        { id: 'del-2', type: 'figma', description: 'Mood boards', required: true },
      ],
      status: 'pending',
      maxRetries: 3,
      currentAttempt: 0,
      submissions: [],
      dueDate: new Date('2026-02-01'),
      createdAt: new Date(),
    },
    {
      id: 'ms-2',
      contractId: 'contract-001',
      name: 'Initial Designs',
      description: 'Homepage and 2 key page designs in Figma',
      orderIndex: 1,
      amount: 1450,
      percentage: 12,
      verificationCriteria: 'Figma file with homepage and 2 additional page designs, including desktop and mobile variants',
      requiredDeliverables: [
        { id: 'del-3', type: 'figma', description: 'Design file', required: true },
      ],
      status: 'pending',
      maxRetries: 3,
      currentAttempt: 0,
      submissions: [],
      dueDate: new Date('2026-02-08'),
      createdAt: new Date(),
    },
    {
      id: 'ms-3',
      contractId: 'contract-001',
      name: 'Design Refinement',
      description: 'Refined designs based on feedback',
      orderIndex: 2,
      amount: 2550,
      percentage: 20,
      verificationCriteria: 'Updated Figma file incorporating all feedback with final design direction',
      requiredDeliverables: [
        { id: 'del-4', type: 'figma', description: 'Refined designs', required: true },
        { id: 'del-5', type: 'pdf', description: 'Design rationale', required: false },
      ],
      status: 'pending',
      maxRetries: 3,
      currentAttempt: 0,
      submissions: [],
      dueDate: new Date('2026-02-15'),
      createdAt: new Date(),
    },
    {
      id: 'ms-4',
      contractId: 'contract-001',
      name: 'Final Assets',
      description: 'Export-ready design assets and style guide',
      orderIndex: 3,
      amount: 2550,
      percentage: 20,
      verificationCriteria: 'Complete asset package with PNG/SVG exports and comprehensive style guide PDF',
      requiredDeliverables: [
        { id: 'del-6', type: 'zip', description: 'Asset package', required: true },
        { id: 'del-7', type: 'pdf', description: 'Style guide', required: true },
      ],
      status: 'pending',
      maxRetries: 3,
      currentAttempt: 0,
      submissions: [],
      dueDate: new Date('2026-03-01'),
      createdAt: new Date(),
    },
    {
      id: 'ms-5',
      contractId: 'contract-001',
      name: 'Handoff & Documentation',
      description: 'Developer handoff with documentation',
      orderIndex: 4,
      amount: 3400,
      percentage: 28,
      verificationCriteria: 'Developer-ready Figma file with inspect mode enabled and comprehensive handoff documentation',
      requiredDeliverables: [
        { id: 'del-8', type: 'figma', description: 'Dev-ready file', required: true },
        { id: 'del-9', type: 'pdf', description: 'Handoff docs', required: true },
      ],
      status: 'pending',
      maxRetries: 3,
      currentAttempt: 0,
      submissions: [],
      dueDate: new Date('2026-03-15'),
      createdAt: new Date(),
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
}

const statusMap: Record<string, ContractStatus> = {
  DRAFT: 'draft',
  PENDING_SIGN: 'pending_sign',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
  CANCELLED: 'cancelled',
}

const milestoneStateMap: Record<string, MilestoneStatus> = {
  PENDING: 'pending',
  FUNDED: 'active',
  SUBMITTED: 'submitted',
  VERIFYING: 'verifying',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RELEASED: 'released',
  DISPUTED: 'disputed',
  CANCELLED: 'rejected',
}

function mapAgreementToContract(data: Record<string, unknown>): Contract {
  const rawMilestones = Array.isArray(data.milestones)
    ? (data.milestones as Array<Record<string, unknown>>)
    : []
  const totalAmount = typeof data.total_amount === 'number' ? data.total_amount : 0

  return {
    ...mockContract,
    id: String(data.agreement_id ?? mockContract.id),
    name: String(data.title ?? mockContract.name),
    contractNumber: String(data.agreement_id ?? mockContract.contractNumber),
    status: statusMap[String(data.status ?? 'DRAFT')] ?? mockContract.status,
    totalAmount,
    smartContractAddress:
      typeof data.escrow_address === 'string' && data.escrow_address.length > 0
        ? data.escrow_address
        : mockContract.smartContractAddress,
    milestones:
      rawMilestones.length > 0
        ? rawMilestones.map((ms, index) => ({
            id: String(ms.id ?? `ms-${index + 1}`),
            contractId: String(data.agreement_id ?? ''),
            name: String(ms.title ?? `Milestone ${index + 1}`),
            description: '',
            orderIndex: Number(ms.index ?? index),
            amount: Number(ms.amount ?? 0),
            percentage:
              totalAmount > 0 ? Math.round((Number(ms.amount ?? 0) / totalAmount) * 100) : 0,
            verificationCriteria: JSON.stringify(ms.criteria ?? []),
            requiredDeliverables: [],
            status: milestoneStateMap[String(ms.state ?? 'PENDING')] ?? 'pending',
            maxRetries: Number(ms.max_retries ?? 3),
            currentAttempt: Number(ms.current_attempt ?? 0),
            submissions: [],
            dueDate:
              typeof ms.due_date === 'string' && ms.due_date.length > 0
                ? new Date(ms.due_date)
                : undefined,
            createdAt:
              typeof ms.created_at === 'string' ? new Date(ms.created_at) : new Date(),
          }))
        : mockContract.milestones,
    createdAt:
      typeof data.created_at === 'string' ? new Date(data.created_at) : new Date(),
    updatedAt:
      typeof data.updated_at === 'string' ? new Date(data.updated_at) : new Date(),
  }
}

export const useActiveContractStore = create<ActiveContractStore>((set, get) => ({
  // Initial state
  contract: null,
  loading: false,
  error: null,
  currentUserRole: null,
  currentUserWallet: null,
  
  // Signing state
  signingState: 'idle',
  signingError: null,
  lastReminderSent: null,
  
  // Funding state
  fundingState: 'idle',
  fundingError: null,
  userUsdcBalance: null,
  
  // Milestone state
  activeMilestone: null,
  
  // Submission state
  submissionState: 'idle',
  submissionProgress: 0,
  submissionError: null,
  
  // Verification state
  verificationState: 'idle',
  
  // Yield & Escrow
  yieldStatus: null,
  escrowStatus: null,
  
  // Contract actions
  fetchContract: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const agreement = await getAgreement(id)
      const contract = mapAgreementToContract(agreement)
      set({ 
        contract,
        currentUserRole: 'payer', // Mock: assume current user is payer
        currentUserWallet: '0x7f3a4b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a',
        loading: false,
      })
    } catch (error) {
      set({ error: 'Failed to load contract', loading: false })
    }
  },
  
  setContract: (contract) => set({ contract }),
  
  updateContractStatus: (status) => {
    const { contract } = get()
    if (contract) {
      set({ contract: { ...contract, status } })
    }
  },
  
  // Signing flow
  signContract: async () => {
    set({ signingState: 'confirming' })
    try {
      set({ signingState: 'signing' })

      // Update contract with signature
      const { contract, currentUserRole } = get()
      if (contract && currentUserRole) {
        const signerAddress =
          currentUserRole === 'payer' ? contract.payer.walletAddress : contract.payee.walletAddress
        await signAgreement(contract.id, currentUserRole, signerAddress)

        const signature: Signature = {
          partyId: currentUserRole === 'payer' ? contract.payer.id : contract.payee.id,
          role: currentUserRole,
          signed: true,
          signedAt: new Date(),
          txHash: '0x' + Math.random().toString(16).substring(2, 42),
          blockNumber: 48291033,
        }
        
        const updatedContract = { ...contract }
        if (currentUserRole === 'payer') {
          updatedContract.payerSignature = signature
        } else {
          updatedContract.payeeSignature = signature
        }
        
        // Check if both signed
        if (updatedContract.payerSignature?.signed && updatedContract.payeeSignature?.signed) {
          updatedContract.status = 'active'
          updatedContract.signedAt = new Date()
        }
        
        set({ contract: updatedContract, signingState: 'success' })
      }
    } catch (error) {
      set({ signingState: 'error', signingError: 'Signing failed. Please try again.' })
    }
  },
  
  resetSigningState: () => set({ signingState: 'idle', signingError: null }),
  
  canSign: () => {
    const { contract, currentUserRole } = get()
    if (!contract || !currentUserRole) return false
    
    if (currentUserRole === 'payer') {
      return !contract.payerSignature?.signed
    }
    return !contract.payeeSignature?.signed
  },
  
  hasUserSigned: () => {
    const { contract, currentUserRole } = get()
    if (!contract || !currentUserRole) return false
    
    if (currentUserRole === 'payer') {
      return contract.payerSignature?.signed ?? false
    }
    return contract.payeeSignature?.signed ?? false
  },
  
  hasCounterpartySigned: () => {
    const { contract, currentUserRole } = get()
    if (!contract || !currentUserRole) return false
    
    if (currentUserRole === 'payer') {
      return contract.payeeSignature?.signed ?? false
    }
    return contract.payerSignature?.signed ?? false
  },
  
  bothSigned: () => {
    const { contract } = get()
    if (!contract) return false
    return (contract.payerSignature?.signed ?? false) && (contract.payeeSignature?.signed ?? false)
  },
  
  sendSigningReminder: async () => {
    // TODO: Connect this to notifications service endpoint.
    set({ lastReminderSent: new Date() })
  },
  
  // Funding flow
  fundEscrow: async (amount: number) => {
    set({ fundingState: 'approving' })
    try {
      set({ fundingState: 'depositing' })

      const { contract } = get()
      if (contract) {
        const txHash = '0x' + Math.random().toString(16).substring(2, 42)
        await fundAgreement(contract.id, amount, txHash)

        set({
          contract: {
            ...contract,
            status: 'active',
            fundedAt: new Date(),
            escrow: {
              totalDeposited: amount,
              currentBalance: amount,
              totalReleased: 0,
              yieldEarned: 0,
              lastUpdated: new Date(),
            },
            smartContractAddress: '0x' + Math.random().toString(16).substring(2, 42),
          },
          fundingState: 'success',
        })
      }
    } catch (error) {
      set({ fundingState: 'error', fundingError: 'Deposit failed. Please try again.' })
    }
  },
  
  fetchUsdcBalance: async () => {
    // TODO: Wire to wallet balance endpoint.
    set({ userUsdcBalance: 28432.50 })
  },
  
  resetFundingState: () => set({ fundingState: 'idle', fundingError: null }),
  
  canFund: () => {
    const { contract, currentUserRole } = get()
    if (!contract || currentUserRole !== 'payer') return false
    return get().bothSigned() && !contract.fundedAt
  },
  
  hasSufficientBalance: () => {
    const { contract, userUsdcBalance } = get()
    if (!contract || userUsdcBalance === null) return false
    return userUsdcBalance >= contract.totalAmount
  },
  
  // Milestone actions
  setActiveMilestone: (milestone) => set({ activeMilestone: milestone }),
  
  updateMilestoneStatus: (milestoneId, status) => {
    const { contract } = get()
    if (contract) {
      const milestones = contract.milestones.map(m => 
        m.id === milestoneId ? { ...m, status } : m
      )
      set({ contract: { ...contract, milestones } })
    }
  },
  
  // Submission flow
  submitDeliverable: async (milestoneId, files, links, notes) => {
    set({ submissionState: 'uploading', submissionProgress: 0 })
    try {
      const { contract } = get()
      if (contract) {
        set({ submissionProgress: 50, submissionState: 'submitting' })
        const result = await submitDeliverableApi(contract.id, milestoneId, files, notes)
        const verification = result as unknown as { verification?: { verdict?: 'PASS' | 'FAIL' } }

        const milestones = contract.milestones.map((m) =>
          m.id === milestoneId
            ? {
                ...m,
                status:
                  verification?.verification?.verdict === 'PASS'
                    ? ('approved' as MilestoneStatus)
                    : ('rejected' as MilestoneStatus),
                currentAttempt: m.currentAttempt + 1,
              }
            : m
        )
        set({ contract: { ...contract, milestones }, submissionProgress: 100, submissionState: 'success' })
      }
    } catch (error) {
      set({ submissionState: 'error', submissionError: 'Submission failed. Please try again.' })
    }
  },
  
  resetSubmissionState: () => set({ submissionState: 'idle', submissionProgress: 0, submissionError: null }),
  
  // Verification polling
  startVerificationPolling: (submissionId) => {
    set({ verificationState: 'polling' })
    const poll = async () => {
      const { contract, activeMilestone } = get()
      if (!contract || !activeMilestone) {
        set({ verificationState: 'idle' })
        return
      }
      try {
        await getMilestoneVerification(contract.id, activeMilestone.id)
        set({ verificationState: 'complete' })
      } catch {
        setTimeout(() => {
          void poll()
        }, 2500)
      }
    }
    void poll()
  },
  
  stopVerificationPolling: () => {
    set({ verificationState: 'idle' })
  },
  
  // Yield & Escrow
  fetchYieldStatus: async () => {
    // TODO: Fetch actual yield status
    await new Promise(resolve => setTimeout(resolve, 300))
    set({
      yieldStatus: {
        totalAccrued: 47.23,
        currentApy: 3.2,
        projectedPayerYield: 17.72,
        projectedPayeeYield: 29.51,
        bonusesApplied: [],
        clawbacksApplied: [],
      },
    })
  },
  
  fetchEscrowStatus: async () => {
    // TODO: Fetch actual escrow status
    await new Promise(resolve => setTimeout(resolve, 300))
    set({
      escrowStatus: {
        totalDeposited: 12500,
        currentBalance: 8500,
        totalReleased: 4000,
        yieldEarned: 47.23,
        lastUpdated: new Date(),
      },
    })
  },
  
  // Reset
  reset: () => set({
    contract: null,
    loading: false,
    error: null,
    currentUserRole: null,
    currentUserWallet: null,
    signingState: 'idle',
    signingError: null,
    lastReminderSent: null,
    fundingState: 'idle',
    fundingError: null,
    userUsdcBalance: null,
    activeMilestone: null,
    submissionState: 'idle',
    submissionProgress: 0,
    submissionError: null,
    verificationState: 'idle',
    yieldStatus: null,
    escrowStatus: null,
  }),
}))
