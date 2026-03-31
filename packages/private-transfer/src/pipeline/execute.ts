/**
 * Step executor — runs a sequence of named steps, collecting receipts.
 *
 * Each step returns a StepReceipt on success. If a step throws,
 * execution halts and the error is captured with full context:
 * which step failed, what completed, and the error message.
 *
 * This is the pattern Circle Mint uses: every state transition is
 * logged, and failures include the operation trace for debugging.
 */
import { createLogger } from '@bu/logger';

const logger = createLogger({ prefix: 'private-transfer:pipeline' });

/** Receipt from a single step — proof of what happened */
export interface StepReceipt {
  step: string;
  txId?: string;
  timestamp: number;
  detail?: string;
}

/** Full operation trace returned to the caller */
export interface OperationTrace {
  receipts: StepReceipt[];
  failedStep?: string;
  error?: string;
}

/** A named step function that operates on a mutable context */
export interface Step<TCtx> {
  name: string;
  execute: (ctx: TCtx) => Promise<StepReceipt>;
}

/**
 * Execute a sequence of steps, collecting receipts.
 *
 * Returns the trace (all receipts + error info if failed).
 * The caller checks ctx for computed values (balance, txIds, etc).
 */
export async function executeSteps<TCtx>(
  steps: Step<TCtx>[],
  ctx: TCtx,
): Promise<OperationTrace> {
  const receipts: StepReceipt[] = [];

  for (const step of steps) {
    logger.info(`Step: ${step.name}`);

    try {
      const receipt = await step.execute(ctx);
      receipts.push(receipt);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Step failed: ${step.name}`, { error: message });

      return {
        receipts,
        failedStep: step.name,
        error: message,
      };
    }
  }

  return { receipts };
}

/** Helper to build a receipt */
export function receipt(step: string, txId?: string, detail?: string): StepReceipt {
  return { step, txId, timestamp: Math.floor(Date.now() / 1000), detail };
}
