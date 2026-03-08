'use client';

import { motion } from 'framer-motion';
import { buttonPress } from '@bu/ui/animation';
import { Button } from '@bu/ui/button';

interface GhostBannerProps {
  onActivate: () => void;
  onLearnMore?: () => void;
}

export function GhostBanner({ onActivate, onLearnMore }: GhostBannerProps) {
  return (
    <div className="flex flex-col items-center gap-2 mt-3">
      {/* Main CTA button */}
      <motion.button
        type="button"
        {...buttonPress}
        onClick={onActivate}
        className="group relative w-full h-[80px] rounded-[7px] overflow-hidden cursor-pointer border-[0.3px] border-[#dad4f4] p-0 fx-ghost-scene"
      >
        {/* Subtract (main ghost with eyes) — upright, overlapping left edge */}
        <img
          src="/assets/button/subtract.png"
          alt=""
          aria-hidden="true"
          className="absolute pointer-events-none transition-transform duration-500 ease-out group-hover:-translate-x-0.5 group-hover:scale-105 left-1 top-1/2 -translate-y-1/2 w-[72px] h-[72px] object-contain"
          draggable={false}
        />

        {/* Text content — positioned to the right of the ghost */}
        <div className="relative z-10 flex flex-col justify-center h-full pl-[90px] pr-4">
          <span className="text-white font-bold text-sm leading-tight tracking-tight">
            Activate Ghost Mode
          </span>
          <span className="text-white/50 text-[11px] leading-tight mt-0.5">
            Full privacy | No tracking
          </span>
        </div>
      </motion.button>

      {/* "What is Ghost Mode?" link */}
      {onLearnMore && (
        <Button variant="underlink" size="noPadding" onClick={onLearnMore}>
          What is Ghost Mode?
        </Button>
      )}
    </div>
  );
}
