export interface BufiEscrowDeployment {
  chainId: number
  chainName: string
  implementation: `0x${string}`
  factory: `0x${string}`
  deployedAt: string
  deployer: `0x${string}`
  acceptedTokens: {
    usdc: `0x${string}`
    eurc: `0x${string}`
  }
}

export const EMPTY_FUJI_DEPLOYMENT: BufiEscrowDeployment = {
  chainId: 43113,
  chainName: 'avalanche-fuji',
  implementation: '0x0000000000000000000000000000000000000000',
  factory: '0x0000000000000000000000000000000000000000',
  deployedAt: '',
  deployer: '0x0000000000000000000000000000000000000000',
  acceptedTokens: {
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
    eurc: '0x5E44db7996c682E92a960b65AC713a54AD815c6B',
  },
}
