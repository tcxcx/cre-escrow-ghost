/**
 * ACE Vault ABI fragments used by CRE workflows.
 * Events for monitoring deposits and withdrawals.
 */
export const VAULT_ABI = [
  {
    type: "event",
    name: "Deposit",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Withdraw",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const
