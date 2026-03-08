/**
 * Deploy EscrowFactory to Arbitrum Sepolia (demo only)
 *
 * This is a demo deployment — all constructor args use the deployer address
 * as placeholders since we don't have PolicyEngine/BUAttestation on Arb Sepolia.
 *
 * Prerequisites:
 *   1. Compile EscrowFactory.sol → contracts/artifacts/EscrowFactory.json
 *   2. Fund deployer wallet with Arbitrum Sepolia ETH
 *   3. Ensure .deployer-wallet.json exists at repo root
 *
 * Usage:
 *   bun run apps/cre/scripts/deploy-escrow-factory-arb.ts
 */

import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrumSepolia } from 'viem/chains'
import { readFileSync } from 'fs'

const wallet = JSON.parse(readFileSync('.deployer-wallet.json', 'utf-8'))
const account = privateKeyToAccount(wallet.privateKey as `0x${string}`)

const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http() })
const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport: http() })

async function main() {
  console.log('Deploying EscrowFactory to Arbitrum Sepolia (demo)...')
  console.log('Deployer:', account.address)

  const artifact = JSON.parse(
    readFileSync('contracts/escrow/out/EscrowFactoryV3.sol/EscrowFactoryV3.json', 'utf-8')
  )

  // Demo: use deployer as placeholder for all constructor args
  // (no PolicyEngine/BUAttestation on Arb Sepolia)
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: (artifact.bytecode.object ?? artifact.bytecode) as `0x${string}`,
    args: [account.address, account.address, account.address],
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log('EscrowFactory (Arb Sepolia) deployed at:', receipt.contractAddress)
  console.log('Tx hash:', hash)
  console.log('\nUpdate apps/cre/shared/addresses.ts ESCROW_FACTORY_ARB with this address.')
}

main().catch(console.error)
