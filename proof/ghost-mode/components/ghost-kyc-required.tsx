'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { simpleFade, buttonPress } from '@bu/ui/animation';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import type { KycPendingInfo } from './use-ghost-mode';

interface GhostKycRequiredProps {
  kycPending: KycPendingInfo;
  onComplete: () => void;
  onExit: () => void;
}

export function GhostKycRequired({ kycPending, onComplete, onExit }: GhostKycRequiredProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const isKyb = kycPending.verificationType === 'kyb';

  const title = isKyb ? 'Business Verification Required' : 'Identity Verification Required';
  const description = isKyb
    ? 'Your business must be verified before using Ghost Mode. Complete the verification process to continue.'
    : 'Your identity must be verified before using Ghost Mode. Complete the verification process to continue.';

  const handleStartVerification = () => {
    setHasStarted(true);
    window.open(kycPending.personaInquiryUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div {...simpleFade} className="flex flex-col gap-5 items-center py-4">
      {/* Back button */}
      <motion.button type="button" {...buttonPress} onClick={onExit} className="self-start" aria-label="Go back">
        <ArrowLeft className="w-5 h-5 text-white/60" />
      </motion.button>

      {/* Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full fx-dark-plate flex items-center justify-center">
          <ShieldAlert className="w-10 h-10 text-amber-400" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-white text-center">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-white/60 text-center leading-relaxed px-2">
        {description}
      </p>

      {/* Actions */}
      {!hasStarted ? (
        <motion.button
          type="button"
          {...buttonPress}
          onClick={handleStartVerification}
          className="w-full py-4 rounded-xl fx-glossy text-white text-base font-bold"
        >
          Complete Verification
        </motion.button>
      ) : (
        <motion.button
          type="button"
          {...buttonPress}
          onClick={onComplete}
          className="w-full py-4 rounded-xl fx-glossy text-white text-base font-bold"
        >
          I&apos;ve Completed Verification
        </motion.button>
      )}
    </motion.div>
  );
}
