import type { GasEstimate } from '@bu/types/transfer-execution';

export class RouteOptimizationService {
  selectOptimal(est: GasEstimate[]): GasEstimate {
    const availableEstimates = est.filter(e => e.available);

    if (availableEstimates.length === 0) {
      throw new Error('No available route');
    }

    const bridgeKitEstimate = availableEstimates.find(e => e.protocol === 'bridge-kit');
    const circleSDKEstimate = availableEstimates.find(e => e.protocol === 'circle-sdk');

    // PRIORITY 1: Circle SDK for same-chain transfers
    if (circleSDKEstimate) {
      return circleSDKEstimate;
    }

    // PRIORITY 2: Bridge Kit for cross-chain transfers
    const crossChainOptions = [bridgeKitEstimate].filter(
      (estimate): estimate is GasEstimate => estimate !== undefined
    );

    if (crossChainOptions.length > 1) {
      const cheapest = crossChainOptions.reduce((prev, current) =>
        prev.totalGasCost <= current.totalGasCost ? prev : current
      );
      return cheapest;
    }

    if (crossChainOptions.length === 1) {
      const selected = crossChainOptions[0];
      if (!selected) {
        throw new Error('Invalid cross-chain option selection');
      }
      return selected;
    }

    // Fallback to any available estimate
    if (availableEstimates.length === 0) {
      throw new Error('No available routes found after filtering');
    }

    const fallback = availableEstimates[0];
    if (!fallback) {
      throw new Error('Invalid fallback option selection');
    }
    return fallback;
  }
}
