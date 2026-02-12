import { promises as fs } from 'node:fs'
import path from 'node:path'
import hre from 'hardhat'

const USDC_FUJI = '0x5425890298aed601595a70AB815c96711a31Bc65'
const EURC_FUJI = '0x5E44db7996c682E92a960b65AC713a54AD815c6B'

async function main() {
  const [deployer] = await hre.ethers.getSigners()

  if (!deployer) {
    throw new Error('No deployer signer available. Set PRIVATE_KEY in your environment.')
  }

  const EscrowV3 = await hre.ethers.getContractFactory('EscrowWithAgentV3')
  const escrowV3 = await EscrowV3.deploy()
  await escrowV3.waitForDeployment()

  const escrowV3Address = await escrowV3.getAddress()

  const Factory = await hre.ethers.getContractFactory('EscrowFactoryV3')
  const factory = await Factory.deploy(escrowV3Address, [USDC_FUJI, EURC_FUJI])
  await factory.waitForDeployment()

  const factoryAddress = await factory.getAddress()
  const deployerAddress = await deployer.getAddress()
  const deployedAt = new Date().toISOString()

  const deployment = {
    chainId: 43113,
    chainName: 'avalanche-fuji',
    implementation: escrowV3Address,
    factory: factoryAddress,
    deployer: deployerAddress,
    deployedAt,
    acceptedTokens: {
      usdc: USDC_FUJI,
      eurc: EURC_FUJI,
    },
  }

  const root = path.resolve(__dirname, '..', '..')
  const deploymentPath = path.join(root, 'packages', 'core', 'escrow', 'deployments.fuji.json')
  await fs.writeFile(deploymentPath, JSON.stringify(deployment, null, 2))

  const creConfigPath = path.join(root, 'packages', 'cre', 'bufi-lifecycle', 'workflow', 'config.staging.json')
  const raw = await fs.readFile(creConfigPath, 'utf8')
  const config = JSON.parse(raw) as Record<string, unknown>
  config.escrowFactory = factoryAddress
  if (!config.protocolFeeRecipient || String(config.protocolFeeRecipient).trim().length === 0) {
    config.protocolFeeRecipient = deployerAddress
  }
  await fs.writeFile(creConfigPath, JSON.stringify(config, null, 2))

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        implementation: escrowV3Address,
        factory: factoryAddress,
        deployer: deployerAddress,
        deploymentPath,
        creConfigPath,
      },
      null,
      2
    )
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
