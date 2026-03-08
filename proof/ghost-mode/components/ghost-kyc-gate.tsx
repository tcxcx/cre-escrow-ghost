'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { simpleFade, buttonPress } from '@bu/ui/animation';
import { BuOverlay } from '@bu/ui/bu-overlay';
import { ShieldCheck, ArrowLeft, Clock, Loader2 } from 'lucide-react';
import { useUser } from '@/context/User';
import { useTeamId } from '@/store/user/store';
import { useKYC } from '@/components/modals/create/hooks/useKYC';
import { useKYB } from '@/components/modals/create/hooks/useKYB';
import { KYCFrame } from '@/components/modals/create/components/KYCFrame';
import { useKYCStatus } from '@/hooks/use-kyc-status';
import type { PersonaInquiryEvent } from '@/lib/persona-client';

interface GhostKycGateProps {
  walletType: 'team' | 'individual';
  onComplete: () => void;
  onExit: () => void;
}

type GateStatus = 'prompt' | 'loading' | 'persona-open' | 'kyb-under-review';

export function GhostKycGate({ walletType, onComplete, onExit }: GhostKycGateProps) {
  const [status, setStatus] = useState<GateStatus>('prompt');
  const isKyb = walletType === 'team';

  const { user, setUser } = useUser();
  const teamId = useTeamId();

  // Persona hooks — only one will be active based on walletType
  const kycHook = useKYC(user, setUser);
  const kybHook = useKYB(user, null, teamId ?? undefined);

  const title = isKyb ? 'Business Verification' : 'Identity Verification';
  const description = isKyb
    ? 'Your business must be verified to use Ghost Mode. This is a one-time process.'
    : 'Your identity must be verified to use Ghost Mode. This is a one-time process.';

  const handleStartVerification = useCallback(async () => {
    setStatus('loading');

    try {
      if (isKyb) {
        const result = await kybHook.initializeKYB();
        if (result.status === 'already_verified') {
          onComplete();
          return;
        }
        if (result.status === 'pending_ubo') {
          setStatus('kyb-under-review');
          return;
        }
        if (result.status === 'error') {
          setStatus('prompt');
          return;
        }
        // 'needs_verification' — Persona frame will open via showKybFrame
        setStatus('persona-open');
      } else {
        await kycHook.initializeKYC({ force: true });
        // Persona frame will open via showKycFrame
        setStatus('persona-open');
      }
    } catch {
      setStatus('prompt');
    }
  }, [isKyb, kycHook, kybHook, onComplete]);

  const { setKYCData, kycData } = useKYCStatus();

  const handlePersonaComplete = useCallback(
    async (result: PersonaInquiryEvent) => {
      setStatus('loading');

      try {
        if (isKyb) {
          const outcome = await kybHook.completeKYB(result);
          if (outcome === 'pending') {
            setStatus('kyb-under-review');
            return;
          }
          if (outcome === 'rejected') {
            setStatus('prompt');
            return;
          }
        } else {
          await kycHook.completeKYC(result);
        }
        // Mark session-level KYC as completed so re-entry doesn't re-prompt
        setKYCData({ ...kycData, hasCompletedAnyKYC: true });
        onComplete();
      } catch {
        // Verification may still have succeeded server-side
        setKYCData({ ...kycData, hasCompletedAnyKYC: true });
        onComplete();
      }
    },
    [isKyb, kycHook, kybHook, onComplete, setKYCData, kycData],
  );

  const handlePersonaCancel = useCallback(() => {
    if (isKyb) {
      kybHook.setShowKybFrame(false);
    } else {
      kycHook.setShowKycFrame(false);
    }
    setStatus('prompt');
  }, [isKyb, kycHook, kybHook]);

  // Persona Frame portal — renders on top of everything
  const showFrame = isKyb ? kybHook.showKybFrame : kycHook.showKycFrame;
  const frameData = isKyb ? kybHook.kybData : kycHook.kycData;

  // Hide wallet dropdown popover while Persona iframe is open
  useEffect(() => {
    if (showFrame && frameData) {
      document.body.classList.add('persona-active');
    } else {
      document.body.classList.remove('persona-active');
    }
    return () => document.body.classList.remove('persona-active');
  }, [showFrame, frameData]);

  const personaPortal =
    showFrame && frameData && typeof document !== 'undefined'
      ? createPortal(
          <>
            <style jsx global>{`
              body.persona-active [data-radix-popper-content-wrapper] {
                visibility: hidden !important;
              }
              .persona-widget, div[data-persona-widget], iframe[src*="withpersona.com"] {
                pointer-events: auto !important;
                z-index: 999999 !important;
              }
            `}</style>
            <BuOverlay className="z-[99998]" onClick={handlePersonaCancel} />
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 pointer-events-none">
              <div className="relative w-full max-w-lg max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl pointer-events-auto bg-white dark:bg-[#0a0a0a]">
                <KYCFrame
                  kycData={frameData}
                  onComplete={handlePersonaComplete}
                  onCancel={handlePersonaCancel}
                />
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  // KYB Under Review — blocking state
  if (status === 'kyb-under-review') {
    return (
      <motion.div {...simpleFade} className="flex flex-col gap-5 items-center py-4">
        {personaPortal}
        <motion.button
          type="button"
          {...buttonPress}
          onClick={onExit}
          className="self-start"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </motion.button>

        <div className="w-20 h-20 rounded-full fx-dark-plate flex items-center justify-center">
          <Clock className="w-10 h-10 text-amber-400" />
        </div>

        <h3 className="text-xl font-bold text-white text-center">
          Business Verification Under Review
        </h3>

        <p className="text-sm text-white/60 text-center leading-relaxed px-2">
          This typically takes 1-3 business days. We&apos;ll notify you when your
          business is approved and Ghost Mode becomes available.
        </p>

        <motion.button
          type="button"
          {...buttonPress}
          onClick={onExit}
          className="w-full py-4 rounded-xl fx-glossy text-white text-base font-bold"
        >
          Close
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div {...simpleFade} className="flex flex-col gap-5 items-center py-4">
      {personaPortal}
      <motion.button
        type="button"
        {...buttonPress}
        onClick={onExit}
        className="self-start"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5 text-white/60" />
      </motion.button>

      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full fx-dark-plate flex items-center justify-center">
          <ShieldCheck className="w-10 h-10 text-[#9b67ff]" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-white text-center">
        {title}
      </h3>

      <p className="text-sm text-white/60 text-center leading-relaxed px-2">
        {description}
      </p>

      <motion.button
        type="button"
        {...buttonPress}
        onClick={handleStartVerification}
        disabled={status === 'loading'}
        className="w-full py-4 rounded-xl fx-glossy text-white text-base font-bold disabled:opacity-60 flex items-center justify-center gap-1.5"
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Initializing...
          </>
        ) : status === 'persona-open' ? (
          'Verification in progress...'
        ) : (
          isKyb ? 'Start Business Verification' : 'Start Identity Verification'
        )}
      </motion.button>
    </motion.div>
  );
}
