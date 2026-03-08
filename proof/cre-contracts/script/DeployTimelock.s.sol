// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

interface IOwnable2Step {
    function transferOwnership(address newOwner) external;
    function acceptOwnership() external;
    function owner() external view returns (address);
}

/**
 * @title DeployTimelock
 * @notice Deploy a TimelockController and transfer ownership of deployed contracts to it.
 *
 *   Strategy: Deploy with minDelay=0 so we can immediately schedule+execute
 *   the acceptOwnership() calls, then lock it down by scheduling+executing
 *   an updateDelay() to set the real delay.
 *
 *   Env vars:
 *     PRIVATE_KEY, ATTESTATION_ADDRESS, USDCG_ADDRESS, TREASURY_MANAGER_ADDRESS
 *     TIMELOCK_DELAY (optional, default: 86400 = 24h)
 */
contract DeployTimelock is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        uint256 delay = vm.envOr("TIMELOCK_DELAY", uint256(86400));

        address attestation = vm.envAddress("ATTESTATION_ADDRESS");
        address usdcgAddr = vm.envAddress("USDCG_ADDRESS");
        address tmAddr = vm.envAddress("TREASURY_MANAGER_ADDRESS");

        address[] memory proposers = new address[](1);
        proposers[0] = deployer;
        address[] memory executors = new address[](1);
        executors[0] = deployer;

        vm.startBroadcast(pk);

        // Deploy with minDelay=0 so initial acceptOwnership calls can execute immediately
        TimelockController timelock = new TimelockController(
            0, proposers, executors, deployer
        );
        console.log("TimelockController:", address(timelock));

        // Transfer ownership of all contracts (Ownable2Step: transfer then accept)
        IOwnable2Step(attestation).transferOwnership(address(timelock));
        IOwnable2Step(usdcgAddr).transferOwnership(address(timelock));
        IOwnable2Step(tmAddr).transferOwnership(address(timelock));

        bytes memory acceptCall = abi.encodeWithSignature("acceptOwnership()");

        // Schedule and execute acceptOwnership immediately (minDelay is 0)
        timelock.schedule(attestation, 0, acceptCall, bytes32(0), bytes32("att"), 0);
        timelock.execute(attestation, 0, acceptCall, bytes32(0), bytes32("att"));

        timelock.schedule(usdcgAddr, 0, acceptCall, bytes32(0), bytes32("usdcg"), 0);
        timelock.execute(usdcgAddr, 0, acceptCall, bytes32(0), bytes32("usdcg"));

        timelock.schedule(tmAddr, 0, acceptCall, bytes32(0), bytes32("tm"), 0);
        timelock.execute(tmAddr, 0, acceptCall, bytes32(0), bytes32("tm"));

        // Now lock down the timelock by setting the real delay
        bytes memory updateDelayCall = abi.encodeWithSignature("updateDelay(uint256)", delay);
        timelock.schedule(address(timelock), 0, updateDelayCall, bytes32(0), bytes32("delay"), 0);
        timelock.execute(address(timelock), 0, updateDelayCall, bytes32(0), bytes32("delay"));

        vm.stopBroadcast();

        console.log("Min delay set to:  ", delay, "seconds");
        console.log("Ownership transferred:");
        console.log("  BUAttestation owner:    ", IOwnable2Step(attestation).owner());
        console.log("  USDCg owner:            ", IOwnable2Step(usdcgAddr).owner());
        console.log("  TreasuryManager owner:  ", IOwnable2Step(tmAddr).owner());
    }
}
