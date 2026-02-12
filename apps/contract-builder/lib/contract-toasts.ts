import { toast } from 'sonner'

// Contract lifecycle toasts
export const contractToasts = {
  // Contract created
  created: (name: string) => {
    toast.success('Contract created', {
      description: `"${name}" is ready for deployment.`,
    })
  },

  // Contract deployed
  deployed: (name: string) => {
    toast.success('Contract deployed', {
      description: `"${name}" has been deployed to the blockchain.`,
    })
  },

  // Contract sent for signature
  sentForSignature: (recipientEmail: string) => {
    toast.success('Contract sent', {
      description: `Signature request sent to ${recipientEmail}`,
    })
  },

  // Signature confirmed
  signatureConfirmed: () => {
    toast.success('Signature confirmed', {
      description: 'Your signature has been recorded on the blockchain.',
    })
  },

  // Both parties signed
  bothPartiesSigned: () => {
    toast.success('All signatures collected', {
      description: 'Contract is ready for funding.',
    })
  },

  // Escrow funded
  escrowFunded: (amount: number, currency: string) => {
    toast.success('Escrow funded', {
      description: `$${amount.toLocaleString()} ${currency} deposited into escrow.`,
    })
  },

  // Milestone submitted
  milestoneSubmitted: (title: string) => {
    toast.success('Milestone submitted', {
      description: `"${title}" submitted for AI verification.`,
    })
  },

  // Verification complete
  verificationComplete: (passed: boolean, title: string) => {
    if (passed) {
      toast.success('Verification passed', {
        description: `"${title}" has been verified and approved.`,
      })
    } else {
      toast.warning('Verification needs revision', {
        description: `"${title}" requires changes. Check the feedback.`,
      })
    }
  },

  // Payment released
  paymentReleased: (amount: number, currency: string, recipient: string) => {
    toast.success('Payment released', {
      description: `$${amount.toLocaleString()} ${currency} sent to ${recipient}`,
      action: {
        label: 'View TX',
        onClick: () => {
          // Would open transaction in explorer
        },
      },
    })
  },

  // Contract completed
  completed: (name: string) => {
    toast.success('Contract completed', {
      description: `"${name}" has been successfully completed.`,
    })
  },

  // Yield accrued
  yieldAccrued: (amount: number) => {
    toast.success('Yield accrued', {
      description: `$${amount.toFixed(2)} earned from escrow yield.`,
    })
  },

  // Cancellation requested
  cancellationRequested: () => {
    toast.info('Cancellation requested', {
      description: 'Waiting for counterparty approval.',
    })
  },

  // Cancellation approved
  cancellationApproved: () => {
    toast.success('Contract cancelled', {
      description: 'Funds have been distributed according to terms.',
    })
  },

  // Dispute filed
  disputeFiled: () => {
    toast.info('Dispute filed', {
      description: 'An arbiter will review the case.',
    })
  },

  // Reminder sent
  reminderSent: (recipientName: string) => {
    toast.success('Reminder sent', {
      description: `${recipientName} has been notified.`,
    })
  },
}

// Wallet/Transaction toasts
export const walletToasts = {
  // Wallet connected
  connected: (address: string) => {
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
    toast.success('Wallet connected', {
      description: shortAddress,
    })
  },

  // Wallet disconnected
  disconnected: () => {
    toast.info('Wallet disconnected')
  },

  // Wrong network
  wrongNetwork: (requiredNetwork: string) => {
    toast.error('Wrong network', {
      description: `Please switch to ${requiredNetwork}`,
      action: {
        label: 'Switch',
        onClick: () => {
          // Would trigger network switch
        },
      },
    })
  },

  // Transaction pending
  transactionPending: (type: string) => {
    toast.loading(`${type} pending...`, {
      description: 'Please confirm in your wallet.',
    })
  },

  // Transaction confirmed
  transactionConfirmed: (type: string, txHash?: string) => {
    toast.success(`${type} confirmed`, {
      description: txHash ? `TX: ${txHash.slice(0, 10)}...` : undefined,
      action: txHash
        ? {
            label: 'View',
            onClick: () => {
              window.open(`https://etherscan.io/tx/${txHash}`, '_blank')
            },
          }
        : undefined,
    })
  },

  // Transaction failed
  transactionFailed: (reason: string) => {
    toast.error('Transaction failed', {
      description: reason,
      action: {
        label: 'Try Again',
        onClick: () => {
          // Would retry the transaction
        },
      },
    })
  },

  // Insufficient balance
  insufficientBalance: (required: number, available: number, currency: string) => {
    toast.error('Insufficient balance', {
      description: `Need ${required} ${currency}, have ${available} ${currency}`,
    })
  },

  // Insufficient gas
  insufficientGas: () => {
    toast.error('Insufficient gas', {
      description: 'Add funds to cover transaction fees.',
    })
  },

  // USDC approval
  approvalRequired: (amount: number) => {
    toast.info('Approval required', {
      description: `Approve ${amount.toLocaleString()} USDC to continue.`,
    })
  },

  // USDC approved
  approvalComplete: () => {
    toast.success('USDC approved', {
      description: 'You can now proceed with the deposit.',
    })
  },
}

// General error toasts
export const errorToasts = {
  // Generic error
  generic: (message?: string) => {
    toast.error('Something went wrong', {
      description: message || 'Please try again later.',
    })
  },

  // Network error
  network: () => {
    toast.error('Network error', {
      description: 'Please check your connection and try again.',
    })
  },

  // Validation error
  validation: (field: string, message: string) => {
    toast.error(`Invalid ${field}`, {
      description: message,
    })
  },

  // Permission denied
  permissionDenied: () => {
    toast.error('Permission denied', {
      description: "You don't have access to this action.",
    })
  },

  // Session expired
  sessionExpired: () => {
    toast.error('Session expired', {
      description: 'Please sign in again.',
    })
  },
}

// Clipboard toasts
export const clipboardToasts = {
  copied: (item: string) => {
    toast.success(`${item} copied`, {
      description: 'Copied to clipboard.',
    })
  },
}
