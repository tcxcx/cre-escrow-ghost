'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { simpleFade } from '@bu/ui/animation';
import { useState, useEffect } from 'react';

interface GhostProcessingProps {
  mode: 'deposit' | 'withdraw';
  ghostAsset?: 'fhe' | 'private';
}

const FHE_DEPOSIT_PHASES = [
  'Verifying compliance...',
  'Securing your funds...',
  'Encrypting your balance...',
];

const FHE_WITHDRAW_PHASES = [
  'Decrypting your balance...',
  'Processing withdrawal...',
  'Returning funds to wallet...',
];

const PRIVATE_DEPOSIT_PHASES = [
  'Verifying compliance...',
  'Securing your funds...',
  'Shielding your balance...',
];

const PRIVATE_WITHDRAW_PHASES = [
  'Verifying compliance...',
  'Processing withdrawal...',
  'Returning funds to wallet...',
];

export function GhostProcessing({ mode, ghostAsset = 'fhe' }: GhostProcessingProps) {
  const isFhe = ghostAsset === 'fhe';
  const title = mode === 'deposit'
    ? (isFhe ? 'Encrypting and moving funds' : 'Shielding your funds')
    : (isFhe ? 'Decrypting and moving funds' : 'Returning your funds');
  const phases = mode === 'deposit'
    ? (isFhe ? FHE_DEPOSIT_PHASES : PRIVATE_DEPOSIT_PHASES)
    : (isFhe ? FHE_WITHDRAW_PHASES : PRIVATE_WITHDRAW_PHASES);

  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    setPhaseIndex(0);
    const interval = setInterval(() => {
      setPhaseIndex((prev) => Math.min(prev + 1, phases.length - 1));
    }, mode === 'deposit' ? 3000 : 5000);
    return () => clearInterval(interval);
  }, [mode, phases.length]);

  return (
    <motion.div {...simpleFade} className="flex flex-col items-center justify-center pt-10 pb-0 gap-5 relative overflow-hidden min-h-0 -mb-4">
      {/* Title — Figma gradient: rgb(105,84,207) → rgb(196,161,255) → rgb(12,146,255) */}
      <p
        className="text-base font-normal text-center bg-clip-text text-transparent shrink-0"
        style={{
          backgroundImage: 'linear-gradient(90deg, rgb(105, 84, 207) 0%, rgb(196, 161, 255) 50%, rgb(12, 146, 255) 100%)',
        }}
      >
        {title}
      </p>
      <AnimatePresence mode="wait">
        <motion.p
          key={phaseIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="text-xs text-[#a598e2] text-center -mt-3 shrink-0"
        >
          {phases[phaseIndex]}
        </motion.p>
      </AnimatePresence>

      {/* Ghost circle with spinner — animate-spin like Spinner */}
      <div className="flex items-center justify-center w-[224px] h-[224px] shrink-0">
        <Image
          src="/ghost-mode/ghost-processing.svg"
          alt="Processing"
          width={224}
          height={224}
          className="object-contain mix-blend-lighten"
        />
      </div>

      {/* Phase progress dots */}
      <div className="flex gap-2 shrink-0">
        {phases.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              i <= phaseIndex ? 'bg-[#6954cf]' : 'bg-[#6954cf]/20'
            }`}
          />
        ))}
      </div>

      {/* Decorative ghost silhouette — flush at bottom, no gap, only top half visible (Figma) */}
      <Image
        src="/ghost-mode/ghost-silhouette.svg"
        alt=""
        width={135}
        height={159}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[135px] h-[159px] object-contain object-top mix-blend-lighten opacity-10 pointer-events-none"
        aria-hidden="true"
      />
    </motion.div>
  );
}
