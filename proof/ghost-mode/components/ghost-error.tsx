'use client';

import { motion } from 'framer-motion';
import { simpleFade, buttonPress } from '@bu/ui/animation';
import { AlertTriangle } from 'lucide-react';

interface GhostErrorProps {
  error: string;
  onRetry: () => void;
  onCancel: () => void;
}

export function GhostError({ error, onRetry, onCancel }: GhostErrorProps) {
  return (
    <motion.div {...simpleFade} className="flex flex-col gap-4">
      {/* Icon */}
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full fx-dark-plate flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-red-300 text-center">
        Transaction Failed
      </h3>

      {/* Error message */}
      <p className="text-sm text-white/70 text-center leading-relaxed px-2">
        {error}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <motion.button
          type="button"
          {...buttonPress}
          onClick={onCancel}
          className="flex-1 py-3 rounded-lg fx-dark-plate text-white/70 text-sm font-bold"
        >
          Cancel
        </motion.button>
        <motion.button
          type="button"
          {...buttonPress}
          onClick={onRetry}
          className="flex-1 py-3 rounded-lg fx-glossy text-white text-sm font-bold"
        >
          Try Again
        </motion.button>
      </div>
    </motion.div>
  );
}
