/**
 * EscrowWithAgentV3 ABI — Viem-compatible.
 * Source: contracts/escrow/src/EscrowWithAgentV3.sol (Foundry compiled)
 */
export const ESCROW_WITH_AGENT_V3_ABI = [
  // Reads
  { type: 'function', name: 'payer', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'payee', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'token', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'totalAmount', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'executorAgent', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'agreementHash', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bytes32' }] },
  { type: 'function', name: 'funded', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'milestoneCount', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  {
    type: 'function', name: 'milestones', stateMutability: 'view',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'description', type: 'string' },
    ],
  },
  {
    type: 'function', name: 'decision', stateMutability: 'view', inputs: [],
    outputs: [
      { name: 'payeeBps', type: 'uint256' },
      { name: 'receiptHash', type: 'bytes32' },
      { name: 'isSet', type: 'bool' },
      { name: 'isExecuted', type: 'bool' },
    ],
  },
  // Writes
  { type: 'function', name: 'fund', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  {
    type: 'function', name: 'setMilestoneStatus', stateMutability: 'nonpayable',
    inputs: [{ name: 'milestoneIndex', type: 'uint256' }, { name: 'newStatus', type: 'uint8' }],
    outputs: [],
  },
  {
    type: 'function', name: 'lockMilestone', stateMutability: 'nonpayable',
    inputs: [{ name: 'milestoneIndex', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function', name: 'setDecision', stateMutability: 'nonpayable',
    inputs: [
      { name: 'milestoneIndex', type: 'uint256' },
      { name: 'payeeBps', type: 'uint256' },
      { name: 'receiptHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function', name: 'executeDecision', stateMutability: 'nonpayable',
    inputs: [{ name: 'milestoneIndex', type: 'uint256' }],
    outputs: [],
  },
  // Events
  {
    type: 'event', name: 'MilestoneStatusChanged',
    inputs: [
      { name: 'milestoneIndex', type: 'uint256', indexed: true },
      { name: 'newStatus', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event', name: 'DecisionSet',
    inputs: [
      { name: 'payeeBps', type: 'uint256', indexed: false },
      { name: 'receiptHash', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event', name: 'DecisionExecuted',
    inputs: [
      { name: 'payeeAmount', type: 'uint256', indexed: false },
      { name: 'payerRefund', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event', name: 'Funded',
    inputs: [
      { name: 'funder', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const

/**
 * EscrowFactoryV3 ABI
 */
export const ESCROW_FACTORY_V3_ABI = [
  {
    type: 'function', name: 'createEscrow', stateMutability: 'nonpayable',
    inputs: [
      { name: 'agreementHash', type: 'bytes32' },
      { name: '_payer', type: 'address' },
      { name: '_payee', type: 'address' },
      { name: '_token', type: 'address' },
      { name: '_totalAmount', type: 'uint256' },
      { name: '_milestoneAmounts', type: 'uint256[]' },
      { name: '_milestoneDescriptions', type: 'string[]' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
  { type: 'function', name: 'escrowCount', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  {
    type: 'function', name: 'escrows', stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'event', name: 'EscrowCreated',
    inputs: [
      { name: 'escrowIndex', type: 'uint256', indexed: true },
      { name: 'escrowAddress', type: 'address', indexed: false },
      { name: 'agreementHash', type: 'bytes32', indexed: false },
    ],
  },
] as const
