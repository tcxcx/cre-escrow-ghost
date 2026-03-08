// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReceiverTemplate} from "./cre-receiver/ReceiverTemplate.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BUAttestation
 * @notice Receives CRE-signed reports via the Chainlink Forwarder and stores
 *         immutable attestation records on-chain.
 * @dev Inherits ReceiverTemplate (Ownable2Step + Forwarder + workflow identity)
 *      and Pausable (emergency circuit breaker).
 *
 *      Security features:
 *        - Forwarder-only access control (ReceiverTemplate)
 *        - Workflow identity validation (ReceiverTemplate)
 *        - Emergency pause/unpause (Pausable)
 *        - Per-OpType rate limiting (minInterval)
 *        - Per-OpType attestation expiry (TTL)
 *        - Severity-tagged events for off-chain alerting
 *        - Pauser role for instant emergency stop (bypasses timelock)
 */
contract BUAttestation is ReceiverTemplate, Pausable {
    // ========================================================================
    // Types
    // ========================================================================

    enum OpType {
        TRANSFER_VERIFY,     // 0
        BALANCE_ATTEST,      // 1
        INVOICE_SETTLE,      // 2
        FEE_RECONCILE,       // 3
        RAMP_VERIFY,         // 4
        REPORT_VERIFY,       // 5
        PAYROLL_ATTEST,      // 6
        KYC_VERIFIED,        // 7
        KYB_VERIFIED,        // 8
        PROOF_OF_RESERVES,   // 9
        USDG_SUPPLY_SNAPSHOT, // 10
        ESCROW_VERIFY,       // 11
        ESCROW_DISPUTE,      // 12
        ESCROW_YIELD_DEPOSIT,// 13
        ESCROW_YIELD_REDEEM, // 14
        ESCROW_FINALIZE,     // 15
        GHOST_DEPOSIT,       // 16
        GHOST_TRANSFER,      // 17
        GHOST_WITHDRAW       // 18
    }

    enum Severity {
        INFO,     // 0
        WARNING,  // 1
        CRITICAL  // 2
    }

    struct Attestation {
        OpType operationType;
        string entityId;
        bytes32 dataHash;
        uint256 timestamp;
        uint256 expiresAt;
        string metadata;
        address attestor;
    }

    // ========================================================================
    // State
    // ========================================================================

    mapping(bytes32 => Attestation) public attestations;
    uint256 public attestationCount;

    // Rate limiting (per-OpType)
    mapping(uint8 => uint256) public minInterval;
    mapping(uint8 => uint256) public lastAttestedAt;

    // TTL (per-OpType)
    mapping(uint8 => uint256) public ttlByOpType;

    // Severity (per-OpType)
    mapping(uint8 => Severity) public severityByOpType;

    // Pauser — can pause instantly, bypassing timelock
    address public pauser;

    // ========================================================================
    // Events
    // ========================================================================

    event AttestationRecorded(
        bytes32 indexed id,
        OpType indexed operationType,
        Severity indexed severity,
        string entityId,
        bytes32 dataHash,
        uint256 timestamp,
        uint256 expiresAt
    );

    event PauserUpdated(address indexed previousPauser, address indexed newPauser);

    // ========================================================================
    // Errors
    // ========================================================================

    error AttestationAlreadyExists(bytes32 id);
    error InvalidOperationType(uint8 opType);
    error RateLimited(uint8 opType, uint256 nextAllowedAt);
    error NotPauser();

    // ========================================================================
    // Constructor
    // ========================================================================

    constructor(
        address _forwarderAddress
    ) ReceiverTemplate(_forwarderAddress) {}

    // ========================================================================
    // CRE Report Processing
    // ========================================================================

    function _processReport(
        bytes calldata report
    ) internal override whenNotPaused {
        (
            uint8 opType,
            string memory entityId,
            bytes32 dataHash,
            uint256 timestamp,
            string memory metadata
        ) = abi.decode(report, (uint8, string, bytes32, uint256, string));

        if (opType > uint8(type(OpType).max)) {
            revert InvalidOperationType(opType);
        }

        // Rate limiting check
        uint256 interval = minInterval[opType];
        if (interval > 0) {
            uint256 nextAllowed = lastAttestedAt[opType] + interval;
            if (block.timestamp < nextAllowed) {
                revert RateLimited(opType, nextAllowed);
            }
        }

        bytes32 attestationId = keccak256(abi.encodePacked(opType, entityId, timestamp));

        if (attestations[attestationId].timestamp != 0) {
            revert AttestationAlreadyExists(attestationId);
        }

        // Compute expiry
        uint256 ttl = ttlByOpType[opType];
        uint256 expiresAt = ttl > 0 ? timestamp + ttl : 0;

        attestations[attestationId] = Attestation({
            operationType: OpType(opType),
            entityId: entityId,
            dataHash: dataHash,
            timestamp: timestamp,
            expiresAt: expiresAt,
            metadata: metadata,
            attestor: msg.sender
        });

        attestationCount++;
        lastAttestedAt[opType] = block.timestamp;

        emit AttestationRecorded(
            attestationId,
            OpType(opType),
            severityByOpType[opType],
            entityId,
            dataHash,
            timestamp,
            expiresAt
        );
    }

    // ========================================================================
    // View Functions
    // ========================================================================

    function verifyAttestation(bytes32 attestationId, bytes32 expectedDataHash) external view returns (bool) {
        Attestation storage a = attestations[attestationId];
        return a.timestamp != 0
            && a.dataHash == expectedDataHash
            && (a.expiresAt == 0 || block.timestamp < a.expiresAt);
    }

    function attestationExists(bytes32 attestationId) external view returns (bool) {
        return attestations[attestationId].timestamp != 0;
    }

    function isAttestationExpired(bytes32 attestationId) external view returns (bool) {
        Attestation storage a = attestations[attestationId];
        if (a.timestamp == 0) return false;
        return a.expiresAt != 0 && block.timestamp >= a.expiresAt;
    }

    // ========================================================================
    // Admin Functions
    // ========================================================================

    function setMinInterval(uint8 opType, uint256 seconds_) external onlyOwner {
        minInterval[opType] = seconds_;
    }

    function setTTL(uint8 opType, uint256 seconds_) external onlyOwner {
        ttlByOpType[opType] = seconds_;
    }

    function setSeverity(uint8 opType, Severity severity) external onlyOwner {
        severityByOpType[opType] = severity;
    }

    function setPauser(address _pauser) external onlyOwner {
        address prev = pauser;
        pauser = _pauser;
        emit PauserUpdated(prev, _pauser);
    }

    /// @notice Pause — callable by pauser (instant) or owner (timelock)
    function pause() external {
        if (msg.sender != pauser && msg.sender != owner()) {
            revert NotPauser();
        }
        _pause();
    }

    /// @notice Unpause — only owner (requires timelock in production)
    function unpause() external onlyOwner {
        _unpause();
    }
}
