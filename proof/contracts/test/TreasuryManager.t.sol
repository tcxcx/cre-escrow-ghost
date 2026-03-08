// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/TreasuryManager.sol";
import "../src/USDCg.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDCForTM is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function decimals() public pure override returns (uint8) { return 6; }
}

contract MockUSYCForTM is ERC20 {
    constructor() ERC20("Hashnote USYC", "USYC") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract MockTellerForTM {
    ERC20 public usdc_;
    MockUSYCForTM public usyc_;
    constructor(address _usdc, address _usyc) { usdc_ = ERC20(_usdc); usyc_ = MockUSYCForTM(_usyc); }

    function subscribe(uint256 usdcAmount) external returns (uint256) {
        usdc_.transferFrom(msg.sender, address(this), usdcAmount);
        usyc_.mint(msg.sender, usdcAmount);
        return usdcAmount;
    }

    function redeem(uint256 usycAmount) external returns (uint256) {
        usyc_.transferFrom(msg.sender, address(this), usycAmount);
        usdc_.transfer(msg.sender, usycAmount);
        return usycAmount;
    }
}

contract MockOracleForTM {
    function latestAnswer() external pure returns (int256) { return 1e8; }
    function decimals() external pure returns (uint8) { return 8; }
}

contract TreasuryManagerTest is Test {
    TreasuryManager public tm;
    USDCg public usdcg;
    MockUSDCForTM public usdc;
    MockUSYCForTM public usyc;
    MockTellerForTM public teller;
    MockOracleForTM public oracle;

    address constant OWNER = address(0x0000000000000000000000000000000000000001);
    address constant USER = address(0x0000000000000000000000000000000000000002);
    address constant PAUSER = address(0x0000000000000000000000000000000000000003);
    address constant FORWARDER = address(0xf04A00de00000000000000000000000000000001);
    address constant RANDOM = address(0xBAD);

    bytes constant EMPTY_METADATA = abi.encodePacked(bytes32(0), bytes10(0), address(0));

    function setUp() public {
        usdc = new MockUSDCForTM();
        usyc = new MockUSYCForTM();
        teller = new MockTellerForTM(address(usdc), address(usyc));
        oracle = new MockOracleForTM();

        // Fund teller with USDC for redemptions
        usdc.mint(address(teller), 1_000_000e6);

        vm.prank(OWNER);
        usdcg = new USDCg(address(usdc), address(0), OWNER);

        vm.prank(OWNER);
        tm = new TreasuryManager(
            address(usdcg), address(usdc), address(usyc),
            address(teller), address(oracle),
            FORWARDER, OWNER
        );

        // Wire TreasuryManager into USDCg
        vm.prank(OWNER);
        usdcg.setTreasuryManager(address(tm));

        vm.prank(OWNER);
        tm.setPauser(PAUSER);

        // User deposits USDC into USDCg — auto-allocates to USYC via TreasuryManager
        usdc.mint(USER, 10_000e6);
        vm.prank(USER);
        usdc.approve(address(usdcg), type(uint256).max);
        vm.prank(USER);
        usdcg.deposit(10_000e6);
        // After deposit: all 10,000 USDC auto-allocated to USYC
        // USDCg has 0 USDC buffer, allocatedToYield = 10_000e6
        // TreasuryManager holds 10_000 USYC (mock: 1:1)
    }

    // ========================================================================
    // Manual Allocate / Redeem
    // ========================================================================

    function test_allocateToYield_manual() public {
        // Auto-allocated in setUp, so allocatedToYield = 10_000e6
        // Redeem some first so we have USDC buffer to re-allocate
        uint256 usycBal = usyc.balanceOf(address(tm));
        vm.prank(OWNER);
        tm.redeemFromYield(usycBal);
        // Now: USDC back in USDCg, allocatedToYield = 0
        assertEq(usdcg.allocatedToYield(), 0);

        vm.prank(OWNER);
        tm.allocateToYield(1000e6);
        assertEq(usdc.balanceOf(address(usdcg)), 9000e6);
        assertEq(usdcg.allocatedToYield(), 1000e6);
        assertGt(usyc.balanceOf(address(tm)), 0);
    }

    function test_redeemFromYield_manual() public {
        // All 10_000 auto-allocated in setUp; redeem it all
        uint256 usycBal = usyc.balanceOf(address(tm));
        vm.prank(OWNER);
        tm.redeemFromYield(usycBal);
        assertEq(usdcg.allocatedToYield(), 0);
        assertEq(usdc.balanceOf(address(usdcg)), 10_000e6);
    }

    function test_allocateToYield_onlyOwner() public {
        vm.prank(RANDOM);
        vm.expectRevert();
        tm.allocateToYield(100e6);
    }

    function test_allocateFromDeposit_onlyUSDCg() public {
        vm.prank(RANDOM);
        vm.expectRevert(TreasuryManager.OnlyUSDCg.selector);
        tm.allocateFromDeposit(100e6);
    }

    function test_autoAllocateOnDeposit() public {
        // After setUp deposit, all USDC auto-allocated
        assertEq(usdcg.allocatedToYield(), 10_000e6);
        assertEq(usdc.balanceOf(address(usdcg)), 0);
        assertEq(usyc.balanceOf(address(tm)), 10_000e6);
    }

    // ========================================================================
    // CRE Report Processing
    // ========================================================================

    function test_processReport_allocate() public {
        // Redeem first to get USDC buffer, then test CRE allocate
        uint256 usycBal = usyc.balanceOf(address(tm));
        vm.prank(OWNER);
        tm.redeemFromYield(usycBal);

        bytes memory report = abi.encode(uint8(0), uint256(1000e6));
        vm.prank(FORWARDER);
        tm.onReport(EMPTY_METADATA, report);
        assertEq(usdcg.allocatedToYield(), 1000e6);
    }

    function test_processReport_redeem() public {
        // All auto-allocated in setUp; redeem via CRE report
        uint256 usycBal = usyc.balanceOf(address(tm));
        bytes memory report = abi.encode(uint8(1), usycBal);
        vm.prank(FORWARDER);
        tm.onReport(EMPTY_METADATA, report);
        assertEq(usdcg.allocatedToYield(), 0);
    }

    function test_processReport_revertsInvalidAction() public {
        bytes memory report = abi.encode(uint8(99), uint256(100e6));
        vm.prank(FORWARDER);
        vm.expectRevert();
        tm.onReport(EMPTY_METADATA, report);
    }

    function test_processReport_revertsFromNonForwarder() public {
        bytes memory report = abi.encode(uint8(0), uint256(100e6));
        vm.prank(RANDOM);
        vm.expectRevert();
        tm.onReport(EMPTY_METADATA, report);
    }

    // ========================================================================
    // Pausable
    // ========================================================================

    function test_pause_blocksAllocate() public {
        // Redeem first so we have buffer to allocate
        uint256 usycBal = usyc.balanceOf(address(tm));
        vm.prank(OWNER);
        tm.redeemFromYield(usycBal);

        vm.prank(PAUSER);
        tm.pause();
        vm.prank(OWNER);
        vm.expectRevert();
        tm.allocateToYield(100e6);
    }

    function test_pause_blocksCREReport() public {
        vm.prank(PAUSER);
        tm.pause();
        bytes memory report = abi.encode(uint8(0), uint256(100e6));
        vm.prank(FORWARDER);
        vm.expectRevert();
        tm.onReport(EMPTY_METADATA, report);
    }

    function test_unpause_onlyOwner() public {
        vm.prank(OWNER);
        tm.pause();
        vm.prank(OWNER);
        tm.unpause();
        assertFalse(tm.paused());
    }

    // ========================================================================
    // View Functions
    // ========================================================================

    function test_getBufferRatioBPS() public view {
        // All auto-allocated, buffer is 0
        assertEq(tm.getBufferRatioBPS(), 0);
    }

    function test_getTotalBacking() public view {
        // All 10_000 auto-allocated to USYC in setUp
        (uint256 usdcBuffer, uint256 yieldValue, uint256 total) = tm.getTotalBacking();
        assertEq(usdcBuffer, 0);
        assertEq(yieldValue, 10_000e6); // mock oracle: 1:1
        assertEq(total, 10_000e6);
    }

    // ========================================================================
    // Ownable2Step + ERC-165
    // ========================================================================

    function test_ownable2Step() public {
        address newOwner = address(0x9999);
        vm.prank(OWNER);
        tm.transferOwnership(newOwner);
        assertEq(tm.owner(), OWNER);
        vm.prank(newOwner);
        tm.acceptOwnership();
        assertEq(tm.owner(), newOwner);
    }

    function test_supportsInterface() public view {
        bytes4 iReceiverId = bytes4(keccak256("onReport(bytes,bytes)"));
        assertTrue(tm.supportsInterface(iReceiverId));
    }

    function test_ownerIsCorrect() public view {
        assertEq(tm.owner(), OWNER);
    }
}
