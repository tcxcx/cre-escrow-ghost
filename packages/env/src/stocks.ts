import { resolve, isDev } from './core';

export function getMassiveApiKey(override?: string): string | undefined {
  return resolve('MASSIVE_API_KEY', override);
}

/** Stock intelligence is dev-only: requires dev mode AND Massive API key */
export function isStockIntelEnabled(): boolean {
  return isDev() && !!getMassiveApiKey();
}
