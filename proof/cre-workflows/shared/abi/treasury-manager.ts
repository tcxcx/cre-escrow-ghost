/** TreasuryManager ABI — yield operations + view functions */
export const TREASURY_MANAGER_ABI = [
  { type: "function", name: "allocateToYield", inputs: [{ name: "usdcAmount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "redeemFromYield", inputs: [{ name: "usycAmount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getYieldValueUSDC", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getBufferRatioBPS", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTotalBacking", inputs: [], outputs: [{ name: "usdcBuffer", type: "uint256" }, { name: "yieldValue", type: "uint256" }, { name: "total", type: "uint256" }], stateMutability: "view" },
  { type: "event", name: "AllocatedToYield", inputs: [{ name: "usdcAmount", type: "uint256", indexed: false }, { name: "usycReceived", type: "uint256", indexed: false }] },
  { type: "event", name: "RedeemedFromYield", inputs: [{ name: "usycAmount", type: "uint256", indexed: false }, { name: "usdcReceived", type: "uint256", indexed: false }] },
] as const
