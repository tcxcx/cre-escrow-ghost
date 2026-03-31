'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { simpleFade, buttonPress } from '@bu/ui/animation';
import { Shield, Lock, Eye, Clock, CheckCircle2, ArrowDownLeft, ArrowUpRight, Repeat } from 'lucide-react';
import type { GhostAsset } from './use-ghost-mode';

interface UnwrapClaim {
  ctHash: string;
  requestedAmount: string;
  decryptedAmount: string;
  decrypted: boolean;
  to: string;
  claimed: boolean;
  status: 'pending' | 'decrypting' | 'claimable' | 'claimed';
}

interface GhostTransaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  metadata: { ghost_type?: string } | null;
}

interface GhostDashboardProps {
  eUsdcgBalance: number;
  usdcgBalance: number;
  onDeposit: (asset: GhostAsset) => void;
  onWithdraw: (asset: GhostAsset) => void;
  onBackToWallet: () => void;
  onShowOnboarding: () => void;
  fheIndicator?: string;
  pendingClaims?: UnwrapClaim[];
  onClaimWithdrawal?: (ctHash: string) => void;
  isClaimingId?: string | null;
  recentTransactions?: GhostTransaction[];
}

export function GhostDashboard({
  eUsdcgBalance,
  usdcgBalance,
  onDeposit,
  onWithdraw,
  onBackToWallet,
  onShowOnboarding,
  fheIndicator,
  pendingClaims = [],
  onClaimWithdrawal,
  isClaimingId,
  recentTransactions = [],
}: GhostDashboardProps) {
  const activeClaims = pendingClaims.filter((c) => c.status !== 'claimed');
  const totalBalance = eUsdcgBalance + usdcgBalance;

  return (
    <motion.div {...simpleFade} className="flex flex-col items-center gap-3 relative">
      {/* Decorative ghost silhouette bg */}
      <Image
        src="/ghost-mode/ghost-silhouette.svg"
        alt=""
        width={200}
        height={200}
        className="absolute inset-0 w-full h-full object-contain mix-blend-lighten opacity-10 pointer-events-none"
        aria-hidden="true"
      />

      {/* Active Ghost badge */}
      <div className="self-end flex items-center gap-1.5 fx-dark-plate rounded-full px-3 py-1">
        <div className="w-2 h-2 bg-green-400 rounded-full" />
        <span className="text-xs text-white/80">Active Ghost</span>
      </div>

      {/* Total balance */}
      <div className="text-center mb-1">
        <p className="text-[10px] text-white/40 uppercase tracking-wider">Total Ghost Balance</p>
        <span className="text-2xl font-bold text-white">
          ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Dual balance cards */}
      <div className="flex gap-2 w-full">
        {/* eUSDCg — FHE Card */}
        <div className="flex-1 rounded-xl bg-gradient-to-b from-[rgba(119,35,255,0.15)] to-[rgba(72,30,146,0.15)] border-[0.4px] border-white/20 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Lock className="w-3.5 h-3.5 text-[#cbb0ff]" />
            <span className="text-[10px] font-bold text-[#cbb0ff]">eUSDCg</span>
          </div>
          <span className="text-lg font-bold text-white block">
            ${eUsdcgBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-[#a598e2] block mb-2">FHE Encrypted</span>
          <div className="flex gap-1.5">
            <motion.button
              type="button"
              {...buttonPress}
              onClick={() => onDeposit('fhe')}
              className="flex-1 py-1.5 rounded-md text-[10px] font-medium text-[#cbb0ff] fx-dark-plate hover:bg-white/10 transition-colors"
            >
              Deposit
            </motion.button>
            <motion.button
              type="button"
              {...buttonPress}
              onClick={() => onWithdraw('fhe')}
              className="flex-1 py-1.5 rounded-md text-[10px] font-medium text-[#cbb0ff] fx-dark-plate hover:bg-white/10 transition-colors"
            >
              Withdraw
            </motion.button>
          </div>
        </div>

        {/* USDCg — Private Transfers Card */}
        <div className="flex-1 rounded-xl bg-gradient-to-b from-[rgba(51,65,85,0.3)] to-[rgba(30,41,59,0.3)] border-[0.4px] border-white/20 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Eye className="w-3.5 h-3.5 text-[#94a3b8]" />
            <span className="text-[10px] font-bold text-[#94a3b8]">USDCg</span>
          </div>
          <span className="text-lg font-bold text-white block">
            ${usdcgBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-400 block mb-2">Private Ledger</span>
          <div className="flex gap-1.5">
            <motion.button
              type="button"
              {...buttonPress}
              onClick={() => onDeposit('private')}
              className="flex-1 py-1.5 rounded-md text-[10px] font-medium text-[#94a3b8] fx-dark-plate hover:bg-white/10 transition-colors"
            >
              Deposit
            </motion.button>
            <motion.button
              type="button"
              {...buttonPress}
              onClick={() => onWithdraw('private')}
              className="flex-1 py-1.5 rounded-md text-[10px] font-medium text-[#94a3b8] fx-dark-plate hover:bg-white/10 transition-colors"
            >
              Withdraw
            </motion.button>
          </div>
        </div>
      </div>

      {/* FHE Encryption Status */}
      {fheIndicator && (
        <div className="flex items-center gap-2.5 fx-dark-plate rounded-lg px-4 py-2.5 w-full">
          <Lock className="w-5 h-5 text-[#cbb0ff] shrink-0" />
          <div className="flex-1">
            <span className="text-xs font-bold text-white block">FHE Encrypted</span>
            <span className="text-[10px] text-[#a598e2]">Balance invisible on-chain</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#a598e2] block">Indicator</span>
            <span className="text-xs font-mono text-[#cbb0ff]">0.{fheIndicator.padStart(4, '0')}</span>
          </div>
        </div>
      )}

      {/* Active Protection card */}
      <div className="flex items-center gap-2.5 fx-dark-plate rounded-lg px-4 py-2.5 w-full">
        <Shield className="w-5 h-5 text-white/60 shrink-0" />
        <div>
          <span className="text-xs font-bold text-white block">Active Protection</span>
          <span className="text-[10px] text-[#a598e2]">
            No history &middot; No tracking &middot; Only you can see this
          </span>
        </div>
      </div>

      {/* Pending Claims (FHE only) */}
      {activeClaims.length > 0 && (
        <div className="w-full space-y-2">
          <span className="text-xs text-[#a598e2] font-medium">Pending Withdrawals (FHE)</span>
          {activeClaims.map((claim) => (
            <div key={claim.ctHash} className="flex items-center gap-2 fx-dark-plate rounded-lg px-3 py-2">
              {claim.status === 'claimable' ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-[#cbb0ff] shrink-0 animate-pulse" />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-xs text-white block">${parseFloat(claim.requestedAmount).toFixed(2)}</span>
                <span className="text-[10px] text-[#a598e2]">
                  {claim.status === 'pending' && 'Waiting for decrypt...'}
                  {claim.status === 'decrypting' && 'Decrypting...'}
                  {claim.status === 'claimable' && 'Ready to claim'}
                </span>
              </div>
              {claim.status === 'claimable' && onClaimWithdrawal && (
                <button
                  type="button"
                  onClick={() => onClaimWithdrawal(claim.ctHash)}
                  disabled={isClaimingId === claim.ctHash}
                  className="text-xs text-[#cbb0ff] font-medium hover:text-white transition-colors disabled:opacity-50"
                >
                  {isClaimingId === claim.ctHash ? 'Claiming...' : 'Claim'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      {recentTransactions.length > 0 && (
        <div className="w-full space-y-1.5">
          <span className="text-xs text-[#a598e2] font-medium">Recent Activity</span>
          {recentTransactions.slice(0, 5).map((tx) => {
            const ghostType = tx.metadata?.ghost_type || 'ghost_deposit';
            const isPrivate = ghostType.startsWith('private_');
            const isIn = ghostType === 'ghost_claim' || ghostType === 'ghost_deposit' || ghostType === 'private_deposit';
            const Icon = ghostType.includes('transfer') ? Repeat : isIn ? ArrowDownLeft : ArrowUpRight;
            return (
              <div key={tx.id} className="flex items-center gap-2 fx-dark-plate rounded-lg px-3 py-2">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isIn ? 'text-green-400' : 'text-[#cbb0ff]'}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-white block truncate">{tx.name}</span>
                  <span className="text-[10px] text-[#a598e2]">
                    {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {isPrivate ? ' · USDCg' : ' · eUSDCg'}
                  </span>
                </div>
                <span className={`text-xs font-medium ${isIn ? 'text-green-400' : 'text-white'}`}>
                  {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Back to wallet CTA */}
      <motion.button
        type="button"
        {...buttonPress}
        onClick={onBackToWallet}
        className="w-full py-3 rounded-lg fx-glossy text-white text-sm font-bold"
      >
        Back to wallet
      </motion.button>

      {/* What is Ghost Mode? link */}
      <button
        type="button"
        onClick={onShowOnboarding}
        className="w-full text-center text-xs text-white/40 underline underline-offset-2 hover:text-white/70 transition-colors mt-1 cursor-pointer"
      >
        What is Ghost Mode?
      </button>
    </motion.div>
  );
}
