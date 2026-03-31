// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/BUAttestation.sol";

contract DeployBUAttestation is Script {
    function run() external {
        address forwarder = vm.envAddress("FORWARDER_ADDRESS");
        vm.startBroadcast();
        new BUAttestation(forwarder);
        vm.stopBroadcast();
    }
}
