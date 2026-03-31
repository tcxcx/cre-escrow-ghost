'use client';

import Image from 'next/image';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePodsStrategies } from '@/hooks/use-pods-strategies';
import { getProtocolLogoSrc, getProtocolDisplayName, getAssetDisplayName } from '@bu/pods/metadata';

/** Duration each state is visible (ms) */
const CYCLE_INTERVAL = 5000;

export interface BannerState {
  key: string;
  content: React.ReactNode;
}

// ─── Generic animated banner (reusable) ───────────────────────────────

interface AnimatedBannerProps {
  states: BannerState[];
}

export function AnimatedBanner({ states }: AnimatedBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const pauseRef = useRef(false);

  useEffect(() => {
    if (states.length <= 1) return;
    const timer = setInterval(() => {
      if (!pauseRef.current) {
        setActiveIndex((prev) => (prev + 1) % states.length);
      }
    }, CYCLE_INTERVAL);
    return () => clearInterval(timer);
  }, [states.length]);

  const handlePillHover = useCallback((i: number) => {
    pauseRef.current = true;
    setActiveIndex(i);
  }, []);

  const handlePillLeave = useCallback(() => {
    pauseRef.current = false;
  }, []);

  const current = states[activeIndex];

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-purpleDanis bg-gradient-to-r from-purpleDanis to-[#d4bfff] p-4">
      {/* Grid overlay: all slides overlap in the same 1×1 cell.
          During crossfade both old+new exist simultaneously, so the
          grid width = max(all children) — never shrinks between states. */}
      <div className="grid min-h-[80px]" style={{ gridTemplate: '1fr / 1fr' }}>
        <AnimatePresence initial={false}>
          <motion.div
            key={current?.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ gridArea: '1 / 1' }}
            className="flex flex-col justify-center w-full"
          >
            {current?.content}
          </motion.div>
        </AnimatePresence>
      </div>

      {states.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {states.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveIndex(i)}
              onPointerEnter={() => handlePillHover(i)}
              onPointerLeave={handlePillLeave}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? 'w-5 bg-white'
                  : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Show state ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Earn-specific banner (default) ───────────────────────────────────

/**
 * Animated info island at the top of the Opportunities tab.
 * Cycles through 4 states showcasing the earn program.
 * State 1 is the hero card; states 2-4 are compact data highlights.
 */
export function InfoBanner() {
  const { strategies } = usePodsStrategies();

  // Derive data for dynamic states
  const topStrategy = useMemo(() => {
    if (!strategies.length) return null;
    return [...strategies].sort((a, b) => b.apy - a.apy)[0];
  }, [strategies]);

  const networkCount = useMemo(() => {
    if (!strategies.length) return 0;
    return new Set(strategies.map((s) => s.network)).size;
  }, [strategies]);

  const states: BannerState[] = useMemo(() => {
    const result: BannerState[] = [
      // State 1: Hero
      {
        key: 'hero',
        content: (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-sm font-bold leading-snug text-white">
                Your funds are deployed into audited DeFi strategies.
              </p>
              <p className="text-sm font-bold leading-snug text-white">
                Rates may vary based on market conditions.
              </p>
              <a
                href="https://pods.finance"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 pt-1 cursor-pointer"
              >
                <span className="text-[10px] font-medium text-white whitespace-nowrap">Powered by</span>
                <Image
                  src="/assets/deframe-white.png"
                  alt="Deframe"
                  width={160}
                  height={32}
                  className="h-10 w-auto object-contain"
                />
              </a>
            </div>
            <div className="w-1/2 shrink-0 flex items-center justify-end">
              <Image
                src="/assets/bufi-earn.png"
                alt=""
                width={200}
                height={200}
                priority
                loading="eager"
                style={{ width: 'auto', height: 'auto' }}
                className="object-contain"
              />
            </div>
          </div>
        ),
      },
    ];

    // State 2: Top yield spotlight
    if (topStrategy && topStrategy.apy > 0) {
      const topLogo = getProtocolLogoSrc(topStrategy.protocol);
      const topProtocol = getProtocolDisplayName(topStrategy.protocol);
      const topAsset = getAssetDisplayName(topStrategy.asset);
      result.push({
        key: 'top-yield',
        content: (
          <div className="flex items-center gap-4 py-1">
            <div className="flex items-center justify-center size-12 rounded-xl bg-white/20 shrink-0 p-1.5">
              <Image
                src={topLogo ?? '/assets/bufi-logo.png'}
                alt={topProtocol}
                width={36}
                height={36}
                className="rounded-lg object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/70">Highest earning opportunity</p>
              <p className="text-lg font-bold text-white tracking-tight">
                {topStrategy.apy.toFixed(2)}% APY
              </p>
              <p className="text-xs text-white/60">
                Earn on {topAsset} with {topProtocol} — start with as little as $1
              </p>
            </div>
          </div>
        ),
      });
    }

    // State 3: Diversity & choice
    if (strategies.length > 0) {
      const protocolCount = new Set(strategies.map((s) => s.protocol)).size;
      result.push({
        key: 'strategies',
        content: (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/70">Diversify across DeFi</p>
              <p className="text-lg font-bold text-white tracking-tight">
                {strategies.length} strategies, {protocolCount} protocols
              </p>
              <p className="text-xs text-white/60">
                {networkCount} {networkCount === 1 ? 'network' : 'networks'} — pick the yield that fits your risk
              </p>
            </div>
            <div className="shrink-0">
              <Image
                src="/assets/bufi-fly.png"
                alt=""
                width={72}
                height={72}
                className="object-contain"
                style={{ width: 'auto', height: 'auto' }}
              />
            </div>
          </div>
        ),
      });
    }

    // State 4: Trust & security
    result.push({
      key: 'security',
      content: (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/70">100% non-custodial</p>
            <p className="text-lg font-bold text-white tracking-tight">
              Withdraw anytime. No lock-ups.
            </p>
            <p className="text-xs text-white/60">
              Audited smart contracts — your keys, your yield
            </p>
          </div>
          <div className="shrink-0">
            <Image
              src="/assets/cofre.png"
              alt=""
              width={72}
              height={72}
              className="object-contain"
              style={{ width: 'auto', height: 'auto' }}
            />
          </div>
        </div>
      ),
    });

    return result;
  }, [strategies, topStrategy, networkCount]);

  return <AnimatedBanner states={states} />;
}
