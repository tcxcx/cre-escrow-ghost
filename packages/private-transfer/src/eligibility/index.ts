/**
 * Private transfer eligibility checker.
 *
 * Determines if a sender can send privately to a recipient:
 *  - Sender must have Ghost Mode active (USDCg balance > 0)
 *  - Sender must have sufficient USDCg for the amount
 *  - Recipient must be on Bu platform
 *  - Team wallets require KYB, personal wallets require KYC
 */

export interface PrivateEligibility {
  eligible: boolean;
  reason?: EligibilityReason;
  senderGhostBalance?: string;
  recipientOnPlatform?: boolean;
  recipientVerified?: boolean;
  recipientWalletType?: 'team' | 'personal';
}

export type EligibilityReason =
  | 'eligible'
  | 'recipient_not_on_platform'
  | 'recipient_kyb_pending'
  | 'recipient_kyc_pending'
  | 'sender_not_activated'
  | 'insufficient_ghost_balance';

export interface EligibilityParams {
  senderUsdcgBalance: string;
  recipientOnPlatform: boolean;
  recipientWalletType: 'team' | 'personal';
  recipientKycStatus: string | null;
  recipientKybStatus: string | null;
  amount: string;
}

export function checkPrivateEligibility(params: EligibilityParams): PrivateEligibility {
  const {
    senderUsdcgBalance,
    recipientOnPlatform,
    recipientWalletType,
    recipientKycStatus,
    recipientKybStatus,
    amount,
  } = params;

  const balance = parseFloat(senderUsdcgBalance) || 0;
  const requested = parseFloat(amount) || 0;

  if (balance <= 0) {
    return { eligible: false, reason: 'sender_not_activated', senderGhostBalance: senderUsdcgBalance };
  }

  if (!recipientOnPlatform) {
    return { eligible: false, reason: 'recipient_not_on_platform', recipientOnPlatform: false };
  }

  if (recipientWalletType === 'team') {
    if (recipientKybStatus !== 'approved') {
      return {
        eligible: false,
        reason: 'recipient_kyb_pending',
        recipientOnPlatform: true,
        recipientVerified: false,
        recipientWalletType: 'team',
      };
    }
  } else {
    if (recipientKycStatus !== 'approved') {
      return {
        eligible: false,
        reason: 'recipient_kyc_pending',
        recipientOnPlatform: true,
        recipientVerified: false,
        recipientWalletType: 'personal',
      };
    }
  }

  if (balance < requested) {
    return {
      eligible: false,
      reason: 'insufficient_ghost_balance',
      senderGhostBalance: senderUsdcgBalance,
      recipientOnPlatform: true,
      recipientVerified: true,
      recipientWalletType,
    };
  }

  return {
    eligible: true,
    reason: 'eligible',
    senderGhostBalance: senderUsdcgBalance,
    recipientOnPlatform: true,
    recipientVerified: true,
    recipientWalletType,
  };
}
