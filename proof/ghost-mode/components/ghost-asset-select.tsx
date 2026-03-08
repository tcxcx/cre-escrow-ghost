'use client';

import { motion } from 'framer-motion';
import { simpleFade, buttonPress } from '@bu/ui/animation';
import { Lock, Eye } from 'lucide-react';
import type { GhostAsset } from './use-ghost-mode';

interface GhostAssetSelectProps {
  onSelect: (asset: GhostAsset) => void;
  onBack: () => void;
}

const assets: Array<{
  id: GhostAsset;
  label: string;
  ticker: string;
  description: string;
  icon: typeof Lock;
  accentColor: string;
  bgGradient: string;
}> = [
  {
    id: 'fhe',
    label: 'FHE Encrypted',
    ticker: 'eUSDCg',
    description: 'Encrypted on-chain via CoFHE. Balances hidden with fully homomorphic encryption.',
    icon: Lock,
    accentColor: '#cbb0ff',
    bgGradient: 'from-[rgba(119,35,255,0.15)] to-[rgba(72,30,146,0.15)]',
  },
  {
    id: 'private',
    label: 'Private Transfers',
    ticker: 'USDCg',
    description: 'Off-chain private ledger via CRE. Zero on-chain trace for transfers.',
    icon: Eye,
    accentColor: '#94a3b8',
    bgGradient: 'from-[rgba(51,65,85,0.3)] to-[rgba(30,41,59,0.3)]',
  },
];

export function GhostAssetSelect({ onSelect, onBack }: GhostAssetSelectProps) {
  return (
    <motion.div {...simpleFade} className="flex flex-col gap-4">
      {/* Header */}
      <div className="mb-1">
        <h3 className="text-lg font-bold text-clip leading-tight">Choose Privacy Method</h3>
        <p className="text-white/60 text-xs font-normal leading-snug mt-1">
          Both methods are CRE-compliant. Pick how you want your funds protected.
        </p>
      </div>

      {/* Asset cards */}
      <div className="flex flex-col gap-3">
        {assets.map((asset) => {
          const Icon = asset.icon;
          return (
            <motion.button
              key={asset.id}
              type="button"
              {...buttonPress}
              onClick={() => onSelect(asset.id)}
              className={`flex items-start gap-3 rounded-xl w-full p-4 bg-gradient-to-b ${asset.bgGradient} border-[0.4px] border-white/20 backdrop-blur-[20px] text-left hover:border-white/40 transition-colors`}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${asset.accentColor}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: asset.accentColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{asset.label}</span>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{ color: asset.accentColor, backgroundColor: `${asset.accentColor}15` }}
                  >
                    {asset.ticker}
                  </span>
                </div>
                <span className="text-xs text-white/60 mt-1 block leading-relaxed">
                  {asset.description}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Back */}
      <motion.button
        type="button"
        {...buttonPress}
        onClick={onBack}
        className="w-full text-center text-xs text-white/40 underline underline-offset-2 hover:text-white/70 transition-colors mt-1 cursor-pointer"
      >
        Back to wallet
      </motion.button>
    </motion.div>
  );
}
