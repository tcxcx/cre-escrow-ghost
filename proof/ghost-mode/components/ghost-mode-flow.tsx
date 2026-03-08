'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { simpleFade } from '@bu/ui/animation';
import { useWallet } from '@/context/WalletContext';
import { computeFilteredBalance, type FilterableWallet } from '@bu/wallets/balance';
import { useCurrencyPreference, useChainPreference } from '@bu/wallets/preferences';
import type { GhostStep, GhostAsset } from './use-ghost-mode';
import type { KycPendingInfo } from './use-ghost-mode';
import { GhostOnboarding } from './ghost-onboarding';
import { GhostAssetSelect } from './ghost-asset-select';
import { GhostAmountInput } from './ghost-amount-input';
import { GhostConfirm } from './ghost-confirm';
import { GhostProcessing } from './ghost-processing';
import { GhostDashboard } from './ghost-dashboard';
import { GhostKycRequired } from './ghost-kyc-required';
import { GhostError } from './ghost-error';
import { GhostKycGate } from './ghost-kyc-gate';
import { GhostSuccess } from './ghost-success';

interface UnwrapClaim {
  ctHash: string;
  requestedAmount: string;
  decryptedAmount: string;
  decrypted: boolean;
  to: string;
  claimed: boolean;
  status: 'pending' | 'decrypting' | 'claimable' | 'claimed';
}

interface GhostModeFlowProps {
  walletType: 'team' | 'individual';
  step: GhostStep;
  amount: string;
  ghostAsset: GhostAsset;
  eUsdcgBalance: number;
  usdcgBalance: number;
  isVerified: boolean;
  onAmountChange: (amount: string) => void;
  onGoToStep: (step: GhostStep) => void;
  onSelectAsset: (asset: GhostAsset) => void;
  onExecuteDeposit: (amount: number) => void;
  onExecuteWithdraw: (amount: number) => void;
  onOnboardingContinue: () => void;
  onKycGateComplete: () => void;
  onExit: () => void;
  error: string | null;
  kycPending: KycPendingInfo | null;
  onRetryAfterKyc: () => void;
  onRetry: () => void;
  fheIndicator?: string;
  pendingClaims?: UnwrapClaim[];
  onClaimWithdrawal?: (ctHash: string) => void;
  isClaimingId?: string | null;
  recentTransactions?: Array<{ id: string; name: string; amount: number; date: string; metadata: { ghost_type?: string } | null }>;
}

export function GhostModeFlow({
  walletType,
  step,
  amount,
  ghostAsset,
  eUsdcgBalance,
  usdcgBalance,
  isVerified,
  onAmountChange,
  onGoToStep,
  onSelectAsset,
  onExecuteDeposit,
  onExecuteWithdraw,
  onOnboardingContinue,
  onKycGateComplete,
  onExit,
  error,
  kycPending,
  onRetryAfterKyc,
  onRetry,
  fheIndicator,
  pendingClaims,
  onClaimWithdrawal,
  isClaimingId,
  recentTransactions,
}: GhostModeFlowProps) {
  const {
    teamWallets,
    individualWallets,
    teamSummary,
    individualSummary,
    getSupportedCurrencies,
  } = useWallet();
  const { currency } = useCurrencyPreference();
  const { chain: chainFilter } = useChainPreference();

  const wallets = walletType === 'team' ? teamWallets : individualWallets;
  const summary = walletType === 'team' ? teamSummary : individualSummary;
  const availableCurrencies = getSupportedCurrencies().map((c) => ({ code: c.code }));

  const mainBalance = computeFilteredBalance(
    wallets as FilterableWallet[],
    summary,
    chainFilter,
    currency,
    availableCurrencies,
  );

  const numericAmount = parseFloat(amount) || 0;

  return (
    <AnimatePresence mode="wait">
      <motion.div key={step} {...simpleFade}>
        {step === 'onboarding' && (
          <GhostOnboarding
            onActivate={onOnboardingContinue}
            verificationType={walletType === 'team' ? 'kyb' : 'kyc'}
            isVerified={isVerified}
          />
        )}

        {step === 'kyc-gate' && (
          <GhostKycGate
            walletType={walletType}
            onComplete={onKycGateComplete}
            onExit={onExit}
          />
        )}

        {step === 'asset-select' && (
          <GhostAssetSelect
            onSelect={(asset) => {
              onSelectAsset(asset);
              onGoToStep('amount');
            }}
            onBack={onExit}
          />
        )}

        {step === 'amount' && (
          <GhostAmountInput
            mode="deposit"
            amount={amount}
            onAmountChange={onAmountChange}
            availableBalance={mainBalance}
            onContinue={() => onGoToStep('confirm')}
            onBack={onExit}
          />
        )}

        {step === 'confirm' && (
          <GhostConfirm
            mode="deposit"
            amount={numericAmount}
            mainWalletBalance={mainBalance}
            ghostBalance={eUsdcgBalance}
            onConfirm={() => onExecuteDeposit(numericAmount)}
            onBack={() => onGoToStep('amount')}
          />
        )}

        {step === 'processing' && <GhostProcessing mode="deposit" ghostAsset={ghostAsset} />}

        {step === 'success' && (
          <GhostSuccess
            mode="deposit"
            amount={numericAmount}
            onSwapToGhost={() => {
              onAmountChange('');
              onGoToStep('amount');
            }}
            onReturn={() => onGoToStep('dashboard')}
            onBackToWallet={onExit}
          />
        )}

        {step === 'dashboard' && (
          <GhostDashboard
            eUsdcgBalance={eUsdcgBalance}
            usdcgBalance={usdcgBalance}
            onDeposit={(asset) => {
              onSelectAsset(asset);
              onAmountChange('');
              onGoToStep('amount');
            }}
            onWithdraw={(asset) => {
              onSelectAsset(asset);
              onAmountChange('');
              onGoToStep('withdraw-amount');
            }}
            onBackToWallet={onExit}
            onShowOnboarding={() => onGoToStep('onboarding')}
            fheIndicator={fheIndicator}
            pendingClaims={pendingClaims}
            onClaimWithdrawal={onClaimWithdrawal}
            isClaimingId={isClaimingId}
            recentTransactions={recentTransactions}
          />
        )}

        {step === 'withdraw-amount' && (
          <GhostAmountInput
            mode="withdraw"
            amount={amount}
            onAmountChange={onAmountChange}
            availableBalance={ghostAsset === 'fhe' ? eUsdcgBalance : usdcgBalance}
            onContinue={() => onGoToStep('withdraw-confirm')}
            onBack={() => onGoToStep('dashboard')}
          />
        )}

        {step === 'withdraw-confirm' && (
          <GhostConfirm
            mode="withdraw"
            amount={numericAmount}
            mainWalletBalance={mainBalance}
            ghostBalance={ghostAsset === 'fhe' ? eUsdcgBalance : usdcgBalance}
            onConfirm={() => onExecuteWithdraw(numericAmount)}
            onBack={() => onGoToStep('withdraw-amount')}
          />
        )}

        {step === 'withdraw-processing' && <GhostProcessing mode="withdraw" ghostAsset={ghostAsset} />}

        {step === 'withdraw-success' && (
          <GhostSuccess
            mode="withdraw"
            amount={numericAmount}
            onSwapToGhost={() => {
              onAmountChange('');
              onGoToStep('amount');
            }}
            onReturn={() => onGoToStep('dashboard')}
            onBackToWallet={onExit}
          />
        )}

        {step === 'kyc-required' && kycPending && (
          <GhostKycRequired
            kycPending={kycPending}
            onComplete={onRetryAfterKyc}
            onExit={onExit}
          />
        )}

        {step === 'error' && (
          <GhostError
            error={error ?? 'An unexpected error occurred'}
            onRetry={onRetry}
            onCancel={onExit}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
