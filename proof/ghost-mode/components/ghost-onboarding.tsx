'use client';

import { motion } from 'framer-motion';
import { simpleFade, buttonPress } from '@bu/ui/animation';

interface GhostOnboardingProps {
  onActivate: () => void;
  /** 'kyc' for personal wallets, 'kyb' for team wallets */
  verificationType: 'kyc' | 'kyb';
  /** Whether user has already passed verification */
  isVerified: boolean;
}

const features = [
  {
    image: '/ghost-mode/ghost-privacy.png',
    title: 'Full privacy',
    description: 'Your public wallet never reflects ghost transactions',
  },
  {
    image: '/ghost-mode/ghost-swap.png',
    title: 'Instant swap',
    description: 'USDC \u2192 to private balance, like a ghost',
  },
  {
    image: '/ghost-mode/ghost-multichain.png',
    title: 'Multi-chain',
    description: 'Deposit from any chain - settled on TEEs',
  },
  {
    image: '/ghost-mode/ghost-notrace.png',
    title: 'No trace',
    description: 'Zero sensitive data exposed on-chain',
  },
];

export function GhostOnboarding({ onActivate, verificationType, isVerified }: GhostOnboardingProps) {
  return (
    <motion.div {...simpleFade} className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        {/* Ghost mascot card — glass plate with ghost subtract */}
        <div className="w-11 h-11 rounded-xl fx-dark-plate flex items-center justify-center shrink-0 overflow-hidden relative">
          <div className="mix-blend-lighten -rotate-[27.11deg]">
            <img
              src="/assets/button/subtract.png"
              alt="Ghost mascot"
              className="w-7 h-7 object-contain"
            />
          </div>
        </div>
        <div>
          <h3
            className="text-lg font-bold text-clip leading-tight"
          >
            Ghost Mode
          </h3>
          <p
            className="text-white/60 text-xs font-normal leading-snug mt-1"
          >
            An invisible wallet within your wallet. No history.
            No tracking. Only you.
          </p>
        </div>
      </div>

      {/* Feature cards */}
      <div className="flex flex-col gap-2">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="flex items-center rounded-lg overflow-hidden w-full h-12 bg-gradient-to-b from-[rgba(119,35,255,0.1)] to-[rgba(72,30,146,0.1)] border-[0.4px] border-white/20 backdrop-blur-[20px] pl-2 pr-3"
          >
            <img
              src={feature.image}
              alt={feature.title}
              className="rounded-md object-cover shrink-0 w-8 h-8"
            />
            <div className="min-w-0 ml-3">
              <span
                className="font-bold text-white block leading-tight text-sm"
              >
                {feature.title}
              </span>
              <span
                className="text-white/70 font-normal block leading-tight text-xs"
              >
                {feature.description}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <motion.button
        type="button"
        {...buttonPress}
        onClick={onActivate}
        className="w-full rounded-md text-white font-bold mt-1 relative overflow-hidden text-sm py-3 bg-purpleDanis backdrop-blur-sm fx-ghost-cta"
      >
        {isVerified
          ? 'Activate Ghost Mode'
          : verificationType === 'kyb'
            ? 'Complete Business Verification'
            : 'Complete Identity Verification'}
      </motion.button>
    </motion.div>
  );
}
