// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24 <0.9.0;

/// @title EscrowExtractor — ACE parameter extractor for escrow operations
/// @notice Follows the UnifiedExtractor pattern from stablecoin-ace-ccip.
///         Decodes onReport(bytes metadata, bytes report) calldata and extracts
///         named parameters for policy evaluation by the PolicyEngine.
///
/// Report format:
///   (uint8 actionType, uint256 milestoneIndex, address executorAgent, uint256 payeeBps, bytes32 receiptHash)
///
/// actionType values:
///   1 = FUND         — fund a milestone
///   2 = LOCK         — lock milestone for dispute
///   3 = SET_DECISION — record arbitration decision
///   4 = EXECUTE      — execute the decision (distribute funds)
///   5 = STATUS       — update milestone status
///
/// @dev Parameter keys use keccak256 convention per ACE standard.
///      Configure via: policyEngine.setExtractor(onReport.selector, escrowExtractor)
interface IPolicyEngine {
    struct Payload {
        address target;
        bytes4 selector;
        bytes data;
    }

    struct Parameter {
        bytes32 name;
        bytes value;
    }

    enum PolicyResult { Continue, Allow }
}

interface IExtractor {
    function extract(IPolicyEngine.Payload memory payload) external pure returns (IPolicyEngine.Parameter[] memory);
}

contract EscrowExtractor is IExtractor {
    /// @notice Parameter keys (ACE convention: keccak256 of human-readable name)
    bytes32 public constant PARAM_ACTION_TYPE = keccak256("actionType");
    bytes32 public constant PARAM_MILESTONE_INDEX = keccak256("milestoneIndex");
    bytes32 public constant PARAM_EXECUTOR_AGENT = keccak256("executorAgent");
    bytes32 public constant PARAM_PAYEE_BPS = keccak256("payeeBps");
    bytes32 public constant PARAM_RECEIPT_HASH = keccak256("receiptHash");

    /// @notice Action type constants
    uint8 public constant ACTION_FUND = 1;
    uint8 public constant ACTION_LOCK = 2;
    uint8 public constant ACTION_SET_DECISION = 3;
    uint8 public constant ACTION_EXECUTE = 4;
    uint8 public constant ACTION_STATUS = 5;

    /// @notice Extract parameters from onReport(bytes metadata, bytes report) calls.
    /// @param payload The transaction payload from PolicyEngine.
    /// @return parameters Array of extracted parameters with standardized names.
    function extract(IPolicyEngine.Payload memory payload)
        external
        pure
        returns (IPolicyEngine.Parameter[] memory)
    {
        // Decode onReport parameters: (bytes metadata, bytes report)
        (, bytes memory report) = abi.decode(payload.data, (bytes, bytes));

        // Decode the report — all action types use the same 5-field format
        (
            uint8 actionType,
            uint256 milestoneIndex,
            address executorAgent,
            uint256 payeeBps,
            bytes32 receiptHash
        ) = abi.decode(report, (uint8, uint256, address, uint256, bytes32));

        // Return 5 parameters for all escrow operations
        IPolicyEngine.Parameter[] memory parameters = new IPolicyEngine.Parameter[](5);

        parameters[0] = IPolicyEngine.Parameter({
            name: PARAM_ACTION_TYPE,
            value: abi.encode(actionType)
        });

        parameters[1] = IPolicyEngine.Parameter({
            name: PARAM_MILESTONE_INDEX,
            value: abi.encode(milestoneIndex)
        });

        parameters[2] = IPolicyEngine.Parameter({
            name: PARAM_EXECUTOR_AGENT,
            value: abi.encode(executorAgent)
        });

        parameters[3] = IPolicyEngine.Parameter({
            name: PARAM_PAYEE_BPS,
            value: abi.encode(payeeBps)
        });

        parameters[4] = IPolicyEngine.Parameter({
            name: PARAM_RECEIPT_HASH,
            value: abi.encode(receiptHash)
        });

        return parameters;
    }
}
