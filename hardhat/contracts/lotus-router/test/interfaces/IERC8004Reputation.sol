// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.28;

/// @notice ERC-8004 Reputation Registry interface.
/// A standard interface for posting and fetching feedback signals about agents.
/// Scoring and aggregation occur both on-chain (composability) and off-chain
/// (sophisticated algorithms).
interface IERC8004Reputation {
    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string indexed indexedTag1,
        string tag1,
        string tag2,
        string endpoint,
        string feedbackURI,
        bytes32 feedbackHash
    );

    event FeedbackRevoked(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 indexed feedbackIndex
    );

    event ResponseAppended(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        address indexed responder,
        string responseURI,
        bytes32 responseHash
    );

    /// @notice Get the Identity Registry address.
    function getIdentityRegistry() external view returns (address identityRegistry);

    /// @notice Give feedback to an agent.
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external;

    /// @notice Revoke previously given feedback.
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external;

    /// @notice Append a response to existing feedback.
    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseURI,
        bytes32 responseHash
    ) external;

    /// @notice Get aggregated feedback summary.
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2
    ) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals);

    /// @notice Read a specific feedback entry.
    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex
    )
        external
        view
        returns (int128 value, uint8 valueDecimals, string memory tag1, string memory tag2, bool isRevoked);

    /// @notice Get all client addresses that gave feedback to an agent.
    function getClients(uint256 agentId) external view returns (address[] memory);

    /// @notice Get the last feedback index for a client-agent pair.
    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64);
}
