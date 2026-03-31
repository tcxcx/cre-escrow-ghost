'use client';

import { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { simpleFade, buttonPress } from '@bu/ui/animation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@bu/ui/cn';
import { CurrencyIcon } from '@bu/ui/currency-icon';
import { InputMoney } from '@bu/ui/input-money';

interface GhostAmountInputProps {
  mode: 'deposit' | 'withdraw';
  amount: string;
  onAmountChange: (amount: string) => void;
  availableBalance: number;
  onContinue: () => void;
  onBack: () => void;
}

const PERCENTAGE_PILLS = [25, 50, 75, 100] as const;


export function GhostAmountInput({
  mode,
  amount,
  onAmountChange,
  availableBalance,
  onContinue,
  onBack,
}: GhostAmountInputProps) {
  const numericAmount = parseFloat(amount) || 0;
  const isValid = numericAmount > 0 && numericAmount <= availableBalance;
  const hasFilled = numericAmount > 0;

  const remainingBalance = useMemo(
    () => Math.max(0, availableBalance - numericAmount),
    [availableBalance, numericAmount],
  );

  const handlePercentage = useCallback(
    (pct: number) => {
      const value = ((availableBalance * pct) / 100).toFixed(2);
      onAmountChange(value);
    },
    [availableBalance, onAmountChange],
  );

  const isDeposit = mode === 'deposit';

  return (
    <motion.div {...simpleFade} className="flex flex-col gap-4">
      {/* Header — deposit vs withdraw have different layouts per Figma */}
      {isDeposit ? (
        <>
          <div className="flex items-center gap-3">
            <motion.button type="button" {...buttonPress} onClick={onBack} aria-label="Go back">
              <ArrowLeft className="w-4 h-4 text-white/60" />
            </motion.button>
            <div className="flex items-center gap-2">
              <div className="w-11 h-11 rounded-xl fx-dark-plate flex items-center justify-center shrink-0 backdrop-blur-[20px]">
                <img
                  src="/ghost-mode/ghost-silhouette.svg"
                  alt="Ghost mascot"
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div>
                <h3 className="font-bold text-clip leading-tight text-base">
                  Ghost Mode
                </h3>
                <p className="text-white leading-snug text-xs">
                  Move funds into your private wallet. Invisible. Secure. Only you can see it.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white text-sm">
              Available Balance
            </span>
            <div
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 ml-auto backdrop-blur-[24px] bg-white/[0.08] fx-ghost-glow"
            >
              <CurrencyIcon code="USDC" size="xs" />
              <span className="text-white/80 text-xs">USDC</span>
              <span className="font-bold text-white text-sm">
                {availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <motion.button type="button" {...buttonPress} onClick={onBack} aria-label="Go back">
              <ArrowLeft className="w-4 h-4 text-white/60" />
            </motion.button>
            <span className="text-xs text-[#a598e2] fx-ghost-glow rounded-full px-2.5 py-1">
              Ghost Mode
            </span>
          </div>
          <h3 className="font-bold text-white leading-tight text-xl">
            Swap to Wallet
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Available</span>
            <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 backdrop-blur-[24px] bg-white/[0.08] fx-ghost-glow">
              <CurrencyIcon code="USDC" size="xs" />
              <span className="font-bold text-white text-sm">
                {availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Question */}
      <p className="text-[#705cd1] text-center text-sm">
        How much do you want to move?
      </p>

      {/* Amount display */}
      <div className="text-center py-2">
        <div className="flex items-baseline justify-center gap-1">
          <span
            className={`font-bold transition-all duration-200 ease-in-out shrink-0 ${hasFilled ? 'text-3xl text-[#cbb0ff]' : 'text-4xl text-[#2b149b]'}`}
          >
            $
          </span>
          <InputMoney
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            fixedFractionDigits={2}
            locale="en-US"
            inputMode="decimal"
            autoFocus
            aria-label="Enter amount"
            className={cn(
              'min-w-0 font-bold transition-all duration-200 ease-in-out [&_input]:!text-4xl [&_input]:!text-center',
              hasFilled ? 'text-[#cbb0ff]' : 'text-[#2b149b]',
            )}
          />
          <span
            className={`text-xs transition-colors duration-200 ease-in-out shrink-0 ${hasFilled ? 'text-[#a598e2]' : 'text-[#2b149b]'}`}
          >
            {isDeposit ? 'USDC' : 'eUSDCg'}
          </span>
        </div>
      </div>

      {/* Percentage pills */}
      <div className="flex gap-2 justify-center">
        {PERCENTAGE_PILLS.map((pct) => (
          <motion.button
            key={pct}
            type="button"
            {...buttonPress}
            onClick={() => handlePercentage(pct)}
            className={`flex-1 rounded-md text-white backdrop-blur-[24px] hover:brightness-110 transition-all h-8 text-sm bg-white/[0.08] fx-ghost-glow`}
          >
            {pct}%
          </motion.button>
        ))}
      </div>

      {/* Preview card — visible when amount > 0 */}
      <AnimatePresence>
        {hasFilled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="fx-dark-plate rounded-lg px-4 py-3 flex flex-col gap-2"
            >
              {/* Row 1 — source remainder */}
              <div className="flex items-center gap-2">
                <span className="text-white shrink-0 text-xs">
                  {isDeposit ? 'Wallet will have' : 'Ghost will have'}
                </span>
                <div className="flex-1 border-b border-white/10" />
                <span className="text-white shrink-0 text-xs">
                  {remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} {isDeposit ? 'USDC' : 'eUSDCg'}
                </span>
              </div>
              {/* Row 2 — destination receives */}
              <div className="flex items-center gap-2">
                <span className="text-white shrink-0 text-xs">
                  {isDeposit ? 'You will receive' : 'You will receive'}
                </span>
                {isDeposit && (
                  <img
                    src="/ghost-mode/ghost-silhouette.svg"
                    alt=""
                    className="w-3.5 h-3.5 object-contain opacity-60"
                  />
                )}
                <div className="flex-1" />
                <span className="text-[#a598e2] shrink-0 text-xs">
                  {numericAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} {isDeposit ? 'eUSDCg' : 'USDC'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue CTA */}
      <motion.button
        type="button"
        {...buttonPress}
        onClick={onContinue}
        disabled={!isValid}
        className="w-full py-3 rounded-lg fx-glossy text-white text-sm font-bold mt-1 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue
      </motion.button>
    </motion.div>
  );
}
