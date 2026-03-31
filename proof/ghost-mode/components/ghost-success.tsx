'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { simpleFade, buttonPress } from '@bu/ui/animation';
import { Shield } from 'lucide-react';

interface GhostSuccessProps {
  mode: 'deposit' | 'withdraw';
  amount: number;
  onSwapToGhost: () => void;
  onReturn: () => void;
  onBackToWallet: () => void;
}

export function GhostSuccess({
  mode,
  amount,
  onSwapToGhost,
  onReturn,
  onBackToWallet,
}: GhostSuccessProps) {
  const isDeposit = mode === 'deposit';

  return (
    <motion.div
      {...simpleFade}
      className="flex flex-col items-center gap-4 relative rounded-[7px] border-[0.3px] border-[#dad4f4] bg-white backdrop-blur-[34.5px] p-4"
    >
      {/* Receipt icon */}
      <div className="w-12 h-12 rounded-lg overflow-hidden">
        <Image
          src="/ghost-mode/ghost-dashboard.png"
          alt="Receipt"
          width={48}
          height={48}
          className="object-cover -scale-y-100 rotate-[158deg]"
        />
      </div>

      {/* Title */}
      <p className="text-sm font-bold text-clip">
        {isDeposit ? 'Funds moved to Ghost' : 'Your receive'}
      </p>

      {/* Amount */}
      <div className="text-center">
        <span className="text-3xl font-bold text-[#cbb0ff]">
          ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
        <span className="text-xs text-[#a598e2] ml-1">USDC</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 w-full">
        <motion.button
          type="button"
          {...buttonPress}
          onClick={onSwapToGhost}
          className="flex-1 py-2.5 rounded-md bg-[#3f2daf] text-white text-sm font-normal fx-ghost-deep backdrop-blur-[24px] hover:brightness-110 transition-all"
        >
          Swap to Ghost
        </motion.button>
        <motion.button
          type="button"
          {...buttonPress}
          onClick={onReturn}
          className="flex-1 py-2.5 rounded-md bg-[#3f2daf] text-white text-sm font-normal fx-ghost-deep backdrop-blur-[24px] hover:brightness-110 transition-all flex items-center justify-center gap-1"
        >
          <span aria-hidden="true">&#x1F47B;</span> Return
        </motion.button>
      </div>

      {/* Active Protection card — light theme */}
      <div className="flex items-center gap-2.5 rounded-lg px-4 py-3 w-full bg-gradient-to-b from-[rgba(119,35,255,0.1)] to-[rgba(72,30,146,0.1)] border-[0.4px] border-white/20 backdrop-blur-[20px]">
        <div className="w-6 h-6 flex items-center justify-center shrink-0">
          <Shield className="w-6 h-6 text-[#6954cf]/60" />
        </div>
        <div>
          <span className="text-sm font-bold text-[#6954cf] block">Active Protection</span>
          <span className="text-xs text-[#a598e2]">
            No history &middot; No tracking &middot; Only you can see this
          </span>
        </div>
      </div>

      {/* Back to wallet CTA */}
      <motion.button
        type="button"
        {...buttonPress}
        onClick={onBackToWallet}
        className="w-full py-3 rounded-md bg-purpleDanis backdrop-blur-sm fx-ghost-cta text-white text-sm font-bold"
      >
        Back to wallet
      </motion.button>
    </motion.div>
  );
}
