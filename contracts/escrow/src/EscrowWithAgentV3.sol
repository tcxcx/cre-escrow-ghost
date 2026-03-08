// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/**
 * @title EscrowWithAgentV3
 * @notice Milestone-based escrow controlled by a CRE executor agent.
 *         Reads: milestones(), milestoneCount(), decision(), payer(), payee(), token(), totalAmount().
 *         Writes arrive via EscrowExtractor after CRE consensus.
 */
contract EscrowWithAgentV3 {
    // ── Enums ───────────────────────────────────────────────────
    enum Status {
        PENDING,     // 0
        FUNDED,      // 1
        IN_PROGRESS, // 2
        SUBMITTED,   // 3
        APPROVED,    // 4
        REJECTED,    // 5
        DISPUTED,    // 6
        LOCKED,      // 7
        RELEASED     // 8
    }

    // ── Structs ─────────────────────────────────────────────────
    struct Milestone {
        uint256 amount;
        Status status;
        string description;
    }

    struct Decision {
        uint256 payeeBps;
        bytes32 receiptHash;
        bool isSet;
        bool isExecuted;
    }

    // ── State ───────────────────────────────────────────────────
    address public payer;
    address public payee;
    address public token;
    uint256 public totalAmount;
    address public executorAgent;
    bytes32 public agreementHash;
    Decision public decision;
    bool public funded;

    Milestone[] internal _milestones;

    // ── Events ──────────────────────────────────────────────────
    event MilestoneStatusChanged(uint256 indexed milestoneIndex, uint8 newStatus);
    event DecisionSet(uint256 payeeBps, bytes32 receiptHash);
    event DecisionExecuted(uint256 payeeAmount, uint256 payerRefund);
    event Funded(address indexed funder, uint256 amount);

    // ── Modifiers ───────────────────────────────────────────────
    modifier onlyExecutor() {
        require(msg.sender == executorAgent, "EscrowV3: not executor");
        _;
    }

    // ── Constructor ─────────────────────────────────────────────
    constructor(
        address _payer,
        address _payee,
        address _token,
        uint256 _totalAmount,
        address _executorAgent,
        uint256[] memory _amounts,
        string[] memory _descriptions,
        bytes32 _agreementHash
    ) {
        require(_amounts.length == _descriptions.length, "EscrowV3: length mismatch");
        require(_amounts.length > 0, "EscrowV3: no milestones");

        payer = _payer;
        payee = _payee;
        token = _token;
        totalAmount = _totalAmount;
        executorAgent = _executorAgent;
        agreementHash = _agreementHash;

        for (uint256 i = 0; i < _amounts.length; i++) {
            _milestones.push(Milestone({
                amount: _amounts[i],
                status: Status.PENDING,
                description: _descriptions[i]
            }));
        }
    }

    // ── Views ───────────────────────────────────────────────────
    function milestoneCount() external view returns (uint256) {
        return _milestones.length;
    }

    function milestones(uint256 index)
        external
        view
        returns (uint256 amount, uint8 status, string memory description)
    {
        require(index < _milestones.length, "EscrowV3: index out of range");
        Milestone storage m = _milestones[index];
        return (m.amount, uint8(m.status), m.description);
    }

    // ── Funding ─────────────────────────────────────────────────
    function fund() external {
        require(!funded, "EscrowV3: already funded");
        funded = true;
        IERC20(token).transferFrom(msg.sender, address(this), totalAmount);
        emit Funded(msg.sender, totalAmount);
    }

    // ── Executor Actions ────────────────────────────────────────
    function setMilestoneStatus(uint256 milestoneIndex, uint8 newStatus) external onlyExecutor {
        require(milestoneIndex < _milestones.length, "EscrowV3: index out of range");
        require(newStatus <= uint8(Status.RELEASED), "EscrowV3: invalid status");
        _milestones[milestoneIndex].status = Status(newStatus);
        emit MilestoneStatusChanged(milestoneIndex, newStatus);
    }

    function lockMilestone(uint256 milestoneIndex) external onlyExecutor {
        require(milestoneIndex < _milestones.length, "EscrowV3: index out of range");
        _milestones[milestoneIndex].status = Status.LOCKED;
        emit MilestoneStatusChanged(milestoneIndex, uint8(Status.LOCKED));
    }

    function setDecision(
        uint256 milestoneIndex,
        uint256 payeeBps,
        bytes32 receiptHash
    ) external onlyExecutor {
        require(milestoneIndex < _milestones.length, "EscrowV3: index out of range");
        require(!decision.isSet, "EscrowV3: decision already set");
        require(payeeBps <= 10000, "EscrowV3: bps exceeds 10000");

        decision = Decision({
            payeeBps: payeeBps,
            receiptHash: receiptHash,
            isSet: true,
            isExecuted: false
        });

        emit DecisionSet(payeeBps, receiptHash);
    }

    function executeDecision(uint256 milestoneIndex) external onlyExecutor {
        require(milestoneIndex < _milestones.length, "EscrowV3: index out of range");
        require(decision.isSet, "EscrowV3: decision not set");
        require(!decision.isExecuted, "EscrowV3: decision already executed");

        decision.isExecuted = true;

        Milestone storage m = _milestones[milestoneIndex];
        uint256 payeeAmount = (m.amount * decision.payeeBps) / 10000;
        uint256 payerRefund = m.amount - payeeAmount;

        if (payeeAmount > 0) {
            IERC20(token).transfer(payee, payeeAmount);
        }
        if (payerRefund > 0) {
            IERC20(token).transfer(payer, payerRefund);
        }

        m.status = Status.RELEASED;
        emit MilestoneStatusChanged(milestoneIndex, uint8(Status.RELEASED));
        emit DecisionExecuted(payeeAmount, payerRefund);
    }
}
