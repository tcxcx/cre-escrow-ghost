// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24 <0.9.0;

/// @title IEscrowWithAgentV3 — Interface for milestone-based escrow with split payouts
/// @notice Supports per-milestone funding, dispute locks, split decisions, receipt anchoring,
///         appeal bond economics, and on-chain verdict storage.
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

    struct BondConfig {
        uint256 disputeBondAmount;   // Bond required to file a dispute
        uint256 appealBondAmount;    // Bond required to appeal (must be > disputeBondAmount)
        address bondRecipient;       // Where forfeited bonds go (protocol treasury)
    }

    struct VerdictRecord {
        uint8 layer;              // 1=Verifier, 2=Advocates, 3=Tribunal, 4=SupremeCourt
        bytes32 verdictHash;      // keccak256 of encrypted verdict content
        uint16 payeeBps;          // Verdict's recommended split
        uint256 timestamp;        // Block timestamp when recorded
        bool appealed;            // Whether this verdict was appealed
    }

    // ── Events ─────────────────────────────────────────────────────────────

    event MilestoneFunded(uint256 indexed milestoneIndex, uint256 amount);
    event MilestoneLocked(uint256 indexed milestoneIndex, bytes32 disputeHash);
    event MilestoneStatusChanged(uint256 indexed milestoneIndex, MilestoneStatus newStatus);
    event DecisionSet(uint256 indexed milestoneIndex, uint16 payeeBps, bytes32 finalReceiptHash);
    event DecisionExecuted(uint256 indexed milestoneIndex, uint256 payeeAmount, uint256 payerAmount);
    event DisputeWindowStarted(uint256 indexed milestoneIndex, uint256 windowEnd);
    event BondDeposited(uint256 indexed milestoneIndex, address indexed depositor, uint256 amount, bool isAppeal);
    event BondForfeited(uint256 indexed milestoneIndex, address indexed depositor, uint256 amount, address recipient);
    event BondRefunded(uint256 indexed milestoneIndex, address indexed depositor, uint256 amount);
    event VerdictRecorded(uint256 indexed milestoneIndex, uint8 layer, bytes32 verdictHash, uint16 payeeBps);

    // ── Functions ──────────────────────────────────────────────────────────

    function initialize(
        address payer,
        address payee,
        address token,
        FeeConfig calldata fees,
        AgentConfig calldata agents,
        WindowConfig calldata windows,
        BondConfig calldata _bondConfig,
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

    function disputeWithBond(uint256 milestoneIndex, bytes32 disputeHash) external;
    function appealWithBond(uint256 milestoneIndex) external;
    function recordVerdict(uint256 milestoneIndex, uint8 layer, bytes32 verdictHash, uint16 payeeBps, bool appealed) external;

    // ── Views ──────────────────────────────────────────────────────────────

    function getMilestone(uint256 milestoneIndex) external view returns (Milestone memory);
    function getMilestoneCount() external view returns (uint256);
    function getPayer() external view returns (address);
    function getPayee() external view returns (address);
    function getToken() external view returns (address);
    function getVerdicts(uint256 milestoneIndex) external view returns (VerdictRecord[] memory);
    function getBonds(uint256 milestoneIndex) external view returns (uint256 count, uint256 totalBonded);
}
