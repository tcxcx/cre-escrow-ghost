// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BUAttestation.sol";

contract BUAttestationTest is Test {
    BUAttestation public attestation;
    address constant FORWARDER = address(0xf04A00de00000000000000000000000000000001);

    // Dummy metadata (workflowId=0, workflowName=0, workflowOwner=address(0))
    // ReceiverTemplate only validates metadata fields when they're configured via setters.
    // With no expected values set, any metadata passes.
    bytes constant EMPTY_METADATA = abi.encodePacked(bytes32(0), bytes10(0), address(0));

    function setUp() public {
        attestation = new BUAttestation(FORWARDER);
    }

    function _callOnReport(bytes memory report) internal {
        vm.prank(FORWARDER);
        attestation.onReport(EMPTY_METADATA, report);
    }

    function test_onReport_storesAttestation() public {
        bytes memory report = abi.encode(
            uint8(0), // TRANSFER_VERIFY
            "transfer-123",
            keccak256("test-data"),
            uint256(1700000000),
            '{"amount":"100.00"}'
        );

        _callOnReport(report);

        assertEq(attestation.attestationCount(), 1);
    }

    function test_verifyAttestation_returnsTrueForMatch() public {
        bytes32 dataHash = keccak256("test-data");
        uint256 timestamp = 1700000000;

        bytes memory report = abi.encode(
            uint8(0),
            "transfer-123",
            dataHash,
            timestamp,
            ""
        );

        _callOnReport(report);

        bytes32 attestationId = keccak256(abi.encodePacked(uint8(0), "transfer-123", timestamp));
        assertTrue(attestation.verifyAttestation(attestationId, dataHash));
    }

    function test_verifyAttestation_returnsFalseForMismatch() public {
        bytes memory report = abi.encode(
            uint8(0),
            "transfer-123",
            keccak256("test-data"),
            uint256(1700000000),
            ""
        );

        _callOnReport(report);

        bytes32 attestationId = keccak256(abi.encodePacked(uint8(0), "transfer-123", uint256(1700000000)));
        assertFalse(attestation.verifyAttestation(attestationId, keccak256("wrong-data")));
    }

    function test_onReport_revertsOnDuplicate() public {
        bytes memory report = abi.encode(
            uint8(0),
            "transfer-123",
            keccak256("test-data"),
            uint256(1700000000),
            ""
        );

        _callOnReport(report);

        vm.prank(FORWARDER);
        vm.expectRevert();
        attestation.onReport(EMPTY_METADATA, report);
    }

    function test_onReport_storesReportVerifyAttestation() public {
        bytes memory report = abi.encode(
            uint8(5), // REPORT_VERIFY
            "report-456",
            keccak256("report-data"),
            uint256(1700000000),
            '{"reportNumber":"R-001"}'
        );

        _callOnReport(report);

        assertEq(attestation.attestationCount(), 1);

        bytes32 attestationId = keccak256(abi.encodePacked(uint8(5), "report-456", uint256(1700000000)));
        assertTrue(attestation.attestationExists(attestationId));
    }

    function test_onReport_storesPayrollAttestAttestation() public {
        bytes memory report = abi.encode(
            uint8(6), // PAYROLL_ATTEST
            "payroll-789",
            keccak256("payroll-data"),
            uint256(1700000000),
            '{"payrollName":"Jan 2026"}'
        );

        _callOnReport(report);

        assertEq(attestation.attestationCount(), 1);

        bytes32 attestationId = keccak256(abi.encodePacked(uint8(6), "payroll-789", uint256(1700000000)));
        assertTrue(attestation.attestationExists(attestationId));
    }

    function test_onReport_revertsOnInvalidOpType() public {
        bytes memory report = abi.encode(
            uint8(99), // Invalid
            "entity-1",
            keccak256("data"),
            uint256(1700000000),
            ""
        );

        vm.prank(FORWARDER);
        vm.expectRevert();
        attestation.onReport(EMPTY_METADATA, report);
    }

    // ========================================================================
    // Security Tests — ReceiverTemplate integration
    // ========================================================================

    function test_onReport_revertsFromNonForwarder() public {
        bytes memory report = abi.encode(
            uint8(0), "entity-1", keccak256("data"), uint256(1700000000), ""
        );

        // Call from a random address (not the forwarder)
        vm.prank(address(0xBAD));
        vm.expectRevert();
        attestation.onReport(EMPTY_METADATA, report);
    }

    function test_supportsInterface_IReceiver() public view {
        // IReceiver interface ID = bytes4(keccak256("onReport(bytes,bytes)"))
        bytes4 iReceiverId = bytes4(keccak256("onReport(bytes,bytes)"));
        assertTrue(attestation.supportsInterface(iReceiverId));
    }

    function test_supportsInterface_IERC165() public view {
        // ERC-165 interface ID
        bytes4 ierc165Id = 0x01ffc9a7;
        assertTrue(attestation.supportsInterface(ierc165Id));
    }

    function test_getForwarderAddress() public view {
        assertEq(attestation.getForwarderAddress(), FORWARDER);
    }

    function test_setExpectedWorkflowId_restrictsReports() public {
        bytes32 goodId = bytes32(uint256(42));
        bytes32 badId = bytes32(uint256(99));

        attestation.setExpectedWorkflowId(goodId);

        // Metadata with wrong workflow ID should revert
        bytes memory badMetadata = abi.encodePacked(badId, bytes10(0), address(0));
        bytes memory report = abi.encode(
            uint8(0), "entity-1", keccak256("data"), uint256(1700000000), ""
        );

        vm.prank(FORWARDER);
        vm.expectRevert();
        attestation.onReport(badMetadata, report);

        // Metadata with correct workflow ID should succeed
        bytes memory goodMetadata = abi.encodePacked(goodId, bytes10(0), address(0));
        vm.prank(FORWARDER);
        attestation.onReport(goodMetadata, report);
        assertEq(attestation.attestationCount(), 1);
    }
}
