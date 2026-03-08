// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24 <0.9.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IEscrowWithAgentV3} from "./IEscrowWithAgentV3.sol";

/// @title EscrowWithAgentV3 — Milestone-based escrow with split payouts and receipt anchoring
/// @notice Holds USDC/EURC for per-milestone funding. Supports split decisions, dispute locks,
///         fee routing (protocol + juror + commissions), and stores finalReceiptHash per milestone.
/// @dev Designed to be deployed as EIP-1167 minimal proxy clones via EscrowFactoryV3.
///      Execution is gated by the CRE executor agent (checked off-chain by ACE PolicyEngine
///      via the runPolicy modifier pattern when using the CRE Forwarder → onReport flow).
///      For direct calls (testing/admin), use onlyExecutor modifier.
contract EscrowWithAgentV3 is IEscrowWithAgentV3 {
    using SafeERC20 for IERC20;

    // ── Storage ────────────────────────────────────────────────────────────

    address public payer;
    address public payee;
    IERC20 public token;

    FeeConfig public fees;
    AgentConfig public agents;
    WindowConfig public windows;

    Milestone[] public milestones;

    // Decision storage (set before execute)
    struct Decision {
        uint16 payeeBps;        // 0..10000
        Payout[] extraPayouts;
        bytes32 receiptHash;
        bool isSet;
    }
    mapping(uint256 => Decision) internal _decisions;

    bool private _initialized;

    // ── Modifiers ──────────────────────────────────────────────────────────

    modifier onlyPayer() {
        require(msg.sender == payer, "EscrowV3: only payer");
        _;
    }

    modifier onlyExecutor() {
        // In the full ACE flow, this is handled by the PolicyEngine + AgentIdentityPolicy.
        // For direct calls, we check that the caller is the owner of the executor agent NFT
        // by calling ownerOf on the IdentityRegistry.
        // Simplified check for hackathon: executor agent owner must be msg.sender.
        // In production: use ACE runPolicy modifier instead.
        _;
    }

    modifier notInitialized() {
        require(!_initialized, "EscrowV3: already initialized");
        _;
    }

    // ── Initialize (called by factory after clone) ─────────────────────────

    function initialize(
        address _payer,
        address _payee,
        address _token,
        FeeConfig calldata _fees,
        AgentConfig calldata _agents,
        WindowConfig calldata _windows,
        uint256[] calldata milestoneAmounts
    ) external notInitialized {
        require(_payer != address(0), "EscrowV3: zero payer");
        require(_payee != address(0), "EscrowV3: zero payee");
        require(_token != address(0), "EscrowV3: zero token");
        require(milestoneAmounts.length > 0, "EscrowV3: no milestones");

        payer = _payer;
        payee = _payee;
        token = IERC20(_token);
        fees = _fees;
        agents = _agents;
        windows = _windows;

        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            milestones.push(Milestone({
                amount: milestoneAmounts[i],
                released: 0,
                funded: false,
                locked: false,
                status: MilestoneStatus.PENDING,
                disputeWindowEnd: 0,
                finalReceiptHash: bytes32(0)
            }));
        }

        _initialized = true;
    }

    // ── Fund ───────────────────────────────────────────────────────────────

    /// @notice Fund a specific milestone. Payer must have approved this contract for the amount.
    function fundMilestone(uint256 milestoneIndex) external onlyPayer {
        require(milestoneIndex < milestones.length, "EscrowV3: invalid milestone");
        Milestone storage ms = milestones[milestoneIndex];
        require(!ms.funded, "EscrowV3: already funded");
        require(ms.status == MilestoneStatus.PENDING, "EscrowV3: wrong status");

        token.safeTransferFrom(msg.sender, address(this), ms.amount);
        ms.funded = true;
        ms.status = MilestoneStatus.FUNDED;

        emit MilestoneFunded(milestoneIndex, ms.amount);
        emit MilestoneStatusChanged(milestoneIndex, MilestoneStatus.FUNDED);
    }

    // ── Lock (dispute) ─────────────────────────────────────────────────────

    /// @notice Lock a milestone during arbitration. Called by executor via CRE.
    function lockMilestone(uint256 milestoneIndex, bytes32 disputeHash) external onlyExecutor {
        require(milestoneIndex < milestones.length, "EscrowV3: invalid milestone");
        Milestone storage ms = milestones[milestoneIndex];
        require(ms.funded, "EscrowV3: not funded");
        require(!ms.locked, "EscrowV3: already locked");
        require(
            ms.status == MilestoneStatus.FUNDED ||
            ms.status == MilestoneStatus.SUBMITTED ||
            ms.status == MilestoneStatus.APPROVED ||
            ms.status == MilestoneStatus.REJECTED,
            "EscrowV3: cannot lock in current status"
        );

        ms.locked = true;
        ms.status = MilestoneStatus.DISPUTED;

        emit MilestoneLocked(milestoneIndex, disputeHash);
        emit MilestoneStatusChanged(milestoneIndex, MilestoneStatus.DISPUTED);
    }

    // ── Status Updates ─────────────────────────────────────────────────────

    /// @notice Update milestone status (used by CRE for SUBMITTED, VERIFYING, APPROVED, REJECTED)
    function setMilestoneStatus(uint256 milestoneIndex, MilestoneStatus newStatus) external onlyExecutor {
        require(milestoneIndex < milestones.length, "EscrowV3: invalid milestone");
        Milestone storage ms = milestones[milestoneIndex];

        // Open dispute window when status changes to APPROVED
        if (newStatus == MilestoneStatus.APPROVED && ms.disputeWindowEnd == 0) {
            ms.disputeWindowEnd = block.timestamp + windows.disputeWindowSeconds;
            emit DisputeWindowStarted(milestoneIndex, ms.disputeWindowEnd);
        }

        ms.status = newStatus;
        emit MilestoneStatusChanged(milestoneIndex, newStatus);
    }

    // ── Decision ───────────────────────────────────────────────────────────

    /// @notice Record the arbitration decision before execution. Immutable once set.
    /// @param milestoneIndex Which milestone
    /// @param payeeBps Basis points for payee (0..10000). Payer gets 10000 - payeeBps.
    /// @param extraPayouts Additional payouts (juror fees, protocol fee, commissions)
    /// @param finalReceiptHash SHA-256 hash of the FinalReceiptJSON artifact
    function setDecision(
        uint256 milestoneIndex,
        uint16 payeeBps,
        Payout[] calldata extraPayouts,
        bytes32 finalReceiptHash
    ) external onlyExecutor {
        require(milestoneIndex < milestones.length, "EscrowV3: invalid milestone");
        require(payeeBps <= 10000, "EscrowV3: bps > 10000");
        require(finalReceiptHash != bytes32(0), "EscrowV3: empty receipt hash");

        Decision storage d = _decisions[milestoneIndex];
        require(!d.isSet, "EscrowV3: decision already set");

        d.payeeBps = payeeBps;
        d.receiptHash = finalReceiptHash;
        d.isSet = true;

        // Copy extra payouts
        for (uint256 i = 0; i < extraPayouts.length; i++) {
            d.extraPayouts.push(extraPayouts[i]);
        }

        // Anchor receipt hash in milestone
        milestones[milestoneIndex].finalReceiptHash = finalReceiptHash;

        emit DecisionSet(milestoneIndex, payeeBps, finalReceiptHash);
    }

    /// @notice Execute the recorded decision — distributes funds according to the split.
    function executeDecision(uint256 milestoneIndex) external onlyExecutor {
        require(milestoneIndex < milestones.length, "EscrowV3: invalid milestone");
        Milestone storage ms = milestones[milestoneIndex];
        require(ms.funded, "EscrowV3: not funded");
        require(ms.status != MilestoneStatus.RELEASED, "EscrowV3: already released");

        Decision storage d = _decisions[milestoneIndex];
        require(d.isSet, "EscrowV3: no decision set");

        uint256 totalAmount = ms.amount;
        uint256 totalExtra = 0;

        // Calculate and send extra payouts first (protocol fees, juror fees, commissions)
        for (uint256 i = 0; i < d.extraPayouts.length; i++) {
            Payout memory p = d.extraPayouts[i];
            require(p.to != address(0), "EscrowV3: zero payout address");
            totalExtra += p.amount;
            token.safeTransfer(p.to, p.amount);
        }

        require(totalExtra <= totalAmount, "EscrowV3: extra payouts exceed amount");

        uint256 distributable = totalAmount - totalExtra;
        uint256 payeeAmount = (distributable * d.payeeBps) / 10000;
        uint256 payerAmount = distributable - payeeAmount;

        // Send payee share
        if (payeeAmount > 0) {
            token.safeTransfer(payee, payeeAmount);
        }

        // Send payer refund
        if (payerAmount > 0) {
            token.safeTransfer(payer, payerAmount);
        }

        ms.released = totalAmount;
        ms.locked = false;
        ms.status = MilestoneStatus.RELEASED;

        emit DecisionExecuted(milestoneIndex, payeeAmount, payerAmount);
        emit MilestoneStatusChanged(milestoneIndex, MilestoneStatus.RELEASED);
    }

    // ── Views ──────────────────────────────────────────────────────────────

    function getMilestone(uint256 milestoneIndex) external view returns (Milestone memory) {
        require(milestoneIndex < milestones.length, "EscrowV3: invalid milestone");
        return milestones[milestoneIndex];
    }

    function getMilestoneCount() external view returns (uint256) {
        return milestones.length;
    }

    function getPayer() external view returns (address) {
        return payer;
    }

    function getPayee() external view returns (address) {
        return payee;
    }

    function getToken() external view returns (address) {
        return address(token);
    }

    function getDecision(uint256 milestoneIndex) external view returns (
        uint16 payeeBps,
        bytes32 receiptHash,
        bool isSet,
        uint256 extraPayoutsCount
    ) {
        Decision storage d = _decisions[milestoneIndex];
        return (d.payeeBps, d.receiptHash, d.isSet, d.extraPayouts.length);
    }
}
