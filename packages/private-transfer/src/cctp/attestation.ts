/**
 * CCTP Attestation Poller
 *
 * Polls Circle's Iris API for CCTP message attestations.
 * After depositForBurn() on source, fetch attestation before receiveMessage() on dest.
 * Typical wait: 3-15 minutes. Timeout: 20 minutes.
 */

import { createLogger } from '@bu/logger';
import { fetchJson } from '@bu/http-client';

const logger = createLogger({ prefix: 'private-transfer:cctp' });

const IRIS_API_URL = 'https://iris-api-sandbox.circle.com';
const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_TIME_MS = 20 * 60 * 1000;

export interface CctpAttestation {
  message: string;
  attestation: string;
}

export async function waitForCctpAttestation(
  messageHash: string,
): Promise<CctpAttestation> {
  const startTime = Date.now();
  logger.info('Polling for CCTP attestation', { messageHash });

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    try {
      const response = await fetchJson<{
        status: string;
        attestation: string;
        message: string;
      }>(`${IRIS_API_URL}/attestations/${messageHash}`);

      const { data } = response;
      if (data.status === 'complete' && data.attestation !== 'PENDING') {
        logger.info('CCTP attestation received', {
          messageHash,
          elapsed: `${Math.round((Date.now() - startTime) / 1000)}s`,
        });
        return { message: data.message, attestation: data.attestation };
      }
      logger.debug('CCTP attestation pending', { messageHash });
    } catch (error) {
      logger.warn('CCTP attestation poll error (will retry)', {
        messageHash,
        error: (error as Error).message,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`CCTP attestation timeout after ${MAX_POLL_TIME_MS / 60000} minutes: ${messageHash}`);
}
