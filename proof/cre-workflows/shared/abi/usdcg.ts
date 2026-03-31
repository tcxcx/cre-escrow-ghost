/** USDCg contract ABI — deposit, withdraw, totalSupply, balanceOf */
export const USDCG_ABI = [
  { type: "function", name: "deposit", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdraw", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "totalSupply", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "decimals", inputs: [], outputs: [{ name: "", type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "treasuryManager", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "event", name: "Deposit", inputs: [{ name: "account", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "Withdraw", inputs: [{ name: "account", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
] as const
