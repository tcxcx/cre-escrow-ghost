export const ROBINHOOD_CHAIN = {
  id: 46630,
  name: 'Robinhood Chain Testnet',
  rpcUrl: 'https://rpc.testnet.chain.robinhood.com',
  alchemyRpcBase: 'https://robinhood-testnet.g.alchemy.com/v2',
  explorer: 'https://explorer.testnet.chain.robinhood.com',
  isTestnet: true,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
} as const;

/** Alchemy wallet blockchain identifier (matches @bu/alchemy-wallets config) */
export const ROBINHOOD_ALCHEMY_BLOCKCHAIN = 'ROBIN-TESTNET' as const;
