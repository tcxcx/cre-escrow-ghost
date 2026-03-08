import { ChainService } from './ChainService';
import { CONTRACT_ABIS } from '../constants/ContractABIs';
import { encodeFunctionData, type Abi } from 'viem';

export class ContractService {
  constructor(private chain: ChainService) {}

  async read<T>(
    chainId: number,
    address: string,
    abiKey: keyof typeof CONTRACT_ABIS,
    fn: string,
    args: unknown[] = []
  ): Promise<T> {
    const client = this.chain.getPublicClient(chainId);
    // Widen ABI type so viem doesn't try to narrow functionName/args from the literal ABI
    const abi: Abi = CONTRACT_ABIS[abiKey];
    const result = await client.readContract({
      address: address as `0x${string}`,
      abi,
      functionName: fn,
      args,
    });
    return result as T;
  }

  encode(abiKey: keyof typeof CONTRACT_ABIS, fn: string, args: unknown[]): string {
    const abi: Abi = CONTRACT_ABIS[abiKey];
    return encodeFunctionData({ abi, functionName: fn, args });
  }
}
