/**
 * EscrowWithAgentV3.sol ABI fragments for CRE workflows.
 *
 * Read functions called via callView().
 * Write operations go through CRE report() -> ACE PolicyEngine -> EscrowExtractor.
 * Events monitored via withLog() trigger.
 *
 * EscrowExtractor encoding:
 *   (uint8 actionType, uint256 milestoneIndex, address executorAgent, uint256 payeeBps, bytes32 receiptHash)
 *
 * Action types:
 *   0 = SET_STATUS
 *   1 = APPROVE_MILESTONE
 *   2 = LOCK_MILESTONE
 *   3 = SET_DECISION
 *   4 = EXECUTE_DECISION
 *   5 = SET_MILESTONE_STATUS
 */
export const ESCROW_V3_ABI = [
  // ── Reads ──────────────────────────────────────────────────
  {
    type: "function",
    name: "milestones",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "description", type: "string" },
    ],
  },
  {
    type: "function",
    name: "milestoneCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decision",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "payeeBps", type: "uint256" },
      { name: "receiptHash", type: "bytes32" },
      { name: "isSet", type: "bool" },
      { name: "isExecuted", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "payee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "payer",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "token",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "totalAmount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // ── Events ─────────────────────────────────────────────────
  {
    type: "event",
    name: "MilestoneStatusChanged",
    inputs: [
      { name: "milestoneIndex", type: "uint256", indexed: true },
      { name: "newStatus", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DecisionSet",
    inputs: [
      { name: "payeeBps", type: "uint256", indexed: false },
      { name: "receiptHash", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DecisionExecuted",
    inputs: [
      { name: "payeeAmount", type: "uint256", indexed: false },
      { name: "payerRefund", type: "uint256", indexed: false },
    ],
  },
] as const
