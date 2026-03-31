/**
 * Deploy PolicyEngineMock + BUAttestationMock + EscrowFactoryV3 to Arbitrum Sepolia
 *
 * Prerequisites:
 *   1. Compile contracts: cd contracts/escrow && forge build
 *   2. Fund deployer wallet with Arb Sepolia ETH
 *   3. Ensure .deployer-wallet.json exists at repo root
 *
 * Usage:
 *   bun run apps/cre/scripts/deploy-arb-sepolia-all.ts
 */

import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount, mnemonicToAccount } from 'viem/accounts'
import { arbitrumSepolia } from 'viem/chains'
import { readFileSync, existsSync } from 'fs'

// Try .deployer-wallet.json first, fall back to mnemonic env
let account: ReturnType<typeof privateKeyToAccount>
if (existsSync('.deployer-wallet.json')) {
  const wallet = JSON.parse(readFileSync('.deployer-wallet.json', 'utf-8'))
  account = privateKeyToAccount(wallet.privateKey as `0x${string}`)
} else {
  throw new Error('Missing .deployer-wallet.json')
}

const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http() })
const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport: http() })

function readArtifact(name: string) {
  const path = `contracts/escrow/out/${name}.sol/${name}.json`
  const artifact = JSON.parse(readFileSync(path, 'utf-8'))
  return {
    abi: artifact.abi,
    bytecode: (artifact.bytecode.object ?? artifact.bytecode) as `0x${string}`,
  }
}

async function deploy(name: string, abi: any, bytecode: `0x${string}`, args: any[]) {
  console.log(`\nDeploying ${name}...`)
  const hash = await walletClient.deployContract({ abi, bytecode, args })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log(`  ${name}: ${receipt.contractAddress}`)
  console.log(`  Tx: ${hash}`)
  return receipt.contractAddress!
}

async function main() {
  console.log('=== Arb Sepolia Full Deploy ===')
  console.log('Deployer:', account.address)

  const balance = await publicClient.getBalance({ address: account.address })
  console.log('Balance:', Number(balance) / 1e18, 'ETH')
  if (balance === 0n) {
    console.error('\nERROR: Deployer has 0 ETH on Arb Sepolia.')
    console.error('Fund the wallet first: 0x09Ce8E2B3Fede2727dA4392Ea8Fe618305ba0474')
    process.exit(1)
  }

  // 1. PolicyEngineMock (defaultAllow=true, owner=deployer)
  const pe = readArtifact('PolicyEngineMock')
  const policyEngine = await deploy('PolicyEngineMock', pe.abi, pe.bytecode, [
    true,
    account.address,
  ])

  // 2. BUAttestationMock (owner=deployer)
  const ba = readArtifact('BUAttestationMock')
  const attestation = await deploy('BUAttestationMock', ba.abi, ba.bytecode, [
    account.address,
  ])

  // 3. EscrowFactoryV3 (policyEngine, attestation, executorAgent=deployer)
  const ef = readArtifact('EscrowFactoryV3')
  const factory = await deploy('EscrowFactoryV3', ef.abi, ef.bytecode, [
    policyEngine,
    attestation,
    account.address,
  ])

  console.log('\n=== Deployed Addresses (Arb Sepolia) ===')
  console.log(`PolicyEngineMock:  ${policyEngine}`)
  console.log(`BUAttestationMock: ${attestation}`)
  console.log(`EscrowFactoryV3:   ${factory}`)
  console.log('\nUpdate apps/cre/shared/addresses.ts:')
  console.log(`  ESCROW_FACTORY_ARB = '${factory}'`)
  console.log(`  // New: POLICY_ENGINE_ARB = '${policyEngine}'`)
  console.log(`  // New: BU_ATTESTATION_ARB = '${attestation}'`)
}

main().catch(console.error)
