// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24 <0.9.0;

import {IEscrowWithAgentV3} from "../IEscrowWithAgentV3.sol";

/// @title DisputeWindowPolicy — ACE policy enforcing dispute window timing constraints
/// @notice For EXECUTE actions: checks that dispute window has expired.
///         For LOCK actions: checks that dispute window is still open.
///
/// Configuration:
///   policyEngine.addPolicy(
///     escrowConsumer,
///     onReport.selector,
///     disputeWindowPolicy,
///     [keccak256("milestoneIndex"), keccak256("actionType")]
///   )

interface IPolicyEngineForPolicy {
    enum PolicyResult { Continue, Allow }
    error PolicyRejected(string reason);
}

contract DisputeWindowPolicy {
    // ── Storage ────────────────────────────────────────────────────────────

    /// @notice Escrow contract to read milestone state from
    address public escrowContract;
    address public owner;
    bool private _initialized;

    // Action type constants (match EscrowExtractor)
    uint8 constant ACTION_LOCK = 2;
    uint8 constant ACTION_EXECUTE = 4;

    // ── Initialize ─────────────────────────────────────────────────────────

    function initialize(address _owner, address _escrowContract) external {
        require(!_initialized, "DisputeWindowPolicy: already initialized");
        owner = _owner;
        escrowContract = _escrowContract;
        _initialized = true;
    }

    // ── Policy Check ───────────────────────────────────────────────────────

    /// @notice Check timing constraints for escrow operations.
    /// @param parameters Expected: [uint256 milestoneIndex, uint8 actionType]
    function run(
        address, /* caller */
        address, /* subject */
        bytes4,  /* selector */
        bytes[] calldata parameters,
        bytes calldata /* context */
    )
        external
        view
        returns (IPolicyEngineForPolicy.PolicyResult)
    {
        require(parameters.length >= 2, "DisputeWindowPolicy: need milestoneIndex + actionType");

        uint256 milestoneIndex = abi.decode(parameters[0], (uint256));
        uint8 actionType = abi.decode(parameters[1], (uint8));

        // Only enforce for LOCK and EXECUTE actions
        if (actionType != ACTION_LOCK && actionType != ACTION_EXECUTE) {
            return IPolicyEngineForPolicy.PolicyResult.Continue;
        }

        // Read milestone from escrow
        IEscrowWithAgentV3.Milestone memory ms = IEscrowWithAgentV3(escrowContract).getMilestone(milestoneIndex);

        if (actionType == ACTION_EXECUTE) {
            // EXECUTE: dispute window must have expired (or no window set = direct execution)
            if (ms.disputeWindowEnd > 0 && block.timestamp < ms.disputeWindowEnd) {
                revert IPolicyEngineForPolicy.PolicyRejected("dispute window still open");
            }
        }

        if (actionType == ACTION_LOCK) {
            // LOCK: dispute window must still be open (if set)
            if (ms.disputeWindowEnd > 0 && block.timestamp >= ms.disputeWindowEnd) {
                revert IPolicyEngineForPolicy.PolicyRejected("dispute window expired");
            }
        }

        return IPolicyEngineForPolicy.PolicyResult.Continue;
    }

    // ── Admin ──────────────────────────────────────────────────────────────

    function setEscrowContract(address _escrowContract) external {
        require(msg.sender == owner, "DisputeWindowPolicy: only owner");
        escrowContract = _escrowContract;
    }
}
