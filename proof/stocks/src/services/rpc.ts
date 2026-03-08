import { createPublicClient, http, defineChain, type PublicClient, type Chain, type HttpTransport } from 'viem';

// ---------------------------------------------------------------------------
// Chain definition — uses Alchemy RPC when API key is available
// ---------------------------------------------------------------------------

function getRpcUrl(): string {
  const key = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? process.env.ALCHEMY_API_KEY;
  return key
    ? `https://robinhood-testnet.g.alchemy.com/v2/${key}`
    : 'https://rpc.testnet.chain.robinhood.com';
}

export const robinhoodChain = defineChain({
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.chain.robinhood.com'] },
    alchemy: { http: ['https://robinhood-testnet.g.alchemy.com/v2'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.testnet.chain.robinhood.com' },
  },
  testnet: true,
});

// ---------------------------------------------------------------------------
// Singleton public client — reused across balance, swap, and RPC services
// ---------------------------------------------------------------------------

let _client: PublicClient<HttpTransport, Chain> | null = null;

export function getClient(): PublicClient<HttpTransport, Chain> {
  if (!_client) {
    const rpcUrl = getRpcUrl();
    _client = createPublicClient({
      chain: robinhoodChain,
      transport: http(rpcUrl, { timeout: 10_000 }),
    }) as PublicClient<HttpTransport, Chain>;
  }
  return _client;
}

// ---------------------------------------------------------------------------
// JSON-RPC helpers — typed wrappers around Alchemy Robinhood Chain endpoints
// ---------------------------------------------------------------------------

export interface TransactionRequest {
  from?: `0x${string}`;
  to?: `0x${string}` | null;
  value?: bigint;
  data?: `0x${string}`;
  nonce?: number;
}

/** Estimate gas for a transaction (eth_estimateGas) */
export async function estimateGas(tx: TransactionRequest): Promise<bigint> {
  const client = getClient();
  return client.estimateGas({
    account: tx.from,
    to: tx.to ?? undefined,
    value: tx.value,
    data: tx.data,
    nonce: tx.nonce,
  } as Parameters<typeof client.estimateGas>[0]);
}

/** Get current gas price in wei (eth_gasPrice) */
export async function getGasPrice(): Promise<bigint> {
  const client = getClient();
  return client.getGasPrice();
}

/** Send a signed raw transaction (eth_sendRawTransaction) */
export async function sendRawTransaction(signedTx: `0x${string}`): Promise<`0x${string}`> {
  const client = getClient();
  return client.request({
    method: 'eth_sendRawTransaction',
    params: [signedTx],
  });
}

/** Get transaction receipt — polls until mined or timeout */
export async function waitForTransaction(
  txHash: `0x${string}`,
  confirmations = 1,
  timeoutMs = 30_000,
) {
  const client = getClient();
  return client.waitForTransactionReceipt({
    hash: txHash,
    confirmations,
    timeout: timeoutMs,
  });
}

/** Get the current block number */
export async function getBlockNumber(): Promise<bigint> {
  const client = getClient();
  return client.getBlockNumber();
}

/** Get ETH balance of an address */
export async function getBalance(address: `0x${string}`): Promise<bigint> {
  const client = getClient();
  return client.getBalance({ address });
}

/** Get transaction count (nonce) for an address */
export async function getTransactionCount(address: `0x${string}`): Promise<number> {
  const client = getClient();
  return client.getTransactionCount({ address });
}

/** Get chain ID — useful for sanity checks */
export async function getChainId(): Promise<number> {
  const client = getClient();
  return client.getChainId();
}

/** Read a contract (eth_call) — re-exported from client for convenience */
export async function readContract<TAbi extends readonly unknown[]>(params: {
  address: `0x${string}`;
  abi: TAbi;
  functionName: string;
  args?: readonly unknown[];
}) {
  const client = getClient();
  return client.readContract(params as Parameters<typeof client.readContract>[0]);
}
