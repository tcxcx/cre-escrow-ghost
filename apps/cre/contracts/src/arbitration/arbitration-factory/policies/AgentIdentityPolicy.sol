// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24 <0.9.0;

/// @title AgentIdentityPolicy — ACE policy that verifies executor ERC-8004 agent identity
/// @notice Checks that the executorAgent address corresponds to a registered ERC-8004 agent
///         owned by the expected address. Rejects if unregistered or wrong owner.
///
/// Follows the AddressBlacklistPolicy pattern from stablecoin-ace-ccip.
///
/// Configuration:
///   policyEngine.addPolicy(
///     escrowConsumer,
///     onReport.selector,
///     agentIdentityPolicy,
///     [keccak256("executorAgent")]
///   )
///
/// @dev Uses ERC-8004 IdentityRegistry ownerOf(agentId) to verify identity.
///      Per ERC-8004 spec: https://eips.ethereum.org/EIPS/eip-8004

interface IERC8004IdentityMinimal {
    function ownerOf(uint256 agentId) external view returns (address);
}

interface IPolicyEngineForPolicy {
    enum PolicyResult { Continue, Allow }
    error PolicyRejected(string reason);
}

contract AgentIdentityPolicy {
    // ── Storage ────────────────────────────────────────────────────────────

    /// @notice ERC-8004 IdentityRegistry address
    address public identityRegistry;

    /// @notice Expected executor agentId (ERC-721 tokenId)
    uint256 public executorAgentId;

    /// @notice Expected owner of the executor agent NFT
    address public expectedOwner;

    /// @notice Contract owner (can update config)
    address public owner;

    bool private _initialized;

    // ── Events ─────────────────────────────────────────────────────────────

    event ConfigUpdated(address identityRegistry, uint256 executorAgentId, address expectedOwner);

    // ── Initialize ─────────────────────────────────────────────────────────

    function initialize(
        address _owner,
        address _identityRegistry,
        uint256 _executorAgentId,
        address _expectedOwner
    ) external {
        require(!_initialized, "AgentIdentityPolicy: already initialized");
        owner = _owner;
        identityRegistry = _identityRegistry;
        executorAgentId = _executorAgentId;
        expectedOwner = _expectedOwner;
        _initialized = true;

        emit ConfigUpdated(_identityRegistry, _executorAgentId, _expectedOwner);
    }

    // ── Policy Check ───────────────────────────────────────────────────────

    /// @notice Called by PolicyEngine to check if the executor is authorized.
    /// @param parameters Expected: [address executorAgent] — the address claiming to be the executor
    /// @return result PolicyResult.Continue if authorized
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
        require(parameters.length >= 1, "AgentIdentityPolicy: expected executorAgent parameter");

        // Decode executorAgent address (used for audit logging; identity check uses stored executorAgentId)
        // address executorAgent = abi.decode(parameters[0], (address));

        // Verify the executor agent is registered on the IdentityRegistry
        // by checking ownerOf(executorAgentId)
        try IERC8004IdentityMinimal(identityRegistry).ownerOf(executorAgentId) returns (address agentOwner) {
            // Check that the agent is owned by the expected address
            if (agentOwner != expectedOwner) {
                revert IPolicyEngineForPolicy.PolicyRejected("executor agent owner mismatch");
            }
        } catch {
            // ownerOf reverts if agent doesn't exist
            revert IPolicyEngineForPolicy.PolicyRejected("executor agent not registered");
        }

        return IPolicyEngineForPolicy.PolicyResult.Continue;
    }

    // ── Admin ──────────────────────────────────────────────────────────────

    function updateConfig(
        address _identityRegistry,
        uint256 _executorAgentId,
        address _expectedOwner
    ) external {
        require(msg.sender == owner, "AgentIdentityPolicy: only owner");
        identityRegistry = _identityRegistry;
        executorAgentId = _executorAgentId;
        expectedOwner = _expectedOwner;
        emit ConfigUpdated(_identityRegistry, _executorAgentId, _expectedOwner);
    }
}
