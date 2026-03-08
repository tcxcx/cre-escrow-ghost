// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24 <0.9.0;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {EscrowWithAgentV3} from "./EscrowWithAgentV3.sol";
import {IEscrowWithAgentV3} from "./IEscrowWithAgentV3.sol";

/// @title EscrowFactoryV3 — Factory for deploying milestone-based escrow clones
/// @notice Deploys EIP-1167 minimal proxy clones of EscrowWithAgentV3.
///         Enforces a whitelist of accepted stablecoin tokens (USDC + EURC only).
contract EscrowFactoryV3 {
    using Clones for address;

    // ── Storage ────────────────────────────────────────────────────────────

    /// @notice The implementation contract that clones are based on
    address public immutable implementation;

    /// @notice Owner who can manage the token whitelist
    address public owner;

    /// @notice Whitelist of accepted ERC-20 tokens (USDC, EURC)
    mapping(address => bool) public acceptedTokens;

    /// @notice Mapping from agreementId to escrow clone address
    mapping(bytes32 => address) public escrows;

    /// @notice All deployed escrow addresses (for enumeration)
    address[] public allEscrows;

    // ── Events ─────────────────────────────────────────────────────────────

    event AgreementCreated(
        bytes32 indexed agreementId,
        address indexed escrowAddress,
        address indexed token,
        address payer,
        address payee,
        uint256 milestoneCount
    );

    event TokenWhitelisted(address indexed token, bool accepted);

    // ── Constructor ────────────────────────────────────────────────────────

    constructor(address _implementation, address[] memory _acceptedTokens) {
        require(_implementation != address(0), "Factory: zero implementation");
        implementation = _implementation;
        owner = msg.sender;

        for (uint256 i = 0; i < _acceptedTokens.length; i++) {
            acceptedTokens[_acceptedTokens[i]] = true;
            emit TokenWhitelisted(_acceptedTokens[i], true);
        }
    }

    // ── Create Agreement ───────────────────────────────────────────────────

    /// @notice Deploy a new escrow clone for an agreement
    /// @param agreementId Unique identifier for this agreement (e.g., keccak256 of agreement JSON hash)
    /// @param _payer Address of the payer (client)
    /// @param _payee Address of the payee (provider)
    /// @param _token USDC or EURC address (must be whitelisted)
    /// @param _fees Protocol fee configuration
    /// @param _agents CRE executor agent configuration
    /// @param _windows Dispute and appeal window durations
    /// @param milestoneAmounts Array of amounts per milestone (6-decimal stablecoin units)
    function createAgreement(
        bytes32 agreementId,
        address _payer,
        address _payee,
        address _token,
        IEscrowWithAgentV3.FeeConfig calldata _fees,
        IEscrowWithAgentV3.AgentConfig calldata _agents,
        IEscrowWithAgentV3.WindowConfig calldata _windows,
        uint256[] calldata milestoneAmounts
    ) external returns (address escrowAddress) {
        require(escrows[agreementId] == address(0), "Factory: agreement exists");
        require(acceptedTokens[_token], "Factory: token not accepted (USDC/EURC only)");
        require(_payer != address(0) && _payee != address(0), "Factory: zero address");
        require(milestoneAmounts.length > 0, "Factory: no milestones");

        // Deploy minimal proxy clone
        escrowAddress = implementation.clone();

        // Initialize the clone
        EscrowWithAgentV3(escrowAddress).initialize(
            _payer,
            _payee,
            _token,
            _fees,
            _agents,
            _windows,
            milestoneAmounts
        );

        // Store mapping
        escrows[agreementId] = escrowAddress;
        allEscrows.push(escrowAddress);

        emit AgreementCreated(
            agreementId,
            escrowAddress,
            _token,
            _payer,
            _payee,
            milestoneAmounts.length
        );
    }

    // ── Admin ──────────────────────────────────────────────────────────────

    function setTokenAccepted(address _token, bool _accepted) external {
        require(msg.sender == owner, "Factory: only owner");
        acceptedTokens[_token] = _accepted;
        emit TokenWhitelisted(_token, _accepted);
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Factory: only owner");
        require(newOwner != address(0), "Factory: zero owner");
        owner = newOwner;
    }

    // ── Views ──────────────────────────────────────────────────────────────

    function getEscrow(bytes32 agreementId) external view returns (address) {
        return escrows[agreementId];
    }

    function getEscrowCount() external view returns (uint256) {
        return allEscrows.length;
    }
}
