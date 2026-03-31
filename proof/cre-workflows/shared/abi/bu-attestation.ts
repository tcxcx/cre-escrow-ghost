/**
 * BUAttestation.sol ABI fragments for CRE workflows.
 * Generated from contracts/src/BUAttestation.sol.
 *
 * CRE writes to this contract via writeReport() -> onReport(),
 * and reads via verifyAttestation() / attestationExists().
 */
export const BU_ATTESTATION_ABI = [
  {
    type: "function",
    name: "onReport",
    stateMutability: "nonpayable",
    inputs: [{ name: "report", type: "bytes" }],
    outputs: [],
  },
  {
    type: "function",
    name: "verifyAttestation",
    stateMutability: "view",
    inputs: [
      { name: "attestationId", type: "bytes32" },
      { name: "expectedDataHash", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "attestationExists",
    stateMutability: "view",
    inputs: [{ name: "attestationId", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "attestationCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "AttestationRecorded",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "operationType", type: "uint8", indexed: true },
      { name: "entityId", type: "string", indexed: false },
      { name: "dataHash", type: "bytes32", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const
