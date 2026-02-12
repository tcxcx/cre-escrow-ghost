// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.28;

/// @notice ERC-8004 Identity Registry interface.
/// An ERC-721 based registry where AI agents register on-chain identities.
/// Each agent is identified by a tokenId (agentId) and an agentURI pointing
/// to a registration file describing capabilities, endpoints, and trust models.
interface IERC8004Identity {
    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
    event MetadataSet(
        uint256 indexed agentId,
        string indexed indexedMetadataKey,
        string metadataKey,
        bytes metadataValue
    );

    /// @notice Register a new agent with a URI and optional metadata.
    function register(
        string calldata agentURI,
        MetadataEntry[] calldata metadata
    ) external returns (uint256 agentId);

    /// @notice Register a new agent with a URI.
    function register(string calldata agentURI) external returns (uint256 agentId);

    /// @notice Register a new agent (URI added later).
    function register() external returns (uint256 agentId);

    /// @notice Update an agent's URI.
    function setAgentURI(uint256 agentId, string calldata newURI) external;

    /// @notice Get an agent's on-chain metadata.
    function getMetadata(
        uint256 agentId,
        string memory metadataKey
    ) external view returns (bytes memory);

    /// @notice Set an agent's on-chain metadata.
    function setMetadata(
        uint256 agentId,
        string memory metadataKey,
        bytes memory metadataValue
    ) external;

    /// @notice Set the agent's verified wallet address.
    function setAgentWallet(
        uint256 agentId,
        address newWallet,
        uint256 deadline,
        bytes calldata signature
    ) external;

    /// @notice Get the agent's verified wallet address.
    function getAgentWallet(uint256 agentId) external view returns (address);

    /// @notice Clear the agent's wallet.
    function unsetAgentWallet(uint256 agentId) external;

    /// @notice Standard ERC-721 ownerOf.
    function ownerOf(uint256 tokenId) external view returns (address);
}
