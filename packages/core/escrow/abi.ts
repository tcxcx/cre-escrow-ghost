import escrowFactoryArtifact from '../../../hardhat/artifacts-bufi/contracts/bufi/EscrowFactoryV3.sol/EscrowFactoryV3.json'
import escrowV3Artifact from '../../../hardhat/artifacts-bufi/contracts/bufi/EscrowWithAgentV3.sol/EscrowWithAgentV3.json'
import {
  IDENTITY_REGISTRY_ABI as ERC8004_IDENTITY_ABI,
  REPUTATION_REGISTRY_ABI as ERC8004_REPUTATION_ABI,
} from '@repo/erc-8004'

export const ESCROW_FACTORY_V3_ABI = escrowFactoryArtifact.abi
export const ESCROW_WITH_AGENT_V3_ABI = escrowV3Artifact.abi
