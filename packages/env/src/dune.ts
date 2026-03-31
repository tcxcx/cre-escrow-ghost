import { resolve } from './core';

export function getDuneSimApiKey(override?: string): string | undefined {
  return resolve('DUNE_SIM_API_KEY', override);
}
