/**
 * Deploy EscrowFactory to Ethereum Sepolia
 *
 * Prerequisites:
 *   1. Compile EscrowFactory.sol → contracts/artifacts/EscrowFactory.json
 *   2. Fund deployer wallet with Sepolia ETH
 *   3. Ensure .deployer-wallet.json exists at repo root
 *
 * Usage:
 *   bun run apps/cre/scripts/deploy-escrow-factory.ts
 */

import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { readFileSync } from 'fs'
import { POLICY_ENGINE, BU_ATTESTATION } from '../shared/addresses'

const wallet = JSON.parse(readFileSync('.deployer-wallet.json', 'utf-8'))
const account = privateKeyToAccount(wallet.privateKey as `0x${string}`)

const publicClient = createPublicClient({ chain: sepolia, transport: http() })
const walletClient = createWalletClient({ account, chain: sepolia, transport: http() })

async function main() {
  console.log('Deploying EscrowFactory to Eth Sepolia...')
  console.log('Deployer:', account.address)

  // Read the compiled bytecode - user needs to compile first
  const artifact = JSON.parse(
    readFileSync('contracts/escrow/out/EscrowFactoryV3.sol/EscrowFactoryV3.json', 'utf-8')
  )

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: (artifact.bytecode.object ?? artifact.bytecode) as `0x${string}`,
    args: [
      POLICY_ENGINE,
      BU_ATTESTATION,
      account.address, // executorAgent (deployer)
    ],
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log('EscrowFactory deployed at:', receipt.contractAddress)
  console.log('Tx hash:', hash)
  console.log('\nUpdate apps/cre/shared/addresses.ts ESCROW_FACTORY with this address.')
}

main().catch(console.error)
