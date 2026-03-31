import { createPublicClient, http } from 'viem';
import { getChainById } from '../constants/Chains';

export class ChainService {
  private clients = new Map<number, ReturnType<typeof createPublicClient>>();

  getPublicClient(chainId: number) {
    if (!this.clients.has(chainId)) {
      this.clients.set(chainId, this.newClient(chainId));
    }
    return this.clients.get(chainId)!;
  }

  private newClient(chainId: number) {
    const chain = getChainById(chainId);
    if (!chain) throw new Error(`Chain ${chainId} not supported`);
    return createPublicClient({
      chain: {
        id: chain.chainId,
        name: chain.name,
        rpcUrls: { default: { http: chain.rpcUrls } },
        nativeCurrency: chain.nativeCurrency,
      } as Parameters<typeof createPublicClient>[0]['chain'],
      transport: http(chain.rpcUrls[0]),
    });
  }
}
