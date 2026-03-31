/**
 * Circle DCW transaction poller.
 *
 * Polls every 3s, 120s timeout. Throws on FAILED/CANCELLED.
 * Same pattern as EarnExecutionService.waitForTransaction.
 */
import type { CircleSdk } from '../signer/index';

export async function waitForTransaction(
  transactionId: string,
  sdk: CircleSdk,
  timeoutMs = 120_000,
): Promise<void> {
  const start = Date.now();
  const pollIntervalMs = 3_000;

  while (Date.now() - start < timeoutMs) {
    const response = await sdk.getTransaction({ id: transactionId });
    const state = response.data?.transaction?.state;

    if (state === 'COMPLETE' || state === 'CONFIRMED') return;
    if (state === 'FAILED' || state === 'CANCELLED') {
      throw new Error(`Transaction ${transactionId} ${state}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `Transaction ${transactionId} confirmation timed out after ${timeoutMs}ms`,
  );
}
