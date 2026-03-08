// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24 <0.9.0;

/// @title IEscrowWithAgentV3 — Interface for milestone-based escrow with split payouts
/// @notice Supports per-milestone funding, dispute locks, split decisions, and receipt anchoring.
///         Execution is gated by CRE executor agent via ACE PolicyEngine.
interface IEscrowWithAgentV3 {
    // ── Enums ──────────────────────────────────────────────────────────────

    enum MilestoneStatus {
        PENDING,        // Not yet funded
        FUNDED,         // Funded, awaiting submission
        SUBMITTED,      // Deliverable submitted
        VERIFYING,      // AI verification in progress
        APPROVED,       // Verified, dispute window open
        REJECTED,       // Verification failed (may retry)
        DISPUTED,       // Locked for arbitration
        RELEASED,       // Funds distributed
        CANCELLED       // Cancelled/reverted
    }

    // ── Structs ────────────────────────────────────────────────────────────

    struct Milestone {
        uint256 amount;         // Total escrowed for this milestone (6-decimal USDC/EURC)
        uint256 released;       // Total released so far
        bool funded;
        bool locked;            // Locked during dispute
        MilestoneStatus status;
        uint256 disputeWindowEnd;
        bytes32 finalReceiptHash;
    }

    struct Payout {
        address to;
        uint256 amount;
    }

    struct FeeConfig {
        uint16 protocolFeeBps;  // e.g., 50 = 0.5%
        address protocolFeeRecipient;
    }

    struct AgentConfig {
        address identityRegistry;   // ERC-8004 IdentityRegistry address
        uint256 executorAgentId;    // CRE executor's ERC-721 agentId
    }

    struct WindowConfig {
        uint32 disputeWindowSeconds;
        uint32 appealWindowSeconds;
    }

    // ── Events ─────────────────────────────────────────────────────────────

    event MilestoneFunded(uint256 indexed milestoneIndex, uint256 amount);
    event MilestoneLocked(uint256 indexed milestoneIndex, bytes32 disputeHash);
    event MilestoneStatusChanged(uint256 indexed milestoneIndex, MilestoneStatus newStatus);
    event DecisionSet(uint256 indexed milestoneIndex, uint16 payeeBps, bytes32 finalReceiptHash);
    event DecisionExecuted(uint256 indexed milestoneIndex, uint256 payeeAmount, uint256 payerAmount);
    event DisputeWindowStarted(uint256 indexed milestoneIndex, uint256 windowEnd);

    // ── Functions ──────────────────────────────────────────────────────────

    function initialize(
        address payer,
        address payee,
        address token,
        FeeConfig calldata fees,
        AgentConfig calldata agents,
        WindowConfig calldata windows,
        uint256[] calldata milestoneAmounts
    ) external;

    function fundMilestone(uint256 milestoneIndex) external;
    function lockMilestone(uint256 milestoneIndex, bytes32 disputeHash) external;
    function setMilestoneStatus(uint256 milestoneIndex, MilestoneStatus newStatus) external;

    function setDecision(
        uint256 milestoneIndex,
        uint16 payeeBps,
        Payout[] calldata extraPayouts,
        bytes32 finalReceiptHash
    ) external;

    function executeDecision(uint256 milestoneIndex) external;

    // ── Views ──────────────────────────────────────────────────────────────

    function getMilestone(uint256 milestoneIndex) external view returns (Milestone memory);
    function getMilestoneCount() external view returns (uint256);
    function getPayer() external view returns (address);
    function getPayee() external view returns (address);
    function getToken() external view returns (address);
}
