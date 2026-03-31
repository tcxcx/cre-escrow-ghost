// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/USDCg.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function decimals() public pure override returns (uint8) { return 6; }
}

/// @dev Stub TreasuryManager that accepts allocateFromDeposit calls (no-op)
contract MockTreasuryMgr {
    function allocateFromDeposit(uint256) external {}
}

contract USDCgTest is Test {
    USDCg public usdcg;
    MockUSDC public usdc;
    address constant OWNER = address(0x0000000000000000000000000000000000000001);
    address constant USER = address(0x0000000000000000000000000000000000000002);
    address constant PAUSER = address(0x0000000000000000000000000000000000000003);
    address constant RANDOM = address(0xBAD);
    MockTreasuryMgr public mockTM;

    function setUp() public {
        usdc = new MockUSDC();
        vm.prank(OWNER);
        usdcg = new USDCg(address(usdc), address(0), OWNER);

        vm.prank(OWNER);
        usdcg.setPauser(PAUSER);

        // Note: treasuryManager not set here (address(0)) so deposit() skips auto-allocate.
        // Auto-allocate with full wiring is tested in TreasuryManager.t.sol.
        mockTM = new MockTreasuryMgr();

        usdc.mint(USER, 10_000e6);
        vm.prank(USER);
        usdc.approve(address(usdcg), type(uint256).max);
    }

    // ========================================================================
    // Deposit / Withdraw
    // ========================================================================

    function test_deposit_mintsOneToOne() public {
        vm.prank(USER);
        usdcg.deposit(100e6);
        assertEq(usdcg.balanceOf(USER), 100e6);
        assertEq(usdc.balanceOf(address(usdcg)), 100e6);
    }

    function test_withdraw_burnsOneToOne() public {
        vm.prank(USER);
        usdcg.deposit(100e6);
        vm.prank(USER);
        usdcg.withdraw(50e6);
        assertEq(usdcg.balanceOf(USER), 50e6);
        assertEq(usdc.balanceOf(USER), 9_950e6);
    }

    // ========================================================================
    // Pausable Tests
    // ========================================================================

    function test_deposit_revertsWhenPaused() public {
        vm.prank(PAUSER);
        usdcg.pause();
        vm.prank(USER);
        vm.expectRevert();
        usdcg.deposit(100e6);
    }

    function test_withdraw_revertsWhenPaused() public {
        vm.prank(USER);
        usdcg.deposit(100e6);
        vm.prank(PAUSER);
        usdcg.pause();
        vm.prank(USER);
        vm.expectRevert();
        usdcg.withdraw(50e6);
    }

    function test_pause_byPauser() public {
        vm.prank(PAUSER);
        usdcg.pause();
        assertTrue(usdcg.paused());
    }

    function test_pause_byOwner() public {
        vm.prank(OWNER);
        usdcg.pause();
        assertTrue(usdcg.paused());
    }

    function test_pause_revertsByRandom() public {
        vm.prank(RANDOM);
        vm.expectRevert(USDCg.NotPauser.selector);
        usdcg.pause();
    }

    function test_unpause_onlyOwner() public {
        vm.prank(OWNER);
        usdcg.pause();
        vm.prank(OWNER);
        usdcg.unpause();
        assertFalse(usdcg.paused());
    }

    function test_unpause_revertsByPauser() public {
        vm.prank(OWNER);
        usdcg.pause();
        vm.prank(PAUSER);
        vm.expectRevert();
        usdcg.unpause();
    }

    // ========================================================================
    // Backing Invariant Tests
    // ========================================================================

    function test_backingInvariant_holdsOnDeposit() public {
        vm.prank(USER);
        usdcg.deposit(100e6);
        assertGe(usdc.balanceOf(address(usdcg)), usdcg.totalSupply() - usdcg.allocatedToYield());
    }

    function test_backingInvariant_accountsForYieldAllocation() public {
        // Set treasury manager for this test
        vm.prank(OWNER);
        usdcg.setTreasuryManager(address(mockTM));

        vm.prank(USER);
        usdcg.deposit(1000e6);

        // Simulate TreasuryManager pulling USDC
        vm.prank(address(mockTM));
        usdc.transferFrom(address(usdcg), address(mockTM), 500e6);

        vm.prank(address(mockTM));
        usdcg.recordYieldAllocation(500e6);

        assertEq(usdcg.allocatedToYield(), 500e6);
        assertGe(usdc.balanceOf(address(usdcg)), usdcg.totalSupply() - usdcg.allocatedToYield());
    }

    function test_recordYieldAllocation_onlyTreasuryManager() public {
        vm.prank(OWNER);
        usdcg.setTreasuryManager(address(mockTM));

        vm.prank(RANDOM);
        vm.expectRevert(USDCg.OnlyTreasuryManager.selector);
        usdcg.recordYieldAllocation(100e6);
    }

    function test_recordYieldRedemption_onlyTreasuryManager() public {
        vm.prank(OWNER);
        usdcg.setTreasuryManager(address(mockTM));

        vm.prank(RANDOM);
        vm.expectRevert(USDCg.OnlyTreasuryManager.selector);
        usdcg.recordYieldRedemption(100e6);
    }

    function test_recordYieldRedemption_decrementsAllocated() public {
        vm.prank(OWNER);
        usdcg.setTreasuryManager(address(mockTM));

        vm.prank(USER);
        usdcg.deposit(1000e6);

        vm.prank(address(mockTM));
        usdcg.recordYieldAllocation(500e6);

        vm.prank(address(mockTM));
        usdcg.recordYieldRedemption(200e6);

        assertEq(usdcg.allocatedToYield(), 300e6);
    }

    // ========================================================================
    // Ownable2Step Tests
    // ========================================================================

    function test_ownable2Step_transferRequiresAccept() public {
        address newOwner = address(0x9999);
        vm.prank(OWNER);
        usdcg.transferOwnership(newOwner);
        assertEq(usdcg.owner(), OWNER);
        vm.prank(newOwner);
        usdcg.acceptOwnership();
        assertEq(usdcg.owner(), newOwner);
    }

    // ========================================================================
    // Admin Tests
    // ========================================================================

    function test_setTreasuryManager_onlyOwner() public {
        vm.prank(RANDOM);
        vm.expectRevert();
        usdcg.setTreasuryManager(RANDOM);
    }

    function test_setPolicyEngine_onlyOwner() public {
        vm.prank(RANDOM);
        vm.expectRevert();
        usdcg.setPolicyEngine(RANDOM);
    }
}
