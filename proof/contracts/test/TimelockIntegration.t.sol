// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BUAttestation.sol";
import "../src/USDCg.sol";
import "../src/TreasuryManager.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDCForTL is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function decimals() public pure override returns (uint8) { return 6; }
}

contract MockUSYCForTL is ERC20 {
    constructor() ERC20("USYC", "USYC") {}
}

contract MockTellerForTL {
    function subscribe(uint256) external pure returns (uint256) { return 0; }
    function redeem(uint256) external pure returns (uint256) { return 0; }
}

contract MockOracleForTL {
    function latestAnswer() external pure returns (int256) { return 1e8; }
    function decimals() external pure returns (uint8) { return 8; }
}

contract TimelockIntegrationTest is Test {
    TimelockController public timelock;
    BUAttestation public attestation;
    USDCg public usdcg;
    TreasuryManager public tm;
    MockUSDCForTL public usdc;

    address constant FORWARDER = address(0xf04A00de00000000000000000000000000000001);
    address deployer = address(this);
    address constant PAUSER = address(0x0000000000000000000000000000000000000003);
    uint256 constant DELAY = 86400; // 24 hours

    function setUp() public {
        // Warp past timestamp 1 — OZ TimelockController uses DONE_TIMESTAMP=1,
        // so scheduling with delay=0 at block.timestamp=1 would collide.
        vm.warp(100);

        // Deploy timelock with minDelay=0 for initial setup
        address[] memory proposers = new address[](1);
        proposers[0] = deployer;
        address[] memory executors = new address[](1);
        executors[0] = deployer;
        timelock = new TimelockController(0, proposers, executors, deployer);

        // Deploy contracts
        attestation = new BUAttestation(FORWARDER);
        usdc = new MockUSDCForTL();
        usdcg = new USDCg(address(usdc), address(0), deployer);

        MockUSYCForTL usyc = new MockUSYCForTL();
        MockTellerForTL teller_ = new MockTellerForTL();
        MockOracleForTL oracle_ = new MockOracleForTL();
        tm = new TreasuryManager(
            address(usdcg), address(usdc), address(usyc),
            address(teller_), address(oracle_),
            FORWARDER, deployer
        );

        // Set pausers before transferring ownership
        attestation.setPauser(PAUSER);
        usdcg.setPauser(PAUSER);
        tm.setPauser(PAUSER);

        // Transfer ownership to timelock (Ownable2Step: transfer then accept)
        attestation.transferOwnership(address(timelock));
        usdcg.transferOwnership(address(timelock));
        tm.transferOwnership(address(timelock));

        // Timelock accepts ownership (schedule+execute with delay=0 since minDelay=0)
        bytes memory acceptCall = abi.encodeWithSignature("acceptOwnership()");

        timelock.schedule(address(attestation), 0, acceptCall, bytes32(0), bytes32("att"), 0);
        timelock.execute(address(attestation), 0, acceptCall, bytes32(0), bytes32("att"));

        timelock.schedule(address(usdcg), 0, acceptCall, bytes32(0), bytes32("usdcg"), 0);
        timelock.execute(address(usdcg), 0, acceptCall, bytes32(0), bytes32("usdcg"));

        timelock.schedule(address(tm), 0, acceptCall, bytes32(0), bytes32("tm"), 0);
        timelock.execute(address(tm), 0, acceptCall, bytes32(0), bytes32("tm"));

        // Lock down: set the real delay via the timelock itself
        bytes memory updateDelayCall = abi.encodeWithSignature("updateDelay(uint256)", DELAY);
        timelock.schedule(address(timelock), 0, updateDelayCall, bytes32(0), bytes32("delay"), 0);
        timelock.execute(address(timelock), 0, updateDelayCall, bytes32(0), bytes32("delay"));
    }

    // ========================================================================
    // Ownership Tests
    // ========================================================================

    function test_ownerIsTimelock() public view {
        assertEq(attestation.owner(), address(timelock));
        assertEq(usdcg.owner(), address(timelock));
        assertEq(tm.owner(), address(timelock));
    }

    function test_timelockMinDelayIsSet() public view {
        assertEq(timelock.getMinDelay(), DELAY);
    }

    // ========================================================================
    // Access Control Tests
    // ========================================================================

    function test_directAdminCallReverts() public {
        vm.expectRevert();
        attestation.setMinInterval(0, 100);
    }

    function test_directAdminCallOnUSDCgReverts() public {
        vm.expectRevert();
        usdcg.setPolicyEngine(address(0xdead));
    }

    function test_directAdminCallOnTMReverts() public {
        vm.expectRevert();
        tm.allocateToYield(100);
    }

    // ========================================================================
    // Timelock-Gated Admin Tests
    // ========================================================================

    function test_timelockAdminCallSucceeds() public {
        bytes memory call_ = abi.encodeWithSignature(
            "setMinInterval(uint8,uint256)", uint8(0), uint256(100)
        );
        bytes32 salt = bytes32("setInterval");

        timelock.schedule(address(attestation), 0, call_, bytes32(0), salt, DELAY);
        vm.warp(block.timestamp + DELAY + 1);
        timelock.execute(address(attestation), 0, call_, bytes32(0), salt);

        assertEq(attestation.minInterval(0), 100);
    }

    function test_timelockCallBeforeDelayReverts() public {
        bytes memory call_ = abi.encodeWithSignature(
            "setMinInterval(uint8,uint256)", uint8(0), uint256(200)
        );
        bytes32 salt = bytes32("earlyExec");

        timelock.schedule(address(attestation), 0, call_, bytes32(0), salt, DELAY);

        // Try to execute before delay expires
        vm.warp(block.timestamp + DELAY - 1);
        vm.expectRevert();
        timelock.execute(address(attestation), 0, call_, bytes32(0), salt);
    }

    // ========================================================================
    // Pause / Unpause Tests
    // ========================================================================

    function test_pauserCanPauseInstantly() public {
        vm.prank(PAUSER);
        attestation.pause();
        assertTrue(attestation.paused());

        vm.prank(PAUSER);
        usdcg.pause();
        assertTrue(usdcg.paused());

        vm.prank(PAUSER);
        tm.pause();
        assertTrue(tm.paused());
    }

    function test_unpauseRequiresTimelock() public {
        // Pause first
        vm.prank(PAUSER);
        attestation.pause();

        // Pauser cannot unpause
        vm.prank(PAUSER);
        vm.expectRevert();
        attestation.unpause();

        // Deployer cannot unpause (not owner anymore)
        vm.expectRevert();
        attestation.unpause();

        // Must go through timelock
        bytes memory call_ = abi.encodeWithSignature("unpause()");
        bytes32 salt = bytes32("unpause");
        timelock.schedule(address(attestation), 0, call_, bytes32(0), salt, DELAY);
        vm.warp(block.timestamp + DELAY + 1);
        timelock.execute(address(attestation), 0, call_, bytes32(0), salt);

        assertFalse(attestation.paused());
    }

    function test_unpauseUSDCgRequiresTimelock() public {
        vm.prank(PAUSER);
        usdcg.pause();

        bytes memory call_ = abi.encodeWithSignature("unpause()");
        bytes32 salt = bytes32("unpauseUsdcg");
        timelock.schedule(address(usdcg), 0, call_, bytes32(0), salt, DELAY);
        vm.warp(block.timestamp + DELAY + 1);
        timelock.execute(address(usdcg), 0, call_, bytes32(0), salt);

        assertFalse(usdcg.paused());
    }

    function test_unpauseTMRequiresTimelock() public {
        vm.prank(PAUSER);
        tm.pause();

        bytes memory call_ = abi.encodeWithSignature("unpause()");
        bytes32 salt = bytes32("unpauseTm");
        timelock.schedule(address(tm), 0, call_, bytes32(0), salt, DELAY);
        vm.warp(block.timestamp + DELAY + 1);
        timelock.execute(address(tm), 0, call_, bytes32(0), salt);

        assertFalse(tm.paused());
    }
}
