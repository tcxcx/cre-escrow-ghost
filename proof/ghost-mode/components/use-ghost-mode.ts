'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useVerifiedCurrencies } from '@/hooks/use-kyc-status';
import {
  ghostBalance,
  ghostDeposit,
  ghostWithdraw,
  ghostFheDeposit,
  ghostFheWithdraw,
  ghostFheBalance,
  ghostFheClaims,
  ghostFheClaim,
  getGhostHistory,
  type GhostFheBalanceResult,
  type GhostTransactionRecord,
} from '@/actions/ghost-mode-actions';
import { executeTransferAPI } from '@/hooks/use-transfer-api';
import { useTeamId } from '@/store/user/store';

export type GhostAsset = 'fhe' | 'private';

export type GhostStep =
  | 'onboarding'
  | 'kyc-gate'
  | 'asset-select'
  | 'amount'
  | 'confirm'
  | 'processing'
  | 'success'
  | 'dashboard'
  | 'withdraw-amount'
  | 'withdraw-confirm'
  | 'withdraw-processing'
  | 'withdraw-success'
  | 'kyc-required'
  | 'error';

export interface KycPendingInfo {
  verificationType: 'kyc' | 'kyb';
  personaInquiryUrl: string;
}

const ONBOARDING_KEY = (walletType: string, userId: string) =>
  `ghost-mode-onboarding-seen-${walletType}-${userId}`;

const GHOST_CHAIN = 'ETH-SEPOLIA';

export function useGhostMode(
  walletType: 'team' | 'individual',
  userId: string,
  primaryWallet?: { circle_wallet_id: string; blockchain: string; wallet_address: string } | null,
) {
  const teamId = useTeamId();
  const onboardingKey = ONBOARDING_KEY(walletType, userId);

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(onboardingKey) === 'true';
  });

  const [isGhostMode, setIsGhostMode] = useState(false);
  const [step, setStep] = useState<GhostStep>('onboarding');
  const [amount, setAmount] = useState('');
  const [ghostAsset, setGhostAsset] = useState<GhostAsset>('fhe');
  const [eUsdcgBalance, setEUsdcgBalance] = useState(0);
  const [usdcgBalance, setUsdcgBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [kycPending, setKycPending] = useState<KycPendingInfo | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // FHE Layer 4 state
  const [fheIndicator, setFheIndicator] = useState<string>('0');
  const [pendingClaims, setPendingClaims] = useState<NonNullable<GhostFheBalanceResult['claims']>>([]);
  const [isClaimingId, setIsClaimingId] = useState<string | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<GhostTransactionRecord[]>([]);

  // Refs for reading current state in callbacks without re-creating them
  const ghostAssetRef = useRef(ghostAsset);
  ghostAssetRef.current = ghostAsset;
  const hasSeenOnboardingRef = useRef(hasSeenOnboarding);
  hasSeenOnboardingRef.current = hasSeenOnboarding;
  const eUsdcgBalanceRef = useRef(eUsdcgBalance);
  eUsdcgBalanceRef.current = eUsdcgBalance;
  const usdcgBalanceRef = useRef(usdcgBalance);
  usdcgBalanceRef.current = usdcgBalance;

  const accountType = walletType === 'team' ? 'team' : 'personal';
  const { hasAnyVerification: isVerified, isLoading: isVerificationLoading } = useVerifiedCurrencies(accountType);

  const isVerifiedRef = useRef(isVerified);
  isVerifiedRef.current = isVerified;

  // Withdraw polling refs (3a: prevent memory leak)
  const withdrawPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const withdrawTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Claim mutex (3b: prevent duplicate claim calls)
  const claimingInProgressRef = useRef<Set<string>>(new Set());

  // Track pending operation for retry
  const pendingModeRef = useRef<'deposit' | 'withdraw' | null>(null);
  const pendingAmountRef = useRef<number>(0);

  const clearWithdrawPolling = useCallback(() => {
    if (withdrawPollRef.current) {
      clearInterval(withdrawPollRef.current);
      withdrawPollRef.current = null;
    }
    if (withdrawTimeoutRef.current) {
      clearTimeout(withdrawTimeoutRef.current);
      withdrawTimeoutRef.current = null;
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    setIsLoadingBalance(true);
    try {
      // Fetch both private-transfer balance and FHE balance in parallel
      const [legacyResult, fheResult] = await Promise.all([
        ghostBalance().catch(() => null),
        ghostFheBalance().catch(() => null),
      ]);

      // USDCg balance (private transfers via ACE/CRE)
      if (legacyResult && 'formattedBalance' in legacyResult && legacyResult.formattedBalance) {
        setUsdcgBalance(parseFloat(legacyResult.formattedBalance) || 0);
      } else if (legacyResult && 'balances' in legacyResult && legacyResult.balances) {
        const total = Object.values(legacyResult.balances).reduce(
          (sum: number, val: string) => sum + (parseFloat(val) || 0),
          0,
        );
        setUsdcgBalance(total);
      }

      // eUSDCg balance (FHE) — indicator + claims
      if (fheResult?.success) {
        setFheIndicator(fheResult.indicator);
        if (fheResult.realBalance) {
          setEUsdcgBalance(parseFloat(fheResult.realBalance) || 0);
        }
        if (fheResult.claims) {
          setPendingClaims(fheResult.claims);
        }
      }

      // Fetch transaction history (non-blocking)
      getGhostHistory().then((res) => {
        if (res.success) setRecentTransactions(res.transactions);
      }).catch(() => {});
    } catch {
      // Silently fail — balance stays at current value
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  const fetchClaims = useCallback(async () => {
    try {
      const result = await ghostFheClaims();
      if (result.success && result.claims) {
        setPendingClaims(result.claims);
      }
    } catch {
      // Silent
    }
  }, []);

  const claimWithdrawal = useCallback(async (ctHash: string) => {
    if (claimingInProgressRef.current.has(ctHash)) return { success: false, error: 'Claim in progress' };
    claimingInProgressRef.current.add(ctHash);
    setIsClaimingId(ctHash);
    try {
      const result = await ghostFheClaim(ctHash);
      if (result.success) {
        // Refresh claims to show updated status
        await fetchClaims();
        await fetchBalance();
      }
      return result;
    } finally {
      claimingInProgressRef.current.delete(ctHash);
      setIsClaimingId(null);
    }
  }, [fetchClaims, fetchBalance]);

  const enterGhostMode = useCallback(() => {
    setIsGhostMode(true);
    setError(null);
    setKycPending(null);
    if (!hasSeenOnboardingRef.current) {
      setStep('onboarding');
    } else if (!isVerifiedRef.current) {
      setStep('kyc-gate');
    } else {
      // If either balance exists, go straight to dashboard; otherwise pick asset
      const hasBalance = eUsdcgBalanceRef.current > 0 || usdcgBalanceRef.current > 0;
      setStep(hasBalance ? 'dashboard' : 'asset-select');
    }
    fetchBalance();
  }, [fetchBalance]);

  const exitGhostMode = useCallback(() => {
    clearWithdrawPolling();
    setIsGhostMode(false);
    setStep('onboarding');
    setAmount('');
    setError(null);
    setKycPending(null);
    pendingModeRef.current = null;
    pendingAmountRef.current = 0;
  }, [clearWithdrawPolling]);

  const markOnboardingSeen = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(onboardingKey, 'true');
    }
    setHasSeenOnboarding(true);
  }, [onboardingKey]);

  const goToStep = useCallback((nextStep: GhostStep) => {
    setStep(nextStep);
  }, []);

  const onOnboardingContinue = useCallback(() => {
    markOnboardingSeen();
    if (!isVerifiedRef.current) {
      setStep('kyc-gate');
    } else {
      setStep('asset-select');
    }
  }, [markOnboardingSeen]);

  const onKycGateComplete = useCallback(() => {
    setKycPending(null);
    setStep('asset-select');
  }, []);

  // Real deposit — routes to FHE or private transfer based on ghostAsset
  const executeDeposit = useCallback(
    async (depositAmount: number) => {
      pendingModeRef.current = 'deposit';
      pendingAmountRef.current = depositAmount;
      setError(null);
      setKycPending(null);
      setStep('processing');

      try {
        // If wallet is not on Sepolia, bridge USDC first
        let didBridge = false;
        if (primaryWallet && primaryWallet.blockchain !== GHOST_CHAIN) {
          console.log('[ghost] bridging USDC from', primaryWallet.blockchain, 'to', GHOST_CHAIN);

          const bridgeResult = await executeTransferAPI({
            to: primaryWallet.wallet_address,
            amount: depositAmount.toFixed(2),
            teamId: teamId ?? '',
            currency: 'USDC',
            wallet: {
              circle_wallet_id: primaryWallet.circle_wallet_id,
              blockchain: primaryWallet.blockchain,
              main_type: walletType === 'individual' ? 'individual' : 'team',
            },
            destinationChain: GHOST_CHAIN,
            description: 'Ghost Mode bridge to Sepolia',
          });

          if (!bridgeResult.success) {
            const msg = `Bridge failed: ${bridgeResult.error ?? 'Unknown error'}`;
            setError(msg);
            setStep('error');
            toast.error(msg);
            return;
          }

          didBridge = true;
          console.log('[ghost] bridge submitted, waiting for CCTP mint on', GHOST_CHAIN);
        }

        // --- Private transfer deposit (USDCg) ---
        if (ghostAssetRef.current === 'private') {
          const result = await ghostDeposit({
            amount: depositAmount.toFixed(2),
            walletChainId: 11155111, // Sepolia
          });
          if (!result.success) {
            const msg = result.error ?? 'Private deposit failed';
            setError(msg);
            setStep('error');
            toast.error(msg);
            return;
          }
          setUsdcgBalance((prev) => prev + depositAmount);
          await fetchBalance();
          setStep('success');
          return;
        }

        // --- FHE deposit (eUSDCg) ---
        const DEPOSIT_MAX_ATTEMPTS = didBridge ? 12 : 1;
        const DEPOSIT_POLL_INTERVAL = 10_000;
        let depositResult: Awaited<ReturnType<typeof ghostFheDeposit>> | null = null;

        for (let attempt = 1; attempt <= DEPOSIT_MAX_ATTEMPTS; attempt++) {
          const result = await ghostFheDeposit({
            amount: depositAmount.toFixed(2),
            walletId: primaryWallet?.circle_wallet_id,
          });

          if (result.success) {
            depositResult = result;
            break;
          }

          const isBalanceError = result.error?.includes('USDC_BALANCE_INSUFFICIENT');
          if (isBalanceError && didBridge && attempt < DEPOSIT_MAX_ATTEMPTS) {
            console.log(`[ghost] USDC not yet arrived, retrying deposit (${attempt}/${DEPOSIT_MAX_ATTEMPTS})...`);
            await new Promise(r => setTimeout(r, DEPOSIT_POLL_INTERVAL));
            continue;
          }

          depositResult = result;
          break;
        }

        if (!depositResult || !depositResult.success) {
          const rawError = depositResult?.error ?? 'Deposit failed';
          const userMessage = rawError.includes('USDC_BALANCE_INSUFFICIENT')
            ? 'Insufficient USDC balance. Please fund your wallet before depositing into Ghost Mode.'
            : rawError;
          setError(userMessage);
          setStep('error');
          toast.error(userMessage);
          return;
        }

        if (depositResult.indicator) {
          setFheIndicator(depositResult.indicator);
        }
        setEUsdcgBalance((prev) => prev + depositAmount);
        await fetchBalance();
        setStep('success');
      } catch (err) {
        const msg = (err as Error).message ?? 'Deposit failed';
        setError(msg);
        setStep('error');
        toast.error(msg);
      }
    },
    [fetchBalance, primaryWallet, teamId, walletType],
  );

  // Real withdraw — routes to FHE (with auto-claim polling) or private transfer
  const executeWithdraw = useCallback(
    async (withdrawAmount: number) => {
      pendingModeRef.current = 'withdraw';
      pendingAmountRef.current = withdrawAmount;
      setError(null);
      setKycPending(null);
      setStep('withdraw-processing');

      try {
        // --- Private transfer withdraw (USDCg) — instant, no FHE claim needed ---
        if (ghostAssetRef.current === 'private') {
          const result = await ghostWithdraw({
            amount: withdrawAmount.toFixed(2),
            walletChainId: 11155111, // Sepolia
          });
          if (!result.success) {
            const msg = result.error ?? 'Private withdrawal failed';
            setError(msg);
            setStep('error');
            toast.error(msg);
            return;
          }
          setUsdcgBalance((prev) => Math.max(0, prev - withdrawAmount));
          await fetchBalance();
          setStep('withdraw-success');
          return;
        }

        // --- FHE withdraw (eUSDCg) — requires FHE decrypt + claim ---
        const result = await ghostFheWithdraw({
          amount: withdrawAmount.toFixed(2),
        });

        if (!result.success) {
          const msg = result.error ?? 'Withdrawal failed';
          setError(msg);
          setStep('error');
          toast.error(msg);
          return;
        }

        const ctHash = result.ctHash;
        if (ctHash) {
          clearWithdrawPolling();

          withdrawPollRef.current = setInterval(async () => {
            try {
              const claimsResult = await ghostFheClaims();
              if (!claimsResult.success) return;
              const claim = claimsResult.claims?.find((c) => c.ctHash === ctHash);
              if (!claim) return;

              if (claim.status === 'claimable') {
                clearWithdrawPolling();
                if (claimingInProgressRef.current.has(ctHash)) return;
                claimingInProgressRef.current.add(ctHash);
                try {
                  const claimResult = await ghostFheClaim(ctHash);
                  if (claimResult.success) {
                    setEUsdcgBalance((prev) => Math.max(0, prev - withdrawAmount));
                    await fetchBalance();
                    setStep('withdraw-success');
                  } else {
                    const msg = claimResult.error ?? 'Claim failed';
                    setError(msg);
                    setStep('error');
                    toast.error(msg);
                  }
                } finally {
                  claimingInProgressRef.current.delete(ctHash);
                }
              } else if (claim.status === 'claimed') {
                clearWithdrawPolling();
                setEUsdcgBalance((prev) => Math.max(0, prev - withdrawAmount));
                await fetchBalance();
                setStep('withdraw-success');
              }
            } catch {
              // Keep polling on transient errors
            }
          }, 5000);

          withdrawTimeoutRef.current = setTimeout(() => {
            clearWithdrawPolling();
          }, 600_000);
        } else {
          setEUsdcgBalance((prev) => Math.max(0, prev - withdrawAmount));
          await fetchBalance();
          setStep('withdraw-success');
        }
      } catch (err) {
        const msg = (err as Error).message ?? 'Withdrawal failed';
        setError(msg);
        setStep('error');
        toast.error(msg);
      }
    },
    [fetchBalance, clearWithdrawPolling],
  );

  // Retry after KYC completion
  const retryAfterKyc = useCallback(() => {
    setKycPending(null);
    const mode = pendingModeRef.current;
    const amt = pendingAmountRef.current;
    if (mode === 'deposit' && amt > 0) {
      executeDeposit(amt);
    } else if (mode === 'withdraw' && amt > 0) {
      executeWithdraw(amt);
    }
  }, [executeDeposit, executeWithdraw]);

  // Retry from error state
  const retry = useCallback(() => {
    setError(null);
    const mode = pendingModeRef.current;
    const amt = pendingAmountRef.current;
    if (mode === 'deposit' && amt > 0) {
      executeDeposit(amt);
    } else if (mode === 'withdraw' && amt > 0) {
      executeWithdraw(amt);
    }
  }, [executeDeposit, executeWithdraw]);

  // Cleanup polling on unmount (3a)
  useEffect(() => {
    return () => {
      clearWithdrawPolling();
    };
  }, [clearWithdrawPolling]);

  return {
    isGhostMode,
    step,
    amount,
    setAmount,
    ghostAsset,
    setGhostAsset,
    eUsdcgBalance,
    usdcgBalance,
    hasSeenOnboarding,
    enterGhostMode,
    exitGhostMode,
    markOnboardingSeen,
    goToStep,
    executeDeposit,
    executeWithdraw,
    error,
    kycPending,
    retryAfterKyc,
    retry,
    isLoadingBalance,
    isVerified,
    isVerificationLoading,
    onOnboardingContinue,
    onKycGateComplete,
    walletType,
    // FHE Layer 4
    fheIndicator,
    pendingClaims,
    isClaimingId,
    claimWithdrawal,
    fetchClaims,
    recentTransactions,
  };
}
