'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { simpleFade, buttonPress } from '@bu/ui/animation';
import { ArrowLeft, ArrowRightLeft } from 'lucide-react';

interface GhostConfirmProps {
  mode: 'deposit' | 'withdraw';
  amount: number;
  mainWalletBalance: number;
  ghostBalance: number;
  onConfirm: () => void;
  onBack: () => void;
}

const DEPOSIT_DETAILS = [
  { label: 'Network', value: 'Ethereum Sepolia' },
  { label: 'Privacy', value: 'FHE Encrypted' },
  { label: 'Compliance', value: 'Verified' },
];

const WITHDRAW_DETAILS = [
  { label: 'Network', value: 'Ethereum Sepolia' },
  { label: 'Decrypt time', value: '~30s – 5min' },
  { label: 'Compliance', value: 'Verified' },
];

export function GhostConfirm({
  mode,
  amount,
  mainWalletBalance,
  ghostBalance,
  onConfirm,
  onBack,
}: GhostConfirmProps) {
  const isDeposit = mode === 'deposit';

  // After-transfer balances
  const newMainBalance = Math.max(0, isDeposit ? mainWalletBalance - amount : mainWalletBalance + amount);
  const newGhostBalance = Math.max(0, isDeposit ? ghostBalance + amount : ghostBalance - amount);

  const sourceLabel = isDeposit ? 'Main Wallet' : 'Ghost Mode';
  const sourceBalance = isDeposit ? mainWalletBalance : ghostBalance;
  const destLabel = isDeposit ? 'Ghost Mode' : 'Main Wallet';
  const destBalance = isDeposit ? newGhostBalance : newMainBalance;

  /* Card for Main Wallet (white bg) */
  const MainWalletCard = ({ balance }: { balance: number }) => (
    <div className="flex flex-col items-center rounded-lg px-3 py-3 flex-1 min-w-0 bg-white border-[0.3px] border-[#dad4f4]">
      <Image src="/ghost-mode/ghost-dashboard.png" alt="USDC" width={16} height={16} className="mb-1" />
      <span className="text-xs text-[#11054d]">Main Wallet</span>
      <span className="text-sm font-bold text-[#11054d]">
        {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
      <span className="text-[8px] font-bold text-[#11054d]">USDC</span>
    </div>
  );

  /* Card for Ghost Mode (dark glass) — private encrypted balance */
  const GhostModeCard = ({ balance }: { balance: number }) => (
    <div
      className="flex flex-col items-center rounded-lg px-3 py-3 flex-1 min-w-0 backdrop-blur-[24px] bg-black fx-ghost-glow"
    >
      <Image
        src="/ghost-mode/ghost-processing.svg"
        alt="Ghost"
        width={16}
        height={16}
        className="mb-1 mix-blend-lighten"
      />
      <span className="text-xs text-white">Ghost Mode</span>
      <span className="text-sm font-bold text-white">
        {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
      <span className="text-[8px] font-bold text-white">eUSDCg</span>
    </div>
  );

  return (
    <motion.div {...simpleFade} className="flex flex-col gap-4">
      {/* Back button */}
      <motion.button type="button" {...buttonPress} onClick={onBack} className="self-start" aria-label="Go back">
        <ArrowLeft className="w-4 h-4 text-white/60" />
      </motion.button>

      {/* Title */}
      <p className="text-sm font-bold text-clip text-center">
        You are about to move to {isDeposit ? 'Ghost Mode' : 'Wallet'}
      </p>

      {/* Amount */}
      <div className="text-center py-1">
        <span className="text-3xl font-bold text-[#cbb0ff]">
          ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
        <span className="text-xs text-[#a598e2] ml-1">{isDeposit ? 'USDC' : 'eUSDCg'}</span>
      </div>

      {/* Source -> Destination cards */}
      <div className="flex items-center gap-2 justify-center">
        {isDeposit ? (
          <>
            <MainWalletCard balance={sourceBalance} />
            <ArrowRightLeft className="w-4 h-4 text-white/40 shrink-0" />
            <GhostModeCard balance={destBalance} />
          </>
        ) : (
          <>
            <GhostModeCard balance={sourceBalance} />
            <ArrowRightLeft className="w-4 h-4 text-white/40 shrink-0" />
            <MainWalletCard balance={destBalance} />
          </>
        )}
      </div>

      {/* Pipeline details card */}
      <div className="fx-dark-plate rounded-lg px-4 py-3 w-full">
        {(isDeposit ? DEPOSIT_DETAILS : WITHDRAW_DETAILS).map((detail, i, arr) => (
          <div key={detail.label}>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-white">{detail.label}</span>
              <span className="text-xs text-[#a598e2]">{detail.value}</span>
            </div>
            {i < arr.length - 1 && (
              <div className="border-t-[0.3px] border-white/10" />
            )}
          </div>
        ))}
      </div>

      {/* Confirm CTA */}
      <motion.button
        type="button"
        {...buttonPress}
        onClick={onConfirm}
        className="w-full py-3 rounded-lg fx-glossy text-white text-sm font-bold"
      >
        Confirm
      </motion.button>
    </motion.div>
  );
}
