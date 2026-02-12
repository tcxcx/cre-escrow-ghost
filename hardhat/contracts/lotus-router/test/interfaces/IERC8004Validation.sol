// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.28;

/// @notice ERC-8004 Validation Registry interface.
/// Enables agents to request verification of their work and allows validator
/// smart contracts (stake-secured re-execution, zkML, TEE oracles) to provide
/// responses tracked on-chain.
interface IERC8004Validation {
    event ValidationRequest(
        address indexed validatorAddress,
        uint256 indexed agentId,
        string requestURI,
        bytes32 indexed requestHash
    );

    event ValidationResponse(
        address indexed validatorAddress,
        uint256 indexed agentId,
        bytes32 indexed requestHash,
        uint8 response,
        string responseURI,
        bytes32 responseHash,
        string tag
    );

    /// @notice Get the Identity Registry address.
    function getIdentityRegistry() external view returns (address identityRegistry);

    /// @notice Request validation of agent work.
    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestURI,
        bytes32 requestHash
    ) external;

    /// @notice Respond to a validation request (0-100 score).
    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external;

    /// @notice Get the status of a validation request.
    function getValidationStatus(bytes32 requestHash)
        external
        view
        returns (
            address validatorAddress,
            uint256 agentId,
            uint8 response,
            bytes32 responseHash,
            string memory tag,
            uint256 lastUpdate
        );

    /// @notice Get aggregated validation statistics for an agent.
    function getSummary(
        uint256 agentId,
        address[] calldata validatorAddresses,
        string calldata tag
    ) external view returns (uint64 count, uint8 averageResponse);

    /// @notice Get all validation request hashes for an agent.
    function getAgentValidations(uint256 agentId)
        external
        view
        returns (bytes32[] memory requestHashes);

    /// @notice Get all request hashes assigned to a validator.
    function getValidatorRequests(address validatorAddress)
        external
        view
        returns (bytes32[] memory requestHashes);
}
