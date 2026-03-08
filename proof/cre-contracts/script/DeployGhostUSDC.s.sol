// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {GhostUSDC} from "../src/GhostUSDC.sol";

/**
 * @title DeployGhostUSDC
 * @notice Deploy GhostUSDC (eUSDCg) to Arbitrum Sepolia.
 *
 * Usage:
 *   forge script script/DeployGhostUSDC.s.sol \
 *     --rpc-url arbitrum_sepolia \
 *     --broadcast \
 *     --private-key $CRE_ETH_PRIVATE_KEY
 *
 * For simplified demo: pass a test USDC address on Arbitrum Sepolia.
 * For full flow: pass the bridged USDCg address.
 */
contract DeployGhostUSDC is Script {
    function run() external {
        // Read environment variables
        address underlyingToken = vm.envAddress("UNDERLYING_TOKEN");
        address owner = vm.envAddress("DEPLOYER_ADDRESS");
        // PolicyEngine address — pass address(0) to deploy without compliance (gradual rollout)
        address policyEngine = vm.envOr("POLICY_ENGINE", address(0));

        console.log("Deploying GhostUSDC (eUSDCg)");
        console.log("  underlying:", underlyingToken);
        console.log("  owner:", owner);
        console.log("  policyEngine:", policyEngine);

        vm.startBroadcast();

        GhostUSDC ghostUSDC = new GhostUSDC(IERC20(underlyingToken), owner, policyEngine);

        console.log("GhostUSDC deployed at:", address(ghostUSDC));
        console.log("  name:", ghostUSDC.name());
        console.log("  symbol:", ghostUSDC.symbol());

        vm.stopBroadcast();
    }
}
