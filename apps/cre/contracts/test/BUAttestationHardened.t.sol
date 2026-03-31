// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BUAttestation.sol";

contract BUAttestationHardenedTest is Test {
    BUAttestation public attestation;
    address constant FORWARDER = address(0xf04A00de00000000000000000000000000000001);
    address constant PAUSER = address(0x0000000000000000000000000000000000000003);
    address constant RANDOM = address(0xBAD);

    bytes constant EMPTY_METADATA = abi.encodePacked(bytes32(0), bytes10(0), address(0));

    function setUp() public {
        // Warp to a realistic timestamp so rate limiting math works
        // (lastAttestedAt defaults to 0, so 0 + interval must be < block.timestamp)
        vm.warp(1700000000);
        attestation = new BUAttestation(FORWARDER);
        attestation.setPauser(PAUSER);
    }

    function _callOnReport(uint8 opType, string memory entityId) internal {
        bytes memory report = abi.encode(
            opType, entityId, keccak256("data"), uint256(block.timestamp), ""
        );
        vm.prank(FORWARDER);
        attestation.onReport(EMPTY_METADATA, report);
    }

    // ========================================================================
    // Pausable Tests
    // ========================================================================

    function test_pause_byPauser() public {
        vm.prank(PAUSER);
        attestation.pause();
        assertTrue(attestation.paused());
    }

    function test_pause_byOwner() public {
        attestation.pause();
        assertTrue(attestation.paused());
    }

    function test_pause_revertsByRandom() public {
        vm.prank(RANDOM);
        vm.expectRevert(BUAttestation.NotPauser.selector);
        attestation.pause();
    }

    function test_unpause_onlyOwner() public {
        attestation.pause();
        attestation.unpause();
        assertFalse(attestation.paused());
    }

    function test_unpause_revertsByPauser() public {
        attestation.pause();
        vm.prank(PAUSER);
        vm.expectRevert();
        attestation.unpause();
    }

    function test_processReport_revertsWhenPaused() public {
        attestation.pause();
        bytes memory report = abi.encode(
            uint8(0), "entity-1", keccak256("data"), uint256(1700000000), ""
        );
        vm.prank(FORWARDER);
        vm.expectRevert();
        attestation.onReport(EMPTY_METADATA, report);
    }

    // ========================================================================
    // Rate Limiting Tests
    // ========================================================================

    function test_rateLimit_blocksWithinInterval() public {
        attestation.setMinInterval(9, 3600);
        _callOnReport(9, "reserves-1");
        vm.expectRevert();
        _callOnReport(9, "reserves-2");
    }

    function test_rateLimit_allowsAfterInterval() public {
        attestation.setMinInterval(9, 3600);
        _callOnReport(9, "reserves-1");
        vm.warp(block.timestamp + 3601);
        _callOnReport(9, "reserves-2");
        assertEq(attestation.attestationCount(), 2);
    }

    function test_rateLimit_zeroMeansUnlimited() public {
        _callOnReport(0, "transfer-1");
        _callOnReport(0, "transfer-2");
        assertEq(attestation.attestationCount(), 2);
    }

    function test_rateLimit_perOpTypeIndependent() public {
        attestation.setMinInterval(9, 3600);
        _callOnReport(9, "reserves-1");
        _callOnReport(0, "transfer-1");
        assertEq(attestation.attestationCount(), 2);
    }

    // ========================================================================
    // TTL / Expiry Tests
    // ========================================================================

    function test_ttl_attestationExpiresAfterTTL() public {
        attestation.setTTL(9, 21600);
        uint256 now_ = block.timestamp;
        _callOnReport(9, "reserves-1");
        bytes32 attestationId = keccak256(abi.encodePacked(uint8(9), "reserves-1", now_));
        assertTrue(attestation.verifyAttestation(attestationId, keccak256("data")));
        assertFalse(attestation.isAttestationExpired(attestationId));
        vm.warp(now_ + 21601);
        assertFalse(attestation.verifyAttestation(attestationId, keccak256("data")));
        assertTrue(attestation.isAttestationExpired(attestationId));
    }

    function test_ttl_zeroMeansNeverExpires() public {
        uint256 now_ = block.timestamp;
        _callOnReport(0, "transfer-1");
        bytes32 attestationId = keccak256(abi.encodePacked(uint8(0), "transfer-1", now_));
        vm.warp(now_ + 365 days);
        assertTrue(attestation.verifyAttestation(attestationId, keccak256("data")));
        assertFalse(attestation.isAttestationExpired(attestationId));
    }

    function test_ttl_expiresAtStoredCorrectly() public {
        attestation.setTTL(7, 365 days);
        uint256 now_ = block.timestamp;
        _callOnReport(7, "kyc-user-1");
        bytes32 attestationId = keccak256(abi.encodePacked(uint8(7), "kyc-user-1", now_));
        (, , , , uint256 expiresAt, ,) = attestation.attestations(attestationId);
        assertEq(expiresAt, now_ + 365 days);
    }

    // ========================================================================
    // Severity Tests
    // ========================================================================

    function test_severity_defaultIsInfo() public view {
        assertEq(uint8(attestation.severityByOpType(0)), uint8(BUAttestation.Severity.INFO));
    }

    function test_severity_canSetPerOpType() public {
        attestation.setSeverity(9, BUAttestation.Severity.CRITICAL);
        assertEq(uint8(attestation.severityByOpType(9)), uint8(BUAttestation.Severity.CRITICAL));
    }

    // ========================================================================
    // Admin Tests
    // ========================================================================

    function test_setMinInterval_onlyOwner() public {
        vm.prank(RANDOM);
        vm.expectRevert();
        attestation.setMinInterval(0, 100);
    }

    function test_setTTL_onlyOwner() public {
        vm.prank(RANDOM);
        vm.expectRevert();
        attestation.setTTL(0, 100);
    }

    function test_setSeverity_onlyOwner() public {
        vm.prank(RANDOM);
        vm.expectRevert();
        attestation.setSeverity(0, BUAttestation.Severity.CRITICAL);
    }

    function test_setPauser_onlyOwner() public {
        vm.prank(RANDOM);
        vm.expectRevert();
        attestation.setPauser(RANDOM);
    }

    // ========================================================================
    // Ownable2Step Tests
    // ========================================================================

    function test_ownable2Step_transferRequiresAccept() public {
        address newOwner = address(0x1234);
        attestation.transferOwnership(newOwner);
        assertEq(attestation.owner(), address(this));
        vm.prank(newOwner);
        attestation.acceptOwnership();
        assertEq(attestation.owner(), newOwner);
    }

    // ========================================================================
    // Regression Tests
    // ========================================================================

    function test_onReport_storesAttestation() public {
        bytes memory report = abi.encode(
            uint8(0), "transfer-123", keccak256("test-data"), uint256(1700000000), '{"amount":"100.00"}'
        );
        vm.prank(FORWARDER);
        attestation.onReport(EMPTY_METADATA, report);
        assertEq(attestation.attestationCount(), 1);
    }

    function test_onReport_revertsOnInvalidOpType() public {
        bytes memory report = abi.encode(
            uint8(99), "entity-1", keccak256("data"), uint256(1700000000), ""
        );
        vm.prank(FORWARDER);
        vm.expectRevert();
        attestation.onReport(EMPTY_METADATA, report);
    }
}
