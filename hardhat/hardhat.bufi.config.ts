/**
 * Hardhat config for BUFI Contracts (EscrowWithAgentV3, Factory, ACE policies)
 *
 * Usage:
 *   bunx hardhat compile --config hardhat.bufi.config.ts
 *   bunx hardhat test --config hardhat.bufi.config.ts
 *
 * This is separate from the main hardhat.config.ts which compiles lotus-router.
 * BUFI contracts use OpenZeppelin v4 (available via hoisted node_modules).
 */

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const PRIVATE_KEY = process.env.PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          evmVersion: "paris",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    avalancheFuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      chainId: 43113,
    },
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      chainId: 43114,
    },
  },
  paths: {
    sources: "./contracts/bufi",
    tests: "./test/bufi",
    cache: "./cache-bufi",
    artifacts: "./artifacts-bufi",
  },
};

export default config;
