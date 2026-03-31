// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {EscrowWithAgentV3} from "./EscrowWithAgentV3.sol";

/**
 * @title EscrowFactoryV3
 * @notice Deploys EscrowWithAgentV3 instances.
 *         Constructor: (policyEngine, attestation, executorAgent).
 *         createEscrow encodes: (agreementHash, payer, payee, token, totalAmount, milestoneAmounts, milestoneDescriptions).
 */
contract EscrowFactoryV3 {
    // ── State ───────────────────────────────────────────────────
    address public policyEngine;
    address public attestation;
    address public executorAgent;
    uint256 public escrowCount;

    mapping(uint256 => address) public escrows;

    // ── Events ──────────────────────────────────────────────────
    event EscrowCreated(uint256 indexed escrowIndex, address escrowAddress, bytes32 agreementHash);

    // ── Constructor ─────────────────────────────────────────────
    constructor(address _policyEngine, address _attestation, address _executorAgent) {
        policyEngine = _policyEngine;
        attestation = _attestation;
        executorAgent = _executorAgent;
    }

    // ── Factory ─────────────────────────────────────────────────
    function createEscrow(
        bytes32 agreementHash,
        address _payer,
        address _payee,
        address _token,
        uint256 _totalAmount,
        uint256[] calldata _milestoneAmounts,
        string[] calldata _milestoneDescriptions
    ) external returns (address) {
        EscrowWithAgentV3 escrow = new EscrowWithAgentV3(
            _payer,
            _payee,
            _token,
            _totalAmount,
            executorAgent,
            _milestoneAmounts,
            _milestoneDescriptions,
            agreementHash
        );

        uint256 index = escrowCount;
        escrows[index] = address(escrow);
        escrowCount = index + 1;

        emit EscrowCreated(index, address(escrow), agreementHash);
        return address(escrow);
    }
}
